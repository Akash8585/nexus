import signal
import threading
import time
from collections.abc import Callable
from types import FrameType
from typing import Any

import httpx

from nexus_bus.consumer import NexusConsumer
from nexus_bus.context import ContextClient
from nexus_bus.exceptions import NexusAuthError, NexusConnectionError
from nexus_bus.producer import NexusProducer


class NexusAgent:
    """Connect an agent to the Nexus multi-agent coordination bus."""

    def __init__(
        self,
        name: str,
        agent_type: str,
        subscribe_topic: str,
        nexus_url: str,
        api_key: str,
        *,
        heartbeat_interval: float = 10.0,
        poll_interval: float = 3.0,
    ) -> None:
        self.name = name
        self.agent_type = agent_type
        self.subscribe_topic = subscribe_topic
        self.nexus_url = nexus_url.rstrip("/")
        self.api_key = api_key
        self._heartbeat_interval = heartbeat_interval
        self._poll_interval = poll_interval

        self._client = httpx.Client(
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )
        self._producer = NexusProducer(self._client, self.nexus_url, self.name)
        self._consumer = NexusConsumer(
            self._client,
            self.nexus_url,
            self.subscribe_topic,
            poll_interval=poll_interval,
        )
        self.context = ContextClient(self._client, self.nexus_url)

        self._running = False
        self._message_handler: Callable[[dict[str, Any]], None] | None = None
        self._heartbeat_thread: threading.Thread | None = None
        self._consume_thread: threading.Thread | None = None
        self._previous_signal_handlers: dict[int, Any] = {}

    def register(self) -> None:
        try:
            response = self._client.post(
                f"{self.nexus_url}/api/v1/agents/register",
                json={
                    "name": self.name,
                    "agent_type": self.agent_type,
                    "subscribe_topics": [self.subscribe_topic],
                },
            )
        except httpx.HTTPError as exc:
            raise NexusConnectionError(
                f"Failed to connect to Nexus at {self.nexus_url}"
            ) from exc

        if response.status_code == 401:
            raise NexusAuthError("Invalid API key")
        if response.status_code == 409:
            return
        if not response.is_success:
            raise NexusConnectionError(
                f"Agent registration failed with status {response.status_code}"
            )

    def deregister(self) -> None:
        try:
            response = self._client.delete(
                f"{self.nexus_url}/api/v1/agents/{self.name}",
            )
            if response.status_code not in {200, 401, 403, 404}:
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise NexusConnectionError(
                f"Failed to deregister agent '{self.name}'"
            ) from exc

    def publish(
        self,
        topic: str,
        payload: dict[str, Any],
        correlation_id: str,
    ) -> dict[str, Any]:
        return self._producer.publish(topic, payload, correlation_id)

    def on_message(
        self,
        callback: Callable[[dict[str, Any]], None] | None = None,
    ) -> Callable[[dict[str, Any]], None]:
        if callback is not None:
            self._message_handler = callback
            return callback

        def decorator(handler: Callable[[dict[str, Any]], None]) -> Callable[[dict[str, Any]], None]:
            self._message_handler = handler
            return handler

        return decorator

    def start(self, *, skip_existing: bool = False) -> "NexusAgent":
        if self._running:
            return self

        self._running = True
        self.register()
        self._install_signal_handlers()

        self._heartbeat_thread = threading.Thread(
            target=self._heartbeat_loop,
            name=f"nexus-heartbeat-{self.name}",
            daemon=True,
        )
        self._heartbeat_thread.start()

        if self._message_handler is not None:
            if skip_existing:
                self._consumer.mark_existing_seen()
            self._consume_thread = threading.Thread(
                target=self._consumer.run,
                args=(self._message_handler,),
                name=f"nexus-consume-{self.name}",
                daemon=True,
            )
            self._consume_thread.start()

        return self

    def stop(self) -> None:
        self._running = False
        self._consumer.stop()
        self._restore_signal_handlers()

        if self._consume_thread is not None and self._consume_thread.is_alive():
            self._consume_thread.join(timeout=self._poll_interval + 1)
        if self._heartbeat_thread is not None and self._heartbeat_thread.is_alive():
            self._heartbeat_thread.join(timeout=self._heartbeat_interval + 1)

        self._consume_thread = None
        self._heartbeat_thread = None

        try:
            self.deregister()
        except NexusConnectionError:
            pass

    def close(self) -> None:
        self.stop()
        self._client.close()

    def __enter__(self) -> "NexusAgent":
        return self

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        tb: object | None,
    ) -> None:
        self.close()

    def _heartbeat_loop(self) -> None:
        while self._running:
            try:
                self._client.post(f"{self.nexus_url}/api/v1/agents/{self.name}/heartbeat")
            except httpx.HTTPError:
                pass
            time.sleep(self._heartbeat_interval)

    def _handle_shutdown_signal(self, signum: int, frame: FrameType | None) -> None:
        self.stop()
        previous = self._previous_signal_handlers.get(signum)
        if callable(previous) and previous not in (signal.SIG_DFL, signal.SIG_IGN):
            previous(signum, frame)

    def _install_signal_handlers(self) -> None:
        for signum in (signal.SIGINT, signal.SIGTERM):
            try:
                self._previous_signal_handlers[signum] = signal.getsignal(signum)
                signal.signal(signum, self._handle_shutdown_signal)
            except (AttributeError, ValueError, OSError):
                continue

    def _restore_signal_handlers(self) -> None:
        for signum, handler in self._previous_signal_handlers.items():
            try:
                signal.signal(signum, handler)
            except (AttributeError, ValueError, OSError):
                continue
        self._previous_signal_handlers.clear()
