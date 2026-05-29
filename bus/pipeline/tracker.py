import json
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from redis import Redis


class PipelineTracker:
    STALE_EMPTY_MINUTES = 5
    STALE_MAX_MINUTES = 120

    def __init__(self, redis_client: Redis) -> None:
        self.redis = redis_client

    def start_run(self, correlation_id: str, trigger_input: str) -> dict[str, Any]:
        run = {
            "correlation_id": correlation_id,
            "trigger_input": trigger_input,
            "status": "running",
            "started_at": self._now(),
            "ended_at": None,
            "duration_ms": None,
            "message_count": 0,
            "messages": [],
            "agent_names": [],
        }
        self.redis.set(self._key(correlation_id), json.dumps(run))
        return run

    def end_run(self, correlation_id: str, status: str) -> dict[str, Any]:
        if status not in {"completed", "failed"}:
            raise ValueError("Pipeline status must be 'completed' or 'failed'")

        run = self.get_run(correlation_id)
        ended_at = datetime.now(timezone.utc)
        started_at = datetime.fromisoformat(run["started_at"])
        run["status"] = status
        run["ended_at"] = ended_at.isoformat()
        run["duration_ms"] = int((ended_at - started_at).total_seconds() * 1000)
        self._save(run)
        return run

    def add_message(self, correlation_id: str, message_id: str) -> dict[str, Any]:
        run = self.get_run(correlation_id)
        run["messages"].append(message_id)
        run["message_count"] = len(run["messages"])
        self._save(run)
        return run

    def add_agent(self, correlation_id: str, agent_name: str) -> dict[str, Any]:
        run = self.get_run(correlation_id)
        if agent_name not in run["agent_names"]:
            run["agent_names"].append(agent_name)
        self._save(run)
        return run

    def get_run(self, correlation_id: str) -> dict[str, Any]:
        raw_run = self.redis.get(self._key(correlation_id))
        if raw_run is None:
            raise HTTPException(
                status_code=404,
                detail=f"Pipeline run '{correlation_id}' not found",
            )
        return self.maybe_resolve_stale_run(json.loads(raw_run.decode("utf-8")))

    def find_run(self, correlation_id: str) -> dict[str, Any] | None:
        raw_run = self.redis.get(self._key(correlation_id))
        if raw_run is None:
            return None
        return self.maybe_resolve_stale_run(json.loads(raw_run.decode("utf-8")))

    def record_message(
        self,
        correlation_id: str,
        message_id: str,
        agent_name: str,
    ) -> None:
        run = self.find_run(correlation_id)
        if run is None:
            return
        run["messages"].append(message_id)
        run["message_count"] = len(run["messages"])
        if agent_name not in run["agent_names"]:
            run["agent_names"].append(agent_name)
        self._save(run)

    def list_runs(self, status: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
        runs: list[dict[str, Any]] = []

        for key in self.redis.scan_iter("pipeline:*"):
            raw_run = self.redis.get(key)
            if raw_run is None:
                continue
            run = json.loads(raw_run.decode("utf-8"))
            if status is not None and run["status"] != status:
                continue
            runs.append(run)

        runs.sort(key=lambda run: run["started_at"], reverse=True)
        return [self.maybe_resolve_stale_run(run) for run in runs[:limit]]

    def maybe_resolve_stale_run(self, run: dict[str, Any]) -> dict[str, Any]:
        if run.get("status") != "running":
            return run

        started_at = datetime.fromisoformat(run["started_at"])
        age_minutes = (datetime.now(timezone.utc) - started_at).total_seconds() / 60
        should_fail = False
        reason = ""

        if run.get("message_count", 0) == 0 and age_minutes >= self.STALE_EMPTY_MINUTES:
            should_fail = True
            reason = (
                "No agent activity detected. Dashboard rerun only registers a run — "
                "execute it with: python run.py \"<trigger>\""
            )
        elif age_minutes >= self.STALE_MAX_MINUTES:
            should_fail = True
            reason = "Pipeline timed out before completion"

        if not should_fail:
            return run

        ended_at = datetime.now(timezone.utc)
        run["status"] = "failed"
        run["ended_at"] = ended_at.isoformat()
        run["duration_ms"] = int((ended_at - started_at).total_seconds() * 1000)
        run["failure_reason"] = reason
        self._save(run)
        return run

    def rerun(self, correlation_id: str) -> dict[str, Any]:
        original_run = self.get_run(correlation_id)
        new_correlation_id = f"run_{uuid.uuid4().hex}"
        return self.start_run(new_correlation_id, original_run["trigger_input"])

    def _save(self, run: dict[str, Any]) -> None:
        self.redis.set(self._key(run["correlation_id"]), json.dumps(run))

    @staticmethod
    def _key(correlation_id: str) -> str:
        return f"pipeline:{correlation_id}"

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()
