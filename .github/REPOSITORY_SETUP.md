# GitHub repository setup (manual)

Complete these steps in the GitHub UI after pushing Phase 4.4 changes.

## Repository topics

Go to **Settings → General → Topics** on [github.com/Akash8585/nexus](https://github.com/Akash8585/nexus) and add:

```
ai
agents
kafka
multi-agent
llm
infrastructure
python
open-source
demo-pipeline
```

Or with GitHub CLI (if installed):

```bash
gh repo edit Akash8585/nexus --add-topic ai,agents,kafka,multi-agent,llm,infrastructure,python,open-source,demo-pipeline
```

## Pin the demo pipeline

1. Open the repo on GitHub
2. Under **About** (right sidebar), click the gear icon
3. In **Topics**, ensure `demo-pipeline` is included
4. Optionally pin the demo in the repo description: *"Includes a 4-agent news briefing demo pipeline"*

## Demo GIF

Replace `assets/demo-placeholder.svg` in the README with a recorded GIF:

1. Run `docker compose up -d` and start the dashboard
2. Run `cd demo && python run.py "Morning briefing on AI news"`
3. Record the dashboard with [LICEcap](https://www.cockos.com/licecap/) or [Kap](https://getkap.co/)
4. Save as `assets/demo.gif` and update the README image src

## Mintlify docs deploy

See [docs/DEPLOY.md](../docs/DEPLOY.md) for connecting Mintlify Cloud to this repo.
