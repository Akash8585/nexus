from datetime import datetime, timezone

from fastapi import HTTPException
from redis import Redis

from auth.jwt import hash_password
from models.user import User, UserRole


class UserStore:
    def __init__(self, redis_client: Redis) -> None:
        self.redis = redis_client

    def create(
        self,
        name: str,
        email: str,
        plain_password: str,
        role: str | UserRole,
    ) -> User:
        normalized_email = email.lower()
        if self.redis.exists(self._email_key(normalized_email)):
            raise HTTPException(status_code=409, detail="Email already exists")

        user = User(
            name=name,
            email=normalized_email,
            hashed_password=hash_password(plain_password),
            role=UserRole(role),
        )
        self.redis.set(self._user_key(user.id), user.model_dump_json())
        self.redis.set(self._email_key(normalized_email), user.id)
        return user

    def get_by_email(self, email: str) -> User | None:
        user_id = self.redis.get(self._email_key(email.lower()))
        if user_id is None:
            return None
        return self.get_by_id(user_id.decode("utf-8"))

    def get_by_id(self, user_id: str) -> User | None:
        raw_user = self.redis.get(self._user_key(user_id))
        if raw_user is None:
            return None
        return User.model_validate_json(raw_user.decode("utf-8"))

    def list_all(self) -> list[User]:
        users: list[User] = []
        for key in self.redis.scan_iter("users:user_*"):
            raw_user = self.redis.get(key)
            if raw_user is not None:
                users.append(User.model_validate_json(raw_user.decode("utf-8")))
        return users

    def update_role(self, user_id: str, role: str | UserRole) -> User | None:
        user = self.get_by_id(user_id)
        if user is None:
            return None
        user.role = UserRole(role)
        self._save(user)
        return user

    def update_last_login(self, user_id: str) -> User | None:
        user = self.get_by_id(user_id)
        if user is None:
            return None
        user.last_login = datetime.now(timezone.utc)
        self._save(user)
        return user

    def delete(self, user_id: str) -> None:
        user = self.get_by_id(user_id)
        if user is not None:
            self.redis.delete(self._email_key(user.email))
        self.redis.delete(self._user_key(user_id))

    def count(self) -> int:
        return sum(1 for _ in self.redis.scan_iter("users:user_*"))

    def _save(self, user: User) -> None:
        self.redis.set(self._user_key(user.id), user.model_dump_json())
        self.redis.set(self._email_key(user.email), user.id)

    @staticmethod
    def _user_key(user_id: str) -> str:
        return f"users:{user_id}"

    @staticmethod
    def _email_key(email: str) -> str:
        return f"users:email:{email}"
