import json
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from redis import Redis

try:
    from ..models.message import NexusMessage
    from ..registry.registry import agent_registry
    from .producer import NexusProducer
except ImportError:
    from models.message import NexusMessage
    from registry.registry import agent_registry
    from kafka.producer import NexusProducer


def count_agent_errors(redis_client: Redis, agent_name: str) -> int:
    count = 0
    for key in redis_client.scan_iter("dlq:*"):
        raw_record = redis_client.get(key)
        if raw_record is None:
            continue
        record = json.loads(raw_record.decode("utf-8"))
        sender = record.get("original_message", {}).get("sender_agent")
        if sender == agent_name:
            count += 1
    return count


def list_agent_errors(redis_client: Redis, agent_name: str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for key in redis_client.scan_iter("dlq:*"):
        raw_record = redis_client.get(key)
        if raw_record is None:
            continue
        record = json.loads(raw_record.decode("utf-8"))
        sender = record.get("original_message", {}).get("sender_agent")
        if sender == agent_name:
            records.append(record)
    records.sort(key=lambda record: record.get("failed_at", ""), reverse=True)
    return records


class DeadLetterQueue:
    def __init__(self, redis_client: Redis, producer: NexusProducer) -> None:
        self.redis = redis_client
        self.producer = producer

    def send(
        self,
        message: NexusMessage | dict[str, Any],
        error: str,
        retry_count: int,
    ) -> dict[str, Any]:
        message_payload = self._message_to_dict(message)
        message_payload["retry_count"] = retry_count
        message_id = message_payload["id"]
        record = {
            "id": message_id,
            "original_message": message_payload,
            "original_topic": message_payload["topic"],
            "error": error,
            "retry_count": retry_count,
            "failed_at": datetime.now(timezone.utc).isoformat(),
        }

        self.producer.publish("nexus.deadletter", record)
        self.redis.set(self._key(message_id), json.dumps(record))
        sender = message_payload.get("sender_agent")
        if sender:
            try:
                agent_registry.increment_errors(sender)
            except Exception:
                pass
        return record

    def list(self) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        for key in self.redis.scan_iter("dlq:*"):
            raw_record = self.redis.get(key)
            if raw_record is not None:
                records.append(json.loads(raw_record.decode("utf-8")))
        records.sort(key=lambda record: record["failed_at"], reverse=True)
        return records

    def retry(self, message_id: str) -> dict[str, Any]:
        record = self._get_record(message_id)
        original_message = record["original_message"]
        new_message = NexusMessage(
            correlation_id=original_message["correlation_id"],
            topic=original_message["topic"],
            sender_agent=original_message["sender_agent"],
            payload=original_message["payload"],
            retry_count=record["retry_count"],
        )
        self.producer.publish(new_message.topic, json.loads(new_message.to_json()))
        self.redis.delete(self._key(message_id))
        return {"message": "Dead letter message retried", "new_message_id": new_message.id}

    def discard(self, message_id: str) -> dict[str, str]:
        self._get_record(message_id)
        self.redis.delete(self._key(message_id))
        return {"message": f"Dead letter message {message_id} discarded"}

    def get(self, message_id: str) -> dict[str, Any]:
        return self._get_record(message_id)

    def _get_record(self, message_id: str) -> dict[str, Any]:
        raw_record = self.redis.get(self._key(message_id))
        if raw_record is None:
            raise HTTPException(
                status_code=404,
                detail=f"Dead letter message '{message_id}' not found",
            )
        return json.loads(raw_record.decode("utf-8"))

    @staticmethod
    def _message_to_dict(message: NexusMessage | dict[str, Any]) -> dict[str, Any]:
        if isinstance(message, NexusMessage):
            return json.loads(message.to_json())
        return dict(message)

    @staticmethod
    def _key(message_id: str) -> str:
        return f"dlq:{message_id}"
