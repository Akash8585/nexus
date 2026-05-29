# nexus-bus

Official JavaScript SDK for the [Nexus](https://github.com/Akash8585/nexus) multi-agent coordination bus.

## Installation

```bash
npm install nexus-bus
```

For local development from this repository:

```bash
cd sdk/javascript
npm install
```

## Quickstart

Connect an agent to Nexus in a few lines:

```typescript
import { NexusAgent } from "nexus-bus";

const agent = new NexusAgent({
  name: "writer-agent",
  agentType: "writer",
  subscribeTopic: "nexus.analysis",
  nexusUrl: "http://localhost:8000",
  apiKey: "nxs_live_sk_your_key_here",
});

agent.onMessage(async (message) => {
  const top5 = await agent.context.get(message.correlation_id, "top5_stories");
  await agent.publish(
    "nexus.writing",
    { status: "writing_complete" },
    message.correlation_id,
  );
});

await agent.start();
```

## API Reference

### `NexusAgent`

| Method | Description |
|---|---|
| `new NexusAgent(options)` | Create an agent client |
| `register()` | Register the agent with Nexus. Throws `NexusAuthError` on invalid API key |
| `deregister()` | Deregister the agent from Nexus |
| `publish(topic, payload, correlationId)` | Publish a message. Returns message object. Throws `NexusPublishError` on failure |
| `onMessage(callback)` | Register an async message handler |
| `start({ skipExisting? })` | Register, start heartbeat, and begin consuming |
| `stop()` | Stop heartbeat/consuming and deregister |
| `context` | `ContextClient` instance for shared pipeline state |

#### `NexusAgentOptions`

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | `string` | yes | Agent name |
| `agentType` | `string` | yes | Agent role/type |
| `subscribeTopic` | `string` | yes | Topic to consume |
| `nexusUrl` | `string` | yes | Base Nexus bus URL |
| `apiKey` | `string` | yes | Nexus API key |
| `heartbeatIntervalMs` | `number` | no | Heartbeat interval (default `10000`) |
| `pollIntervalMs` | `number` | no | Message poll interval (default `3000`) |

### `ContextClient`

| Method | Returns | Description |
|---|---|---|
| `get(correlationId, key)` | `Promise<T \| null>` | Read a context value |
| `set(correlationId, key, value, ttlHours?)` | `Promise<{ status, key }>` | Write a context value |
| `getAll(correlationId)` | `Promise<Record<string, unknown>>` | Read all context keys for a run |

### Exceptions

| Error | When thrown |
|---|---|
| `NexusAuthError` | Invalid or unauthorized API key |
| `NexusConnectionError` | Cannot reach the Nexus bus API |
| `NexusPublishError` | Message publish rejected by the bus |
| `NexusConsumeError` | Message polling failed |

## Error Handling

```typescript
import {
  NexusAgent,
  NexusAuthError,
  NexusPublishError,
} from "nexus-bus";

const agent = new NexusAgent({ /* ... */ });

try {
  await agent.register();
  await agent.publish("nexus.research", { status: "ok" }, "run_123");
} catch (error) {
  if (error instanceof NexusAuthError) {
    console.error("Check your API key in the Nexus dashboard");
  } else if (error instanceof NexusPublishError) {
    console.error("Publish failed:", error.message);
  }
} finally {
  await agent.stop();
}
```

## Development

```bash
cd sdk/javascript
npm install
npm test
npm run build
```

## License

MIT
