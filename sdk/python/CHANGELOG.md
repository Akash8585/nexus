# Changelog

All notable changes to the `nexus-bus` Python SDK are documented in this file.

## [0.1.0] - 2026-05-29

### Added

- Initial release of the official Nexus Python SDK (`nexus-bus`)
- `NexusAgent` with registration, heartbeat, publish, consume, and shutdown
- `ContextClient` for shared pipeline context (`get`, `set`, `get_all`)
- `NexusProducer` and `NexusConsumer` HTTP adapters for the Nexus bus API
- Typed exceptions: `NexusAuthError`, `NexusConnectionError`, `NexusPublishError`, `NexusConsumeError`
- Context manager and SIGINT/SIGTERM graceful shutdown support
- `@agent.on_message` decorator for message handlers
