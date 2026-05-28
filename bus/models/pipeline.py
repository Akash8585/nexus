from datetime import datetime, timezone
from enum import Enum

from pydantic import BaseModel, Field


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


class PipelineStatus(str, Enum):
    running = "running"
    completed = "completed"
    failed = "failed"


class PipelineRun(BaseModel):
    correlation_id: str
    trigger_input: str
    status: PipelineStatus = PipelineStatus.running
    started_at: datetime = Field(default_factory=_utc_now)
    ended_at: datetime | None = None
    duration_ms: int | None = None
    message_count: int = 0
    agent_names: list[str] = Field(default_factory=list)
