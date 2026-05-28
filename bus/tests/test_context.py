import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from bus.context.store import ContextStore


CORRELATION_ID = "run_test001"


def main() -> None:
    store = ContextStore()
    store.connect()

    try:
        store.delete(CORRELATION_ID)

        store.set(
            CORRELATION_ID,
            "headlines",
            {"data": "test headlines"},
            ttl_hours=24,
        )
        print("Test 1 passed: wrote context value")

        value = store.get(CORRELATION_ID, "headlines")
        assert value == {"data": "test headlines"}
        print("Test 2 passed: read context value back")

        ttl = store._client().ttl(f"context/{CORRELATION_ID}/headlines")
        assert ttl > 0
        print("Test 3 passed: Redis TTL is greater than 0")

        store.set(CORRELATION_ID, "top5", {"stories": ["a", "b", "c"]})
        result = store.get_all(CORRELATION_ID)
        assert "headlines" in result
        assert "top5" in result
        assert result["headlines"] == {"data": "test headlines"}
        assert result["top5"] == {"stories": ["a", "b", "c"]}
        print("Test 4 passed: get_all returns both context keys")

        store.delete(CORRELATION_ID)
        deleted_value = store.get(CORRELATION_ID, "headlines")
        assert deleted_value is None
        print("Test 5 passed: deleted all context for run")
    finally:
        store.delete(CORRELATION_ID)
        store.disconnect()

    print("All context store tests passed")


if __name__ == "__main__":
    main()
