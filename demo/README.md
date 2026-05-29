# Nexus Demo Pipeline

This demo runs a four-agent AI news briefing pipeline through Nexus:

1. Scout finds AI news headlines.
2. Analyst ranks the top five stories.
3. Writer turns the ranked stories into a newsletter.
4. Deliverer saves the final briefing to `demo/output/`.

## Prerequisites

- Docker Desktop running
- Nexus services started from the repository root
- Python dependencies installed from `demo/requirements.txt`
- A valid Groq API key
- A Nexus API key in `demo/.env`

## Setup

From the repository root:

```powershell
docker compose up -d
python -m pip install -r demo/requirements.txt
```

Create `demo/.env`:

```env
NEXUS_URL=http://localhost:8000
NEXUS_API_KEY=nxs_live_sk_your_key_here
GROQ_API_KEY=gsk_your_groq_key_here
```

## Run

```powershell
cd demo
python run.py "Give me a morning briefing on AI news"
```

## What To Expect

The terminal prints:

- A generated correlation ID
- Listener startup for Analyst, Writer, and Deliverer
- Scout research progress
- Analyst ranking progress
- Writer briefing progress
- Deliverer output and final file path

The run normally completes in under 60 seconds.

## Example Output

```text
🚀 NEXUS DEMO PIPELINE
Trigger:        Give me a morning briefing on AI news
Correlation ID: run_1779982732_lfzt7l

✓ Analyst agent listening on nexus.research
✓ Writer agent listening on nexus.analysis
✓ Deliverer agent listening on nexus.writing 

✓ Scout: Found 10 headlines. Published to nexus.research
✓ Analyst: Ranked top 5 stories. Published to nexus.analysis
✓ Writer: Briefing written (447 words). Published to nexus.writing
✓ Deliverer: Briefing saved to output/briefing_2026-05-28_run_1779982732_lfzt7l.md

🎉 PIPELINE COMPLETE!
```

The generated briefing is saved as:

```text
demo/output/briefing_<date>_<correlation_id>.md
```
