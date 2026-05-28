from typing import Any

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel

from auth.api_keys import validate_api_key
from auth.jwt import get_current_user, require_admin
from pipeline.tracker import PipelineTracker
from websocket.live import PIPELINE_STARTED, manager


router = APIRouter()


class PipelineStartRequest(BaseModel):
    correlation_id: str
    trigger_input: str


def get_pipeline_tracker(request: Request) -> PipelineTracker:
    return request.app.state.pipeline_tracker


@router.post("/start")
async def start_pipeline(
    request_body: PipelineStartRequest,
    api_key: dict = Depends(validate_api_key),
    tracker: PipelineTracker = Depends(get_pipeline_tracker),
) -> dict[str, Any]:
    run = tracker.start_run(request_body.correlation_id, request_body.trigger_input)
    await manager.broadcast(
        PIPELINE_STARTED,
        {
            "correlation_id": request_body.correlation_id,
            "trigger_input": request_body.trigger_input,
        },
    )
    return run


@router.get("")
def list_pipelines(
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1),
    current_user: dict = Depends(get_current_user),
    tracker: PipelineTracker = Depends(get_pipeline_tracker),
) -> list[dict[str, Any]]:
    return tracker.list_runs(status=status, limit=limit)


@router.get("/{correlation_id}")
def get_pipeline(
    correlation_id: str,
    current_user: dict = Depends(get_current_user),
    tracker: PipelineTracker = Depends(get_pipeline_tracker),
) -> dict[str, Any]:
    return tracker.get_run(correlation_id)


@router.post("/{correlation_id}/rerun")
def rerun_pipeline(
    correlation_id: str,
    admin: dict = Depends(require_admin),
    tracker: PipelineTracker = Depends(get_pipeline_tracker),
) -> dict[str, str]:
    run = tracker.rerun(correlation_id)
    return {"correlation_id": run["correlation_id"]}
