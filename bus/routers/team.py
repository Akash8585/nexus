import json

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from auth.invitations import InvitationStore
from auth.jwt import require_admin
from auth.user_store import UserStore
from models.user import User, UserRole


router = APIRouter()


class InviteRequest(BaseModel):
    email: str
    role: UserRole


class RoleUpdateRequest(BaseModel):
    role: UserRole


class ResendInviteRequest(BaseModel):
    email: str


def get_user_store(request: Request) -> UserStore:
    return request.app.state.user_store


def get_invitation_store(request: Request) -> InvitationStore:
    return request.app.state.invitation_store


def _public_user(user: User | dict) -> dict:
    data = user.model_dump(mode="json") if isinstance(user, User) else dict(user)
    data.pop("hashed_password", None)
    return data


@router.get("")
def list_team(
    admin: dict = Depends(require_admin),
    user_store: UserStore = Depends(get_user_store),
) -> list[dict]:
    return [_public_user(user) for user in user_store.list_all()]


@router.post("/invite")
def invite_member(
    request_body: InviteRequest,
    admin: dict = Depends(require_admin),
    user_store: UserStore = Depends(get_user_store),
    invitation_store: InvitationStore = Depends(get_invitation_store),
) -> dict[str, str]:
    email = request_body.email.lower()
    if user_store.get_by_email(email) is not None:
        raise HTTPException(status_code=409, detail="User already exists")

    token = invitation_store.create(email, request_body.role.value, admin["id"])
    print(f"Invite link: /signup?token={token}")
    return {
        "message": "Invitation sent",
        "email": email,
        "role": request_body.role.value,
    }


@router.patch("/{user_id}/role")
def update_member_role(
    user_id: str,
    request_body: RoleUpdateRequest,
    admin: dict = Depends(require_admin),
    user_store: UserStore = Depends(get_user_store),
) -> dict:
    if user_id == admin["id"]:
        raise HTTPException(status_code=403, detail="You cannot change your own role")

    user = user_store.update_role(user_id, request_body.role)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return _public_user(user)


@router.delete("/{user_id}")
def remove_member(
    user_id: str,
    admin: dict = Depends(require_admin),
    user_store: UserStore = Depends(get_user_store),
) -> dict[str, str]:
    if user_id == admin["id"]:
        raise HTTPException(status_code=403, detail="You cannot remove yourself")

    if user_store.get_by_id(user_id) is None:
        raise HTTPException(status_code=404, detail="User not found")

    user_store.delete(user_id)
    return {"message": "Member removed"}


@router.post("/resend-invite")
def resend_invite(
    request_body: ResendInviteRequest,
    request: Request,
    admin: dict = Depends(require_admin),
    user_store: UserStore = Depends(get_user_store),
    invitation_store: InvitationStore = Depends(get_invitation_store),
) -> dict[str, str]:
    email = request_body.email.lower()
    if user_store.get_by_email(email) is not None:
        raise HTTPException(status_code=409, detail="User already exists")

    for key in request.app.state.redis.scan_iter("invitations:*"):
        raw_invitation = request.app.state.redis.get(key)
        if raw_invitation is None:
            continue
        invitation = json.loads(raw_invitation.decode("utf-8"))
        if invitation.get("email") == email:
            request.app.state.redis.delete(key)

    token = invitation_store.create(email, UserRole.viewer.value, admin["id"])
    print(f"Invite link: /signup?token={token}")
    return {"message": "Invitation resent"}
