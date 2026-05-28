import logging
from datetime import datetime, timezone

from fastapi import HTTPException
from redis import Redis

from models.agent import Agent, AgentStatus


logger = logging.getLogger(__name__)


class AgentRegistry:
    _instance: "AgentRegistry | None" = None

    def __new__(cls) -> "AgentRegistry":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance.redis = None
        return cls._instance

    def connect(self, redis_client: Redis) -> None:
        self.redis = redis_client

    def register(self, agent: Agent) -> Agent:
        client = self._client()
        key = self._key(agent.name)

        if client.exists(key):
            raise HTTPException(
                status_code=409,
                detail=f"Agent '{agent.name}' is already registered",
            )

        agent.status = AgentStatus.idle
        client.set(key, agent.model_dump_json())
        return agent

    def deregister(self, name: str) -> Agent:
        client = self._client()
        agent = self.get(name)
        agent.status = AgentStatus.deregistered
        client.delete(self._key(name))
        return agent

    def get(self, name: str) -> Agent:
        raw_agent = self._client().get(self._key(name))
        if raw_agent is None:
            raise HTTPException(status_code=404, detail=f"Agent '{name}' not found")
        return Agent.model_validate_json(raw_agent.decode("utf-8"))

    def list_all(self) -> list[Agent]:
        agents: list[Agent] = []
        for key in self._client().scan_iter("agents:*"):
            raw_agent = self._client().get(key)
            if raw_agent is not None:
                agents.append(Agent.model_validate_json(raw_agent.decode("utf-8")))
        return agents

    def update_heartbeat(self, name: str) -> Agent:
        agent = self.get(name)
        agent.last_heartbeat = datetime.now(timezone.utc)
        agent.status = AgentStatus.idle
        self._save(agent)
        return agent

    def update_status(self, name: str, status: AgentStatus) -> Agent:
        agent = self.get(name)
        agent.status = AgentStatus(status)
        self._save(agent)
        return agent

    def increment_messages(self, name: str) -> Agent:
        agent = self.get(name)
        agent.messages_processed += 1
        self._save(agent)
        return agent

    def increment_errors(self, name: str) -> Agent:
        agent = self.get(name)
        agent.error_count += 1
        self._save(agent)
        return agent

    def check_dead_agents(self) -> list[Agent]:
        now = datetime.now(timezone.utc)
        dead_agents: list[Agent] = []

        for agent in self.list_all():
            age_seconds = (now - agent.last_heartbeat).total_seconds()
            if (
                age_seconds >= 30
                and agent.status not in {AgentStatus.dead, AgentStatus.deregistered}
            ):
                agent.status = AgentStatus.dead
                self._save(agent)
                logger.warning(
                    "Agent %s marked dead after %.1f seconds without heartbeat",
                    agent.name,
                    age_seconds,
                )
                dead_agents.append(agent)

        return dead_agents

    def _client(self) -> Redis:
        if self.redis is None:
            raise RuntimeError("AgentRegistry Redis client has not been configured")
        return self.redis

    def _save(self, agent: Agent) -> None:
        self._client().set(self._key(agent.name), agent.model_dump_json())

    @staticmethod
    def _key(name: str) -> str:
        return f"agents:{name}"


agent_registry = AgentRegistry()
