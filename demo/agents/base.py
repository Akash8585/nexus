from typing import Any

import httpx


class BaseAgent:
    def __init__(
        self,
        name: str,
        agent_type: str,
        subscribe_topic: str,
        nexus_url: str,
        api_key: str,
    ) -> None:
        self.name = name
        self.agent_type = agent_type
        self.subscribe_topic = subscribe_topic
        self.nexus_url = nexus_url.rstrip("/")
        self.api_key = api_key
        self.client = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0,
        )

    def register(self) -> dict[str, Any]:
        response = self.client.post(
            f"{self.nexus_url}/api/v1/agents/register",
            json={
                "name": self.name,
                "agent_type": self.agent_type,
                "subscribe_topics": [self.subscribe_topic],
            },
        )
        response.raise_for_status()
        agent = response.json()
        print(f"✓ {self.name} registered with Nexus")
        return agent

    def send_heartbeat(self) -> dict[str, Any]:
        response = self.client.post(
            f"{self.nexus_url}/api/v1/agents/{self.name}/heartbeat",
        )
        response.raise_for_status()
        return response.json()

    def publish(
        self,
        topic: str,
        correlation_id: str,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        response = self.client.post(
            f"{self.nexus_url}/api/v1/messages/publish",
            json={
                "topic": topic,
                "correlation_id": correlation_id,
                "sender_agent": self.name,
                "payload": payload,
            },
        )
        response.raise_for_status()
        return response.json()

    def write_context(
        self,
        correlation_id: str,
        key: str,
        value: dict[str, Any],
    ) -> dict[str, Any]:
        response = self.client.put(
            f"{self.nexus_url}/api/v1/context/{correlation_id}/{key}",
            json={"value": value},
        )
        response.raise_for_status()
        return response.json()

    def read_context(self, correlation_id: str, key: str) -> dict[str, Any] | None:
        response = self.client.get(
            f"{self.nexus_url}/api/v1/context/{correlation_id}/{key}",
        )
        response.raise_for_status()
        return response.json()

    def get_messages(self, topic: str, limit: int = 10) -> list[dict[str, Any]]:
        response = self.client.get(
            f"{self.nexus_url}/api/v1/messages",
            params={"topic": topic, "limit": limit},
        )
        response.raise_for_status()
        return response.json()

    def handle_message(self, message: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError
