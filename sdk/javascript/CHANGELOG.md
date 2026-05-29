# Changelog

All notable changes to the `nexus-bus` JavaScript SDK are documented in this file.

## [0.1.0] - 2026-05-29

### Added

- Initial release of the official Nexus JavaScript SDK (`nexus-bus`)
- `NexusAgent` with async registration, heartbeat, publish, consume, and shutdown
- `ContextClient` for shared pipeline context (`get`, `set`, `getAll`)
- Typed errors: `NexusAuthError`, `NexusConnectionError`, `NexusPublishError`, `NexusConsumeError`
- Vitest test suite with axios mocks
