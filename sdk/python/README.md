# nexus-bus

Official Python SDK for the [Nexus](https://github.com/Akash8585/nexus) multi-agent coordination bus.

## Installation

```bash
pip install nexus-bus
```

For local development from this repository:

```bash
cd sdk/python
pip install -e ".[dev]"
```

## Quickstart

Connect an agent to Nexus in five lines:

```python
from nexus_bus import NexusAgent

agent = NexusAgent(
    name="writer-agent",
    agent_type="writer",
    subscribe_topic="nexus.analysis",
    nexus_url="http://localhost:8000",
    api_key="nxs_live_sk_your_key_here",
)

@agent.on_message
def handle(message):
    top5 = agent.context.get(message["correlation_id"], "top5_stories")
    agent.publish("nexus.writing", {"status": "writing_complete"}, message["correlation_id"])

agent.start()
```

## API Reference

### `NexusAgent`

| Method | Description |
|---|---|
| `__init__(name, agent_type, subscribe_topic, nexus_url, api_key)` | Create an agent client |
| `register()` | Register the agent with Nexus. Raises `NexusAuthError` on invalid API key |
| `deregister()` | Deregister the agent from Nexus |
| `publish(topic, payload, correlation_id)` | Publish a message. Returns message dict. Raises `NexusPublishError` on failure |
| `on_message(callback)` | Decorator or direct call to register a message handler |
| `start(skip_existing=False)` | Register, start heartbeat, and begin consuming |
| `stop()` | Stop heartbeat/consuming and deregister |
| `close()` | Alias for `stop()` plus HTTP client cleanup |
| `context` | `ContextClient` instance for shared pipeline state |

Context manager usage:

```python
with NexusAgent(...) as agent:
    agent.start()
```

### `ContextClient`

| Method | Returns | Description |
|---|---|---|
| `get(correlation_id, key)` | `Any \| None` | Read a context value |
| `set(correlation_id, key, value, ttl_hours=24)` | `dict` | Write a context value |
| `get_all(correlation_id)` | `dict` | Read all context keys for a run |

### Exceptions

| Exception | When raised |
|---|---|
| `NexusAuthError` | Invalid or unauthorized API key |
| `NexusConnectionError` | Cannot reach the Nexus bus API |
| `NexusPublishError` | Message publish rejected by the bus |
| `NexusConsumeError` | Message polling failed |

## Error Handling

```python
from nexus_bus import NexusAgent, NexusAuthError, NexusPublishError

agent = NexusAgent(...)

try:
    agent.register()
    agent.publish("nexus.research", {"status": "ok"}, "run_123")
except NexusAuthError:
    print("Check your API key in the Nexus dashboard")
except NexusPublishError as exc:
    print(f"Publish failed: {exc}")
finally:
    agent.close()
```

## Development

```bash
cd sdk/python
pip install -e ".[dev]"
pytest
python -m build
```

## License

MIT
