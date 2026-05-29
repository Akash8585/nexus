from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from redis import Redis

from auth.jwt import get_current_user, require_admin
from kafka.default_topics import DEFAULT_TOPICS
from kafka.topics import TopicManager
from routers.messages import aggregate_topic_stats


router = APIRouter()


class TopicCreateRequest(BaseModel):
    name: str
    partitions: int = 1
    retention_days: int = 7


def get_topic_manager(request: Request) -> TopicManager:
    return request.app.state.topic_manager


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def _topic_metadata(
    manager: TopicManager,
    name: str,
    topic_stats: dict[str, dict[str, int]],
) -> dict:
    partition_count = 0

    try:
        details = manager.admin_client.describe_topics([name])
        if details:
            partition_count = len(details[0].get("partitions", []))
    except Exception:
        partition_count = 0

    stats = topic_stats.get(name, {"message_count": 0, "size_bytes": 0})

    return {
        "name": name,
        "partition_count": partition_count,
        "message_count": stats["message_count"],
        "size_bytes": stats["size_bytes"],
    }


@router.get("")
def list_topics(
    current_user: dict = Depends(get_current_user),
    manager: TopicManager = Depends(get_topic_manager),
    redis_client: Redis = Depends(get_redis),
) -> list[dict]:
    try:
        topic_names = manager.list_topics()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    topic_stats = aggregate_topic_stats(redis_client)
    return [_topic_metadata(manager, name, topic_stats) for name in topic_names]


@router.post("")
def create_topic(
    request_body: TopicCreateRequest,
    admin: dict = Depends(require_admin),
    manager: TopicManager = Depends(get_topic_manager),
    redis_client: Redis = Depends(get_redis),
) -> dict:
    if not request_body.name.startswith("nexus."):
        raise HTTPException(
            status_code=400,
            detail="Topic name must start with 'nexus.'",
        )

    if manager.topic_exists(request_body.name):
        raise HTTPException(
            status_code=409,
            detail=f"Topic '{request_body.name}' already exists",
        )

    manager.create_topic(request_body.name, partitions=request_body.partitions)
    topic_stats = aggregate_topic_stats(redis_client)
    metadata = _topic_metadata(manager, request_body.name, topic_stats)
    metadata["retention_days"] = request_body.retention_days
    return metadata


@router.delete("/{name}")
def delete_topic(
    name: str,
    admin: dict = Depends(require_admin),
    manager: TopicManager = Depends(get_topic_manager),
) -> dict[str, str]:
    if name in DEFAULT_TOPICS:
        raise HTTPException(
            status_code=403,
            detail=f"Default Nexus topic '{name}' cannot be deleted",
        )

    if not manager.topic_exists(name):
        raise HTTPException(status_code=404, detail=f"Topic '{name}' not found")

    manager.delete_topic(name)
    return {"message": f"Topic {name} deleted"}
