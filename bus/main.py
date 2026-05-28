import os
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from redis import Redis

from config import KAFKA_BROKER, REDIS_URL
from context.store import ContextStore
from kafka.dead_letter import DeadLetterQueue
from kafka.default_topics import create_default_topics
from kafka.producer import NexusProducer
from kafka.topics import TopicManager
from pipeline.tracker import PipelineTracker
from auth.invitations import InvitationStore
from auth.user_store import UserStore
from registry.heartbeat_monitor import HeartbeatMonitor
from registry.registry import agent_registry
from routers.agents import router as agents_router
from routers.auth import router as auth_router
from routers.context import router as context_router
from routers.deadletter import router as deadletter_router
from routers.keys import router as keys_router
from routers.messages import router as messages_router
from routers.pipelines import router as pipelines_router
from routers.team import router as team_router
from routers.topics import router as topics_router
from auth.jwt import decode_access_token
from websocket.live import manager


load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    create_default_topics(KAFKA_BROKER)
    app.state.producer = NexusProducer(KAFKA_BROKER)
    app.state.topic_manager = TopicManager(KAFKA_BROKER)
    app.state.redis = Redis.from_url(REDIS_URL)
    agent_registry.connect(app.state.redis)
    app.state.user_store = UserStore(app.state.redis)
    app.state.invitation_store = InvitationStore(app.state.redis)
    app.state.pipeline_tracker = PipelineTracker(app.state.redis)
    app.state.dead_letter_queue = DeadLetterQueue(app.state.redis, app.state.producer)
    app.state.context_store = ContextStore(REDIS_URL)
    app.state.context_store.connect()
    heartbeat_monitor = HeartbeatMonitor(agent_registry)
    heartbeat_task = asyncio.create_task(heartbeat_monitor.start())
    app.state.heartbeat_task = heartbeat_task

    try:
        yield
    finally:
        app.state.producer.close()
        app.state.redis.close()
        app.state.context_store.disconnect()
        heartbeat_task.cancel()
        try:
            await heartbeat_task
        except asyncio.CancelledError:
            pass


app = FastAPI(
    title="Nexus Bus",
    version="1.0.0",
    description="Core API service for the Nexus multi-agent coordination bus.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(agents_router, prefix="/api/v1/agents")
app.include_router(auth_router, prefix="/api/v1/auth")
app.include_router(keys_router, prefix="/api/v1/keys")
app.include_router(team_router, prefix="/api/v1/team")
app.include_router(messages_router, prefix="/api/v1/messages")
app.include_router(context_router, prefix="/api/v1/context")
app.include_router(topics_router, prefix="/api/v1/topics")
app.include_router(pipelines_router, prefix="/api/v1/pipelines")
app.include_router(deadletter_router, prefix="/api/v1/deadletter")


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": "nexus-bus",
        "version": "1.0.0",
    }


@app.websocket("/ws/live")
async def live_websocket(websocket: WebSocket) -> None:
    token = websocket.query_params.get("token")
    if token is None:
        await websocket.close(code=1008)
        return

    try:
        decode_access_token(token)
    except Exception:
        await websocket.close(code=1008)
        return

    await manager.connect(websocket)
    try:
        while True:
            await asyncio.sleep(30)
            await websocket.send_text('{"event":"ping"}')
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)
