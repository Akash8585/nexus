import asyncio
import json
import os

import httpx
import websockets


async def test_websocket():
    base = os.getenv("NEXUS_TEST_BASE_URL", "http://127.0.0.1:8000")
    ws_base = base.replace("http://", "ws://").replace("https://", "wss://")

    login_response = httpx.post(
        f"{base}/api/v1/auth/login",
        json={"email": "admin@nexus.dev", "password": "password123"},
        timeout=10.0,
    )
    login_response.raise_for_status()
    token = login_response.json()["access_token"]
    print(f"Got JWT: {token[:30]}...")

    uri = f"{ws_base}/ws/live?token={token}"
    async with websockets.connect(uri) as ws:
        print("WebSocket connected")

        async def register_agent():
            await asyncio.sleep(1)
            key_response = httpx.post(
                f"{base}/api/v1/keys",
                headers={"Authorization": f"Bearer {token}"},
                json={"name": "ws-test-key"},
                timeout=10.0,
            )
            key_response.raise_for_status()
            api_key = key_response.json()["key"]

            agent_response = httpx.post(
                f"{base}/api/v1/agents/register",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "name": "ws-test-agent",
                    "agent_type": "researcher",
                    "subscribe_topics": ["nexus.research"],
                },
                timeout=10.0,
            )
            agent_response.raise_for_status()

        asyncio.create_task(register_agent())

        try:
            msg = await asyncio.wait_for(ws.recv(), timeout=10.0)
            event = json.loads(msg)
            print(f"Received event: {event['event']}")
            assert event["event"] == "agent.registered"
            print("WebSocket test: PASS")
        except asyncio.TimeoutError:
            print("WebSocket test: FAIL - no event received within 10 seconds")
            raise


asyncio.run(test_websocket())
