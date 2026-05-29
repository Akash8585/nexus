from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel
from redis import Redis

from auth.api_keys import validate_api_key
from auth.jwt import get_current_user, require_admin
from models.agent import Agent, AgentStatus
from kafka.dead_letter import count_agent_errors, list_agent_errors
from registry.registry import agent_registry
from routers.messages import count_agent_messages
from websocket.live import AGENT_HEARTBEAT, AGENT_REGISTERED, manager


router = APIRouter()


def get_redis(request: Request) -> Redis:
    return request.app.state.redis


def enrich_agent(agent: Agent, redis_client: Redis) -> Agent:
    agent.messages_processed = count_agent_messages(redis_client, agent.name)
    agent.error_count = count_agent_errors(redis_client, agent.name)
    return agent


class AgentRegisterRequest(BaseModel):
    name: str
    agent_type: str
    subscribe_topics: list[str]


@router.post("/register", response_model=Agent)
async def register_agent(
    request: AgentRegisterRequest,
    api_key: dict = Depends(validate_api_key),
) -> Agent:
    agent = Agent(
        name=request.name,
        agent_type=request.agent_type,
        subscribe_topics=request.subscribe_topics,
    )
    registered_agent = agent_registry.register(agent)
    await manager.broadcast(
        AGENT_REGISTERED,
        registered_agent.model_dump(mode="json"),
    )
    return registered_agent


@router.delete("/{name}")
def deregister_agent(
    name: str,
    admin: dict = Depends(require_admin),
) -> dict[str, str]:
    agent_registry.deregister(name)
    return {"message": f"Agent {name} deregistered"}


@router.get("", response_model=list[Agent])
def list_agents(
    status: AgentStatus | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
) -> list[Agent]:
    agents = agent_registry.list_all()
    if status is not None:
        agents = [agent for agent in agents if agent.status == status]
    return [enrich_agent(agent, redis_client) for agent in agents]


@router.get("/{name}/errors")
def get_agent_errors(
    name: str,
    current_user: dict = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
) -> list[dict]:
    agent_registry.get(name)
    return list_agent_errors(redis_client, name)


@router.get("/{name}", response_model=Agent)
def get_agent(
    name: str,
    current_user: dict = Depends(get_current_user),
    redis_client: Redis = Depends(get_redis),
) -> Agent:
    return enrich_agent(agent_registry.get(name), redis_client)


@router.post("/{name}/heartbeat")
async def agent_heartbeat(
    name: str,
    api_key: dict = Depends(validate_api_key),
) -> dict[str, str]:
    agent_registry.update_heartbeat(name)
    timestamp = datetime.now(timezone.utc).isoformat()
    await manager.broadcast(AGENT_HEARTBEAT, {"name": name, "timestamp": timestamp})
    return {"status": "ok", "agent": name, "timestamp": timestamp}
