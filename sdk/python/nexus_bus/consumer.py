import time
from collections.abc import Callable
from typing import Any

import httpx

from nexus_bus.exceptions import NexusAuthError, NexusConnectionError, NexusConsumeError


class NexusConsumer:
    """Polls the Nexus bus API for new messages on a subscribed topic."""

    def __init__(
        self,
        client: httpx.Client,
        nexus_url: str,
        subscribe_topic: str,
        poll_interval: float = 3.0,
    ) -> None:
        self._client = client
        self._messages_url = f"{nexus_url.rstrip('/')}/api/v1/messages"
        self._subscribe_topic = subscribe_topic
        self._poll_interval = poll_interval
        self._running = False
        self._seen_ids: set[str] = set()

    @property
    def running(self) -> bool:
        return self._running

    def mark_existing_seen(self, limit: int = 100) -> None:
        try:
            messages = self._fetch_messages(limit=limit)
        except (NexusAuthError, NexusConnectionError, NexusConsumeError):
            return

        for message in messages:
            message_id = message.get("id")
            if message_id is not None:
                self._seen_ids.add(message_id)

    def poll_once(self, callback: Callable[[dict[str, Any]], None]) -> None:
        messages = self._fetch_messages(limit=10)
        for message in messages:
            message_id = message.get("id")
            if message_id is None or message_id in self._seen_ids:
                continue
            callback(message)
            self._seen_ids.add(message_id)

    def run(self, callback: Callable[[dict[str, Any]], None]) -> None:
        self._running = True
        while self._running:
            try:
                self.poll_once(callback)
            except NexusConsumeError:
                pass
            time.sleep(self._poll_interval)

    def stop(self) -> None:
        self._running = False

    def _fetch_messages(self, limit: int) -> list[dict[str, Any]]:
        try:
            response = self._client.get(
                self._messages_url,
                params={"topic": self._subscribe_topic, "limit": limit},
            )
        except httpx.HTTPError as exc:
            raise NexusConnectionError(
                f"Failed to fetch messages for topic '{self._subscribe_topic}'"
            ) from exc

        if response.status_code == 401:
            raise NexusAuthError("Invalid API key for message consumption")
        if not response.is_success:
            raise NexusConsumeError(
                f"Message fetch failed with status {response.status_code}"
            )

        data = response.json()
        return data if isinstance(data, list) else []
