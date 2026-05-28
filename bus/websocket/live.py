from datetime import datetime, timezone
from typing import Any


MESSAGE_PUBLISHED = "message.published"
AGENT_REGISTERED = "agent.registered"
AGENT_HEARTBEAT = "agent.heartbeat"
AGENT_DEAD = "agent.dead"
PIPELINE_STARTED = "pipeline.started"
PIPELINE_COMPLETED = "pipeline.completed"
PIPELINE_FAILED = "pipeline.failed"


class ConnectionManager:
    def __init__(self) -> None:
        self.active_connections = []

    async def connect(self, websocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: dict[str, Any]) -> None:
        event = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        broken_connections = []
        for websocket in self.active_connections:
            try:
                await websocket.send_json(event)
            except Exception:
                broken_connections.append(websocket)

        for websocket in broken_connections:
            self.disconnect(websocket)


manager = ConnectionManager()
