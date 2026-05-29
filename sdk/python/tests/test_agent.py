import json
from unittest.mock import patch

import httpx
import pytest

from nexus_bus.agent import NexusAgent
from nexus_bus.consumer import NexusConsumer
from nexus_bus.context import ContextClient
from nexus_bus.exceptions import NexusAuthError, NexusPublishError
from nexus_bus.producer import NexusProducer


NEXUS_URL = "http://localhost:8000"
API_KEY = "nxs_live_sk_testkey1234567890abcdefghij"


def _make_client(handler) -> httpx.Client:
    return httpx.Client(
        transport=httpx.MockTransport(handler),
        headers={
            "Authorization": f"Bearer {API_KEY}",
            "Content-Type": "application/json",
        },
    )


def _agent(handler) -> NexusAgent:
    client = _make_client(handler)

    with patch("nexus_bus.agent.httpx.Client", return_value=client):
        agent = NexusAgent(
            name="writer-agent",
            agent_type="writer",
            subscribe_topic="nexus.analysis",
            nexus_url=NEXUS_URL,
            api_key=API_KEY,
        )

    agent._client = client
    agent._producer = NexusProducer(client, NEXUS_URL, agent.name)
    agent._consumer = NexusConsumer(
        client,
        NEXUS_URL,
        agent.subscribe_topic,
        poll_interval=agent._poll_interval,
    )
    agent.context = ContextClient(client, NEXUS_URL)
    return agent


def test_agent_registration_succeeds_with_valid_key():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path.endswith("/agents/register"):
            return httpx.Response(
                200,
                json={
                    "name": "writer-agent",
                    "agent_type": "writer",
                    "status": "active",
                    "subscribe_topics": ["nexus.analysis"],
                },
            )
        return httpx.Response(404)

    agent = _agent(handler)
    agent.register()


def test_agent_registration_fails_with_invalid_key():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path.endswith("/agents/register"):
            return httpx.Response(401, json={"detail": "Invalid API key"})
        return httpx.Response(404)

    agent = _agent(handler)
    with pytest.raises(NexusAuthError):
        agent.register()


def test_message_publish_succeeds():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path.endswith("/messages/publish"):
            body = json.loads(request.content.decode())
            assert body["topic"] == "nexus.writing"
            assert body["correlation_id"] == "run_test"
            return httpx.Response(
                200,
                json={
                    "id": "msg-1",
                    "topic": "nexus.writing",
                    "correlation_id": "run_test",
                    "sender_agent": "writer-agent",
                    "payload": {"status": "done"},
                },
            )
        return httpx.Response(404)

    agent = _agent(handler)
    result = agent.publish("nexus.writing", {"status": "done"}, "run_test")
    assert result["id"] == "msg-1"


def test_message_publish_raises_on_failure():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "POST" and request.url.path.endswith("/messages/publish"):
            return httpx.Response(400, json={"detail": "Topic missing"})
        return httpx.Response(404)

    agent = _agent(handler)
    with pytest.raises(NexusPublishError):
        agent.publish("nexus.missing", {}, "run_test")


def test_agent_deregisters_on_stop():
    calls: list[tuple[str, str]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append((request.method, request.url.path))
        if request.method == "POST" and request.url.path.endswith("/agents/register"):
            return httpx.Response(200, json={"name": "writer-agent"})
        if request.method == "DELETE":
            return httpx.Response(200, json={"message": "deregistered"})
        if request.method == "POST" and request.url.path.endswith("/heartbeat"):
            return httpx.Response(200, json={"status": "ok"})
        if request.method == "GET" and request.url.path.endswith("/messages"):
            return httpx.Response(200, json=[])
        return httpx.Response(404)

    agent = _agent(handler)

    @agent.on_message
    def handle(_message):
        pass

    agent.start(skip_existing=True)
    agent.stop()

    assert ("POST", "/api/v1/agents/register") in calls
    assert ("DELETE", "/api/v1/agents/writer-agent") in calls


def test_on_message_decorator_registers_handler():
    agent = _agent(lambda request: httpx.Response(404))

    @agent.on_message
    def handle(message):
        return message

    assert agent._message_handler is not None


def test_context_manager_closes_agent():
    calls: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.method)
        if request.method == "DELETE":
            return httpx.Response(200, json={"message": "deregistered"})
        return httpx.Response(200, json={})

    agent = _agent(handler)
    with agent:
        pass

    assert "DELETE" in calls
