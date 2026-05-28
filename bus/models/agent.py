from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AgentStatus(str, Enum):
    active = "active"
    idle = "idle"
    dead = "dead"
    deregistered = "deregistered"


class Agent(BaseModel):
    name: str
    agent_type: str
    subscribe_topics: list[str] = Field(default_factory=list)
    status: AgentStatus = AgentStatus.idle
    registered_at: datetime = Field(default_factory=_utc_now)
    last_heartbeat: datetime = Field(default_factory=_utc_now)
    messages_processed: int = 0
    error_count: int = 0
