from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request
from pydantic import BaseModel

from auth.api_keys import API_KEY_PREFIX, validate_api_key
from auth.jwt import get_current_user, require_admin
from context.store import ContextStore


router = APIRouter()


class ContextValueRequest(BaseModel):
    value: Any
    ttl_hours: int = 24


def get_context_store(request: Request) -> ContextStore:
    return request.app.state.context_store


def validate_api_key_or_jwt(authorization: str | None = Header(default=None)) -> dict:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")
    if token.startswith(API_KEY_PREFIX):
        return validate_api_key(authorization)
    return get_current_user(authorization)


@router.delete("/flush-all")
def flush_context_store(
    admin: dict = Depends(require_admin),
    store: ContextStore = Depends(get_context_store),
) -> dict[str, int | str]:
    deleted = store.flush_all()
    return {"message": "All context data flushed", "deleted": deleted}


@router.get("/{correlation_id}")
def get_context(
    correlation_id: str,
    auth: dict = Depends(validate_api_key_or_jwt),
    store: ContextStore = Depends(get_context_store),
) -> dict[str, Any]:
    return store.get_all(correlation_id)


@router.get("/{correlation_id}/{key}")
def get_context_value(
    correlation_id: str,
    key: str,
    auth: dict = Depends(validate_api_key_or_jwt),
    store: ContextStore = Depends(get_context_store),
) -> Any:
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
