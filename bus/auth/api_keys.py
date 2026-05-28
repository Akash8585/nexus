import hashlib
import json
import os
import secrets
import string
from typing import Any

from fastapi import Header, HTTPException
from redis import Redis

try:
    from bus import config
except ImportError:
    import config


REDIS_URL = getattr(config, "REDIS_URL", os.getenv("REDIS_URL", "redis://localhost:6379"))
API_KEY_PREFIX = "nxs_live_sk_"


def generate_api_key() -> str:
    alphabet = string.ascii_letters + string.digits
    secret = "".join(secrets.choice(alphabet) for _ in range(32))
    return f"{API_KEY_PREFIX}{secret}"


def hash_api_key(key: str) -> str:
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def verify_api_key(plain_key: str, stored_hash: str) -> bool:
    return secrets.compare_digest(hash_api_key(plain_key), stored_hash)


def validate_api_key(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    key = _extract_bearer_token(authorization)
    if not key.startswith(API_KEY_PREFIX):
        raise HTTPException(status_code=401, detail="Authorization token is not an API key")

    key_hash = hash_api_key(key)
    redis_client = Redis.from_url(REDIS_URL)

    try:
        raw_record = redis_client.get(f"apikeys:hash:{key_hash}")
        if raw_record is None:
            raise HTTPException(status_code=401, detail="Invalid API key")

        record = json.loads(raw_record.decode("utf-8"))
        if (
            record.get("is_active") is False
            or record.get("status") == "revoked"
            or record.get("revoked") is True
        ):
            raise HTTPException(status_code=401, detail="API key has been revoked")

        return record
    finally:
        redis_client.close()


def _extract_bearer_token(authorization: str | None) -> str:
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid Authorization header")

    return token
