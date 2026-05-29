from typing import Any

import httpx

from nexus_bus.exceptions import NexusAuthError, NexusConnectionError, NexusPublishError


class NexusProducer:
    """Publishes messages to the Nexus bus API."""

    def __init__(self, client: httpx.Client, nexus_url: str, agent_name: str) -> None:
        self._client = client
        self._publish_url = f"{nexus_url.rstrip('/')}/api/v1/messages/publish"
        self._agent_name = agent_name

    def publish(
        self,
        topic: str,
        payload: dict[str, Any],
        correlation_id: str,
    ) -> dict[str, Any]:
        try:
            response = self._client.post(
                self._publish_url,
                json={
                    "topic": topic,
                    "correlation_id": correlation_id,
                    "sender_agent": self._agent_name,
                    "payload": payload,
                },
            )
        except httpx.HTTPError as exc:
            raise NexusConnectionError(f"Failed to publish to topic '{topic}'") from exc

        if response.status_code == 401:
            raise NexusAuthError("Invalid API key for message publish")
        if not response.is_success:
            raise NexusPublishError(
                f"Publish to '{topic}' failed with status {response.status_code}: "
                f"{response.text}"
            )

        return response.json()
