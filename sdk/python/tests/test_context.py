import json

import httpx
import pytest

from nexus_bus.context import ContextClient
from nexus_bus.exceptions import NexusAuthError


NEXUS_URL = "http://localhost:8000"


def _context_client(handler) -> ContextClient:
    client = httpx.Client(
        transport=httpx.MockTransport(handler),
        headers={"Authorization": "Bearer nxs_live_sk_test"},
    )
    return ContextClient(client, NEXUS_URL)


def test_context_get_returns_value():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/context/run_1/top5"):
            return httpx.Response(200, json={"stories": [1, 2, 3]})
        return httpx.Response(404)

    context = _context_client(handler)
    assert context.get("run_1", "top5") == {"stories": [1, 2, 3]}


def test_context_get_returns_none_for_missing_key():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(404, json={"detail": "not found"})

    context = _context_client(handler)
    assert context.get("run_1", "missing") is None


def test_context_set_writes_value():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        if request.method == "PUT":
            captured["body"] = json.loads(request.content.decode())
            return httpx.Response(200, json={"status": "ok", "key": "top5"})
        return httpx.Response(404)

    context = _context_client(handler)
    result = context.set("run_1", "top5", {"stories": []})
    assert result["status"] == "ok"
    assert captured["body"]["value"] == {"stories": []}


def test_context_get_all_returns_mapping():
    def handler(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/context/run_1"):
            return httpx.Response(200, json={"top5": {"stories": []}, "status": "ok"})
        return httpx.Response(404)

    context = _context_client(handler)
    assert context.get_all("run_1") == {"top5": {"stories": []}, "status": "ok"}


def test_context_get_raises_auth_error():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(401, json={"detail": "Invalid API key"})

    context = _context_client(handler)
    with pytest.raises(NexusAuthError):
        context.get("run_1", "top5")
