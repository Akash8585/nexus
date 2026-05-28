import uuid
from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


def _user_id() -> str:
    return f"user_{uuid.uuid4().hex}"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    admin = "admin"
    viewer = "viewer"


class UserStatus(str, Enum):
    active = "active"
    invited = "invited"


class User(BaseModel):
    id: str = Field(default_factory=_user_id)
    name: str
    email: str
    hashed_password: str
    role: UserRole
    status: UserStatus = UserStatus.active
    created_at: datetime = Field(default_factory=_utc_now)
    last_login: datetime | None = None
