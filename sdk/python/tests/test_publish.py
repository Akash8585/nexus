import httpx
import pytest

from nexus_bus.consumer import NexusConsumer
from nexus_bus.exceptions import NexusConsumeError
from nexus_bus.producer import NexusProducer


NEXUS_URL = "http://localhost:8000"


def test_producer_publish_success():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json={"id": "msg-1", "topic": "nexus.research", "payload": {}},
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    producer = NexusProducer(client, NEXUS_URL, "scout-agent")
    result = producer.publish("nexus.research", {"count": 10}, "run_1")
    assert result["id"] == "msg-1"


def test_consumer_poll_once_delivers_new_messages():
    seen: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            json=[
                {"id": "msg-1", "payload": {"step": 1}},
                {"id": "msg-2", "payload": {"step": 2}},
            ],
        )

    client = httpx.Client(transport=httpx.MockTransport(handler))
    consumer = NexusConsumer(client, NEXUS_URL, "nexus.research")

    def callback(message):
        seen.append(message["id"])

    consumer.poll_once(callback)
    consumer.poll_once(callback)

    assert seen == ["msg-1", "msg-2"]


def test_consumer_raises_on_server_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, json={"detail": "error"})

    client = httpx.Client(transport=httpx.MockTransport(handler))
    consumer = NexusConsumer(client, NEXUS_URL, "nexus.research")

    with pytest.raises(NexusConsumeError):
        consumer._fetch_messages(limit=10)
