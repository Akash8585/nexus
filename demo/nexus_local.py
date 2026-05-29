import threading
import time
import sys
from collections.abc import Callable
from typing import Any

import httpx

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


class NexusAgent:
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
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        self.running = False
        self.last_message_id: str | None = None
        self.seen_ids: set[str] = set()

    def register(self) -> None:
        response = self.client.post(
            f"{self.nexus_url}/api/v1/agents/register",
            json={
                "name": self.name,
                "agent_type": self.agent_type,
                "subscribe_topics": [self.subscribe_topic],
            },
        )
        if response.status_code == 409:
            print(f"✓ {self.name} registered")
            return
        response.raise_for_status()
        print(f"✓ {self.name} registered")

    def heartbeat_loop(self) -> None:
        while self.running:
            try:
                self.client.post(f"{self.nexus_url}/api/v1/agents/{self.name}/heartbeat")
            except httpx.HTTPError:
                pass
            time.sleep(10)

    def publish(
        self,
        topic: str,
        payload: dict[str, Any],
        correlation_id: str,
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

    def context_write(
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

    def context_read(self, correlation_id: str, key: str) -> dict[str, Any] | None:
        response = self.client.get(
            f"{self.nexus_url}/api/v1/context/{correlation_id}/{key}",
        )
        if response.status_code == 404:
            return None
        response.raise_for_status()
        data = response.json()
        if isinstance(data, dict) and "value" in data:
            return data["value"]
        return data

    def consume(self, callback: Callable[[dict[str, Any]], None]) -> None:
        while self.running:
            try:
                response = self.client.get(
                    f"{self.nexus_url}/api/v1/messages",
                    params={"topic": self.subscribe_topic, "limit": 10},
                )
                response.raise_for_status()
                for message in response.json():
                    message_id = message.get("id")
                    if message_id is None or message_id in self.seen_ids:
                        continue
                    callback(message)
                    self.seen_ids.add(message_id)
                    self.last_message_id = message_id
            except httpx.HTTPError:
                pass
            time.sleep(3)

    def deregister(self) -> None:
        self.running = False
        try:
            response = self.client.delete(
                f"{self.nexus_url}/api/v1/agents/{self.name}",
            )
            if response.status_code not in {200, 401, 403, 404}:
                response.raise_for_status()
        finally:
            print(f"✓ {self.name} deregistered")

    def start(
        self,
        callback: Callable[[dict[str, Any]], None] | None = None,
        skip_existing: bool = False,
    ) -> "NexusAgent":
        self.running = True
        self.register()
        threading.Thread(target=self.heartbeat_loop, daemon=True).start()
        if callback is not None:
            if skip_existing:
                self._mark_existing_messages_seen()
            threading.Thread(target=self.consume, args=(callback,), daemon=True).start()
        return self

    def _mark_existing_messages_seen(self) -> None:
        try:
            response = self.client.get(
                f"{self.nexus_url}/api/v1/messages",
                params={"topic": self.subscribe_topic, "limit": 100},
            )
            response.raise_for_status()
            for message in response.json():
                message_id = message.get("id")
                if message_id is not None:
                    self.seen_ids.add(message_id)
        except httpx.HTTPError:
            pass
