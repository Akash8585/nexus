# Changelog

All notable changes to the Nexus project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-05-29

### Added

- **Nexus Bus** — FastAPI backend with Kafka message bus, Redis context store, JWT auth, and WebSocket live events
- **Dashboard** — Next.js live dashboard for agents, messages, topics, pipelines, dead-letter queue, and topology
- **Demo pipeline** — Four-agent news briefing (Scout → Analyst → Writer → Deliverer)
- **Python SDK** (`nexus-bus` 0.1.0) — `NexusAgent`, context client, producer/consumer, typed exceptions
- **JavaScript SDK** (`nexus-bus` 0.1.0) — async `NexusAgent`, context client, typed errors
- **Documentation site** — Mintlify docs with quickstart, concepts, SDK reference, and API reference
- **Docker Compose** — One-command local stack (Kafka, Redis, Zookeeper, Nexus Bus)
- Default Kafka topics: `nexus.research`, `nexus.analysis`, `nexus.draft`, `nexus.delivery`
- Pipeline tracking with correlation IDs, replay, and dead-letter queue
- API key authentication for agents; JWT authentication for dashboard users
- Team invites, admin settings, and agent cleanup

### SDK release notes

- [Python SDK changelog](sdk/python/CHANGELOG.md)
- [JavaScript SDK changelog](sdk/javascript/CHANGELOG.md)
