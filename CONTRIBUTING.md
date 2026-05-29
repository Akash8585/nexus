# Contributing to Nexus

Thank you for your interest in contributing to Nexus! This guide covers local setup, testing, and the pull request process.

## Development environment

### Prerequisites

- Docker and Docker Compose
- Python 3.9+
- Node.js 18+
- Git

### Clone and start the stack

```bash
git clone https://github.com/Akash8585/nexus.git
cd nexus
docker compose up -d
```

This starts Kafka, Redis, Zookeeper, and the Nexus Bus API at `http://localhost:8000`.

### Backend (FastAPI)

```bash
cd bus
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Environment variables are documented in `bus/.env.example`.

### Dashboard (Next.js)

```bash
cd dashboard
npm install
npm run dev
```

Open `http://localhost:3000`. The first user to sign up becomes admin.

### Demo pipeline

```bash
cd demo
pip install -r requirements.txt
python run.py "Give me a morning briefing on AI news"
```

### SDK development

```bash
# Python
cd sdk/python
pip install -e ".[dev]"
pytest

# JavaScript
cd sdk/javascript
npm install
npm test
npm run build
```

### Documentation site

```bash
cd docs
npx mintlify@latest dev
```

## Running tests

| Component | Command | Notes |
| --- | --- | --- |
| Python SDK | `cd sdk/python && pytest` | No external services required |
| JavaScript SDK | `cd sdk/javascript && npm test` | No external services required |
| Backend (integration) | `python bus/tests/test_context.py` | Requires Redis on `localhost:6379` |
| Backend (integration) | `python bus/tests/test_kafka.py` | Requires Kafka on `localhost:9092` and default topics |
| Backend (integration) | `python bus/tests/test_websocket.py` | Requires full stack + admin user |
| Dashboard | `cd dashboard && npm run build` | Type-check and production build |

CI runs all SDK tests and backend integration tests automatically on every push and pull request.

## Pull request process

1. **Fork** the repository and create a branch from `main`.
2. **Make your changes** — keep diffs focused and match existing code style.
3. **Run tests** locally before opening a PR.
4. **Open a pull request** with:
   - A clear description of what changed and why
   - Steps to reproduce or verify the change
   - Screenshots for UI changes
5. **Address review feedback** — maintainers may request changes before merge.

## Code style guidelines

### Python

- Follow PEP 8; use type hints where the surrounding code does
- Keep functions small and focused
- Match naming in `bus/` and `sdk/python/` (snake_case, descriptive module names)
- Add tests for new SDK behaviour in `sdk/python/tests/`

### TypeScript / React

- Use TypeScript strict mode patterns already in the dashboard
- Prefer functional components and hooks
- Match Tailwind utility patterns and design tokens from `DESIGN.md` (`#00D992` primary, `#101010` canvas)
- Run `npm run build` before submitting dashboard changes

### Commits

- Write clear commit messages in the imperative mood (e.g. "Add pipeline replay endpoint")
- One logical change per commit when possible

## Reporting issues

- **Bugs** — use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.yml)
- **Features** — use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.yml)

## Demo GIF for README

If you record a new demo GIF for the README, save it as `assets/demo.gif` (960×540 recommended). [LICEcap](https://www.cockos.com/licecap/) and [Kap](https://getkap.co/) work well on macOS/Windows.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
