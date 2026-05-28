from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from auth.api_keys import validate_api_key
from auth.jwt import get_current_user, require_admin
from models.agent import Agent, AgentStatus
from registry.registry import agent_registry
from websocket.live import AGENT_HEARTBEAT, AGENT_REGISTERED, manager


router = APIRouter()


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
) -> list[Agent]:
    agents = agent_registry.list_all()
    if status is None:
        return agents
    return [agent for agent in agents if agent.status == status]


@router.get("/{name}", response_model=Agent)
def get_agent(
    name: str,
    current_user: dict = Depends(get_current_user),
) -> Agent:
    return agent_registry.get(name)


@router.post("/{name}/heartbeat")
async def agent_heartbeat(
    name: str,
    api_key: dict = Depends(validate_api_key),
) -> dict[str, str]:
    agent_registry.update_heartbeat(name)
    timestamp = datetime.now(timezone.utc).isoformat()
    await manager.broadcast(AGENT_HEARTBEAT, {"name": name, "timestamp": timestamp})
    return {"status": "ok", "agent": name, "timestamp": timestamp}
