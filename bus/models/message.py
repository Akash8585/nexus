import uuid
from datetime import datetime, timezone
from typing import Any

from pydantic import BaseModel, Field


def _message_id() -> str:
    return f"msg_{uuid.uuid4().hex}"


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class NexusMessage(BaseModel):
    id: str = Field(default_factory=_message_id)
    correlation_id: str
    topic: str
    sender_agent: str
    payload: dict[str, Any]
    timestamp: datetime = Field(default_factory=_utc_now)
    retry_count: int = 0

    def to_json(self) -> str:
        return self.model_dump_json()

    @classmethod
    def from_json(cls, json_str: str) -> "NexusMessage":
        return cls.model_validate_json(json_str)
