import json
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from pydantic import BaseModel
from redis import Redis

from auth.api_keys import API_KEY_PREFIX, validate_api_key
from auth.jwt import get_current_user
from kafka.producer import NexusProducer
from kafka.topics import TopicManager
from models.message import NexusMessage
from registry.registry import agent_registry
from websocket.live import MESSAGE_PUBLISHED, manager


router = APIRouter()
MESSAGE_TTL_SECONDS = 7 * 24 * 60 * 60


class MessagePublishRequest(BaseModel):
    correlation_id: str
    topic: str
    sender_agent: str
    payload: dict[str, Any]


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def get_producer(request: Request) -> NexusProducer:
    return request.app.state.producer


def get_topic_manager(request: Request) -> TopicManager:
    return request.app.state.topic_manager


def validate_api_key_or_jwt(authorization: str | None = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    if token.startswith(API_KEY_PREFIX):
        return validate_api_key(authorization)
    return get_current_user(authorization)


@router.post("/publish", response_model=NexusMessage)
async def publish_message(
    request_body: MessagePublishRequest,
    auth: dict = Depends(validate_api_key_or_jwt),
    redis_client: Redis = Depends(get_redis),
    producer: NexusProducer = Depends(get_producer),
    topic_manager: TopicManager = Depends(get_topic_manager),
) -> NexusMessage:
    if not topic_manager.topic_exists(request_body.topic):
        raise HTTPException(
            status_code=400,
            detail=f"Topic '{request_body.topic}' does not exist",
        )

    agent_registry.get(request_body.sender_agent)

    message = NexusMessage(
        correlation_id=request_body.correlation_id,
        topic=request_body.topic,
        sender_agent=request_body.sender_agent,
        payload=request_body.payload,
    )

    producer.publish(request_body.topic, json.loads(message.to_json()))
    redis_client.setex(f"messages:{message.id}", MESSAGE_TTL_SECONDS, message.to_json())
    await manager.broadcast(MESSAGE_PUBLISHED, message.model_dump(mode="json"))

    return message


@router.get("", response_model=list[NexusMessage])
def list_messages(
    topic: str | None = Query(default=None),
    agent: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1),
    auth: dict = Depends(validate_api_key_or_jwt),
    redis_client: Redis = Depends(get_redis),
) -> list[NexusMessage]:
    messages: list[NexusMessage] = []

    for key in redis_client.scan_iter("messages:*"):
        raw_message = redis_client.get(key)
        if raw_message is None:
            continue

        message = NexusMessage.from_json(raw_message.decode("utf-8"))
        if topic is not None and message.topic != topic:
            continue
        if agent is not None and message.sender_agent != agent:
            continue

        messages.append(message)

    messages.sort(key=lambda item: item.timestamp, reverse=True)
    return messages[:limit]


@router.get("/{message_id}", response_model=NexusMessage)
def get_message(
    message_id: str,
    auth: dict = Depends(validate_api_key_or_jwt),
    redis_client: Redis = Depends(get_redis),
) -> NexusMessage:
    raw_message = redis_client.get(f"messages:{message_id}")
    if raw_message is None:
        raise HTTPException(status_code=404, detail=f"Message '{message_id}' not found")

    return NexusMessage.from_json(raw_message.decode("utf-8"))
