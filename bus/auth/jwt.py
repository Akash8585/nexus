import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import Depends, Header, HTTPException
from jose import ExpiredSignatureError, JWTError, jwt
from passlib.context import CryptContext
from redis import Redis

try:
    from bus import config
except ImportError:
    import config


logging.getLogger("passlib.handlers.bcrypt").setLevel(logging.ERROR)

password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
JWT_SECRET = getattr(config, "JWT_SECRET", os.getenv("JWT_SECRET", "changeme"))
JWT_ALGORITHM = getattr(config, "JWT_ALGORITHM", os.getenv("JWT_ALGORITHM", "HS256"))
JWT_EXPIRY_HOURS = int(
    getattr(config, "JWT_EXPIRY_HOURS", os.getenv("JWT_EXPIRY_HOURS", "24"))
)
REDIS_URL = getattr(config, "REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379"))


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return password_context.verify(plain, hashed)


def create_access_token(
    data: dict[str, Any],
    expires_delta: timedelta | None = None,
) -> str:
    expires_at = datetime.now(timezone.utc) + (
        expires_delta or timedelta(hours=JWT_EXPIRY_HOURS)
    )
    payload = {
        "sub": data["sub"],
        "email": data["email"],
        "role": data["role"],
        "exp": expires_at,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token has expired") from exc
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc


def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = _extract_bearer_token(authorization)
    redis_client = Redis.from_url(REDIS_URL)

    try:
        if redis_client.exists(f"blacklist:{token}"):
            raise HTTPException(status_code=401, detail="Token has been revoked")

        payload = decode_access_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Token missing subject")

        raw_user = redis_client.get(f"users:{user_id}")
        if raw_user is None:
            raise HTTPException(status_code=401, detail="User not found")

        return json.loads(raw_user.decode("utf-8"))
    finally:
        redis_client.close()


def require_admin(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    role = user.get("role")
    if role != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return user


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    return token
