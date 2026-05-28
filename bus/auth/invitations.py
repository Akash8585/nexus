import json
import secrets
from datetime import datetime, timezone
from typing import Any

from redis import Redis


INVITATION_TTL_SECONDS = 48 * 60 * 60


class InvitationStore:
    def __init__(self, redis_client: Redis) -> None:
        self.redis = redis_client

    def create(self, email: str, role: str, invited_by: str) -> str:
        token = secrets.token_urlsafe(32)
        invitation = {
            "email": email.lower(),
            "role": role,
            "invited_by": invited_by,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        self.redis.setex(
            f"invitations:{token}",
            INVITATION_TTL_SECONDS,
            json.dumps(invitation),
        )
        return token

    def verify(self, token: str) -> dict[str, Any] | None:
        raw_invitation = self.redis.get(f"invitations:{token}")
        if raw_invitation is None:
            return None
        return json.loads(raw_invitation.decode("utf-8"))

    def consume(self, token: str) -> None:
        self.redis.delete(f"invitations:{token}")
