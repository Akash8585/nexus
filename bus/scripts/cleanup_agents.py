import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from redis import Redis


ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

from config import REDIS_URL  # noqa: E402


STALE_STATUSES = {"dead", "deregistered"}


def main() -> None:
    load_dotenv(ROOT_DIR / ".env")
    redis_url = os.getenv("REDIS_URL", REDIS_URL)
    redis_client = Redis.from_url(redis_url)
    removed_count = 0

    for key in redis_client.scan_iter("agents:*"):
        raw_agent = redis_client.get(key)
        if raw_agent is None:
            continue

        try:
            agent = json.loads(raw_agent.decode("utf-8"))
        except json.JSONDecodeError:
            continue

        if agent.get("status") in STALE_STATUSES:
            redis_client.delete(key)
            removed_count += 1

    print(f"Removed {removed_count} stale agents")


if __name__ == "__main__":
    main()
