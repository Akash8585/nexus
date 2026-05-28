from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from jose import jwt
from pydantic import BaseModel

from auth.jwt import (
    JWT_ALGORITHM,
    JWT_SECRET,
    create_access_token,
    get_current_user,
    verify_password,
)
from auth.invitations import InvitationStore
from auth.user_store import UserStore
from models.user import User


router = APIRouter()


class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def get_user_store(request: Request) -> UserStore:
    return request.app.state.user_store


def get_invitation_store(request: Request) -> InvitationStore:
    return request.app.state.invitation_store


def _public_user(user: User | dict) -> dict:
    if isinstance(user, User):
        data = user.model_dump(mode="json")
    else:
        data = dict(user)
    data.pop("hashed_password", None)
    return data


@router.post("/signup")
def signup(
    request_body: SignupRequest,
    request: Request,
    user_store: UserStore = Depends(get_user_store),
    invitation_store: InvitationStore = Depends(get_invitation_store),
) -> dict:
    invitation_token = request.query_params.get("token")
    invitation = None
    if invitation_token:
        invitation = invitation_store.verify(invitation_token)
        if invitation is None:
            raise HTTPException(status_code=400, detail="Invalid or expired invitation")

    if user_store.count() > 0 and invitation is None:
        raise HTTPException(
            status_code=403,
            detail="Nexus already has an admin. Ask your admin to invite you.",
        )

    role = invitation["role"] if invitation is not None else "admin"
    user = user_store.create(
        request_body.name,
        request_body.email,
        request_body.password,
        role,
    )
    if invitation_token:
        invitation_store.consume(invitation_token)

    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role.value}
    )
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@router.post("/login")
def login(
    request_body: LoginRequest,
    request: Request,
    user_store: UserStore = Depends(get_user_store),
) -> dict:
    email = request_body.email.lower()
    attempts_key = f"login:attempts:{email}"
    attempts = int(request.app.state.redis.get(attempts_key) or 0)

    if attempts >= 5:
        request.app.state.redis.expire(attempts_key, 15 * 60)
        raise HTTPException(
            status_code=429,
            detail="Too many failed attempts. Try again in 15 minutes.",
        )

    user = user_store.get_by_email(email)
    if user is None or not verify_password(request_body.password, user.hashed_password):
        attempts = request.app.state.redis.incr(attempts_key)
        request.app.state.redis.expire(attempts_key, 15 * 60)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    request.app.state.redis.delete(attempts_key)
    user_store.update_last_login(user.id)
    user = user_store.get_by_id(user.id) or user
    token = create_access_token(
        {"sub": user.id, "email": user.email, "role": user.role.value}
    )
    return {"access_token": token, "token_type": "bearer", "user": _public_user(user)}


@router.post("/logout")
def logout(
    request: Request,
    authorization: str | None = Header(default=None),
    current_user: dict = Depends(get_current_user),
) -> dict[str, str]:
    token = _extract_bearer_token(authorization)
    payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    expires_at = int(payload["exp"])
    now = int(datetime.now(timezone.utc).timestamp())
    ttl = max(expires_at - now, 1)
    request.app.state.redis.setex(f"blacklist:{token}", ttl, current_user["id"])
    return {"message": "Logged out successfully"}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)) -> dict:
    return _public_user(current_user)


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    return token
