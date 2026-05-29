import json
import os
from typing import Any

from redis import Redis
from redis.exceptions import RedisError


class ContextStore:
    def __init__(self, redis_url: str | None = None) -> None:
        self.redis_url = redis_url or os.getenv("REDIS_URL", "redis://localhost:6379")
        self.client: Redis | None = None

    def connect(self) -> None:
        try:
            self.client = Redis.from_url(self.redis_url)
            self.client.ping()
        except RedisError as exc:
            raise ConnectionError(f"Failed to connect to Redis at {self.redis_url}") from exc

    def set(
        self,
        correlation_id: str,
        key: str,
        value: Any,
        ttl_hours: int = 24,
    ) -> None:
        client = self._client()
        redis_key = self._key(correlation_id, key)
        ttl_seconds = ttl_hours * 60 * 60

        try:
            client.setex(redis_key, ttl_seconds, json.dumps(value))
        except (RedisError, TypeError) as exc:
            raise RuntimeError(f"Failed to write context key '{redis_key}'") from exc

    def get(self, correlation_id: str, key: str) -> Any:
        client = self._client()
        redis_key = self._key(correlation_id, key)

        try:
            raw_value = client.get(redis_key)
            if raw_value is None:
                return None
            return json.loads(raw_value.decode("utf-8"))
        except (RedisError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Failed to read context key '{redis_key}'") from exc

    def get_all(self, correlation_id: str) -> dict[str, Any]:
        client = self._client()
        prefix = self._key(correlation_id, "")
        result: dict[str, Any] = {}

        try:
            for redis_key in client.scan_iter(f"{prefix}*"):
                redis_key_text = redis_key.decode("utf-8")
                context_key = redis_key_text.removeprefix(prefix)
                raw_value = client.get(redis_key)
                if raw_value is not None:
                    result[context_key] = json.loads(raw_value.decode("utf-8"))
            return result
        except (RedisError, json.JSONDecodeError) as exc:
            raise RuntimeError(f"Failed to read context for '{correlation_id}'") from exc

    def delete(self, correlation_id: str) -> None:
        client = self._client()
        prefix = self._key(correlation_id, "")

        try:
            keys = list(client.scan_iter(f"{prefix}*"))
            if keys:
                client.delete(*keys)
        except RedisError as exc:
            raise RuntimeError(f"Failed to delete context for '{correlation_id}'") from exc

    def flush_all(self) -> int:
        client = self._client()

        try:
            keys = list(client.scan_iter("context/*"))
            if not keys:
                return 0
            return int(client.delete(*keys))
        except RedisError as exc:
            raise RuntimeError("Failed to flush context store") from exc

    def disconnect(self) -> None:
        if self.client is not None:
            self.client.close()
            self.client = None

    def _client(self) -> Redis:
        if self.client is None:
            raise RuntimeError("ContextStore is not connected")
        return self.client

    @staticmethod
    def _key(correlation_id: str, key: str) -> str:
        return f"context/{correlation_id}/{key}"
