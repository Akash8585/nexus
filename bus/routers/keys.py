import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from auth.api_keys import generate_api_key, hash_api_key
from auth.jwt import require_admin


router = APIRouter()


class KeyCreateRequest(BaseModel):
    name: str


def _key_record_public(record: dict) -> dict:
    return {
        "id": record["id"],
        "name": record["name"],
        "prefix": record["prefix"],
        "created_at": record["created_at"],
        "is_active": record["is_active"],
    }


@router.get("")
def list_keys(
    request: Request,
    admin: dict = Depends(require_admin),
) -> list[dict]:
    records: list[dict] = []
    for key in request.app.state.redis.scan_iter("apikeys:key_*"):
        raw_record = request.app.state.redis.get(key)
        if raw_record is not None:
            records.append(_key_record_public(json.loads(raw_record.decode("utf-8"))))
    return records


@router.post("")
def create_key(
    request_body: KeyCreateRequest,
    request: Request,
    admin: dict = Depends(require_admin),
) -> dict:
    full_key = generate_api_key()
    key_hash = hash_api_key(full_key)
    key_id = f"key_{uuid.uuid4().hex}"
    record = {
        "id": key_id,
        "name": request_body.name,
        "prefix": full_key[:20],
        "hash": key_hash,
        "is_active": True,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "created_by": admin["id"],
    }
    encoded_record = json.dumps(record)
    request.app.state.redis.set(f"apikeys:{key_id}", encoded_record)
    request.app.state.redis.set(f"apikeys:hash:{key_hash}", encoded_record)
    return {
        "id": key_id,
        "key_id": key_id,
        "name": request_body.name,
        "key": full_key,
        "warning": "Store this key securely. You will not be able to see it again.",
    }


@router.delete("/{key_id}")
def revoke_key(
    key_id: str,
    request: Request,
    admin: dict = Depends(require_admin),
) -> dict[str, str]:
    redis_key = f"apikeys:{key_id}"
    raw_record = request.app.state.redis.get(redis_key)
    if raw_record is None:
        raise HTTPException(status_code=404, detail="API key not found")

    record = json.loads(raw_record.decode("utf-8"))
    record["is_active"] = False
    request.app.state.redis.set(redis_key, json.dumps(record))
    request.app.state.redis.delete(f"apikeys:hash:{record['hash']}")
    return {"message": "API key revoked"}
