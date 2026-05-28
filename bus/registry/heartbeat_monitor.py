import asyncio
from datetime import datetime, timezone

from registry.registry import AgentRegistry
from websocket.live import AGENT_DEAD, manager


class HeartbeatMonitor:
    def __init__(self, registry: AgentRegistry, timeout_seconds: int = 30) -> None:
        self.registry = registry
        self.timeout_seconds = timeout_seconds

    async def start(self) -> None:
        while True:
            dead_agents = self.registry.check_dead_agents()
            for agent in dead_agents:
                await manager.broadcast(
                    AGENT_DEAD,
                    {
                        "name": agent.name,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    },
                )
            await asyncio.sleep(10)
