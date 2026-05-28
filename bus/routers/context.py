from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel

from auth.api_keys import validate_api_key
from auth.jwt import require_admin
from context.store import ContextStore


router = APIRouter()


class ContextValueRequest(BaseModel):
    value: dict[str, Any]
    ttl_hours: int = 24


def get_context_store(request: Request) -> ContextStore:
    return request.app.state.context_store


@router.get("/{correlation_id}")
def get_context(
    correlation_id: str,
    api_key: dict = Depends(validate_api_key),
    store: ContextStore = Depends(get_context_store),
) -> dict[str, dict[str, Any]]:
    return store.get_all(correlation_id)


@router.get("/{correlation_id}/{key}")
def get_context_value(
    correlation_id: str,
    key: str,
    api_key: dict = Depends(validate_api_key),
    store: ContextStore = Depends(get_context_store),
) -> dict[str, Any] | None:
    return store.get(correlation_id, key)


@router.put("/{correlation_id}/{key}")
def set_context_value(
    correlation_id: str,
    key: str,
    request_body: ContextValueRequest,
    api_key: dict = Depends(validate_api_key),
    store: ContextStore = Depends(get_context_store),
) -> dict[str, str]:
    store.set(
        correlation_id,
        key,
        request_body.value,
        ttl_hours=request_body.ttl_hours,
    )
    return {"status": "ok", "key": key}


@router.delete("/{correlation_id}")
def delete_context(
    correlation_id: str,
    admin: dict = Depends(require_admin),
    store: ContextStore = Depends(get_context_store),
) -> dict[str, str]:
    store.delete(correlation_id)
    return {"message": f"Context {correlation_id} deleted"}
