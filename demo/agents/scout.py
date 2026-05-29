import json
import os
import sys

from dotenv import load_dotenv
from groq import Groq


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from nexus_local import NexusAgent


load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

NEXUS_URL = os.getenv("NEXUS_URL")
NEXUS_API_KEY = os.getenv("NEXUS_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
MODEL = "llama-3.3-70b-versatile"

FALLBACK_HEADLINES = [
    {
        "title": "OpenAI releases GPT-5 with improved reasoning",
        "source": "TechCrunch",
        "summary": "OpenAI announces major upgrade",
    },
    {
        "title": "Google DeepMind achieves new milestone in protein folding",
        "source": "Nature",
        "summary": "AlphaFold 3 surpasses benchmarks",
    },
    {
        "title": "Anthropic raises $2B in new funding round",
        "source": "Bloomberg",
        "summary": "AI safety company expands",
    },
    {
        "title": "Meta releases open source LLaMA 4 model",
        "source": "The Verge",
        "summary": "Largest open model released",
    },
    {
        "title": "AI agents now handle 30% of software development tasks",
        "source": "Forbes",
        "summary": "Enterprise AI adoption surges",
    },
    {
        "title": "EU AI Act enforcement begins across member states",
        "source": "Reuters",
        "summary": "Landmark regulation takes effect",
    },
    {
        "title": "Nvidia announces next gen Blackwell Ultra GPU",
        "source": "Wired",
        "summary": "New chip targets AI workloads",
    },
    {
        "title": "Microsoft Copilot now integrated into all Office products",
        "source": "ZDNet",
        "summary": "AI assistant goes mainstream",
    },
    {
        "title": "Stanford study shows LLMs show signs of reasoning",
        "source": "Stanford AI Lab",
        "summary": "Research challenges assumptions",
    },
    {
        "title": "AI startup funding hits record $50B in Q1 2026",
        "source": "Crunchbase",
        "summary": "Investor interest remains high",
    },
]


class ScoutAgent:
    def __init__(self) -> None:
        self.nexus = NexusAgent(
            name="scout-agent",
            agent_type="researcher",
            subscribe_topic="nexus.research",
            nexus_url=NEXUS_URL,
            api_key=NEXUS_API_KEY,
        )
        self.groq = Groq(api_key=GROQ_API_KEY)

    def search_news(self) -> list[dict[str, str]]:
        try:
            response = self.groq.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            "Generate 10 realistic AI news headlines from today "
                            "May 2026. Return ONLY a JSON array of objects. "
                            "Each object must have exactly these fields: "
                            "title, source, summary. No other text. No markdown. "
                            "Just the JSON array."
                        ),
                    }
                ],
                temperature=0.7,
            )
            content = response.choices[0].message.content
            headlines = json.loads(content)
            if isinstance(headlines, list) and len(headlines) > 0:
                return headlines
            return FALLBACK_HEADLINES
        except Exception as exc:
            print(f"⚠ Groq failed: {exc}. Using fallback headlines.")
            return FALLBACK_HEADLINES

    def run(self, correlation_id: str) -> list[dict[str, str]]:
        print(f"Correlation ID: {correlation_id}")
        print("🔍 Scout: Searching for AI news...")
        self.nexus.register()
        headlines = self.search_news()
        self.nexus.context_write(correlation_id, "raw_headlines", headlines)
        self.nexus.publish(
            "nexus.research",
            {"headline_count": len(headlines), "status": "research_complete"},
            correlation_id,
        )
        print(
            f"✓ Scout: Found {len(headlines)} headlines. "
            "Published to nexus.research"
        )
        self.nexus.deregister()
        return headlines


if __name__ == "__main__":
    import time

    correlation_id = f"run_scout_test_{int(time.time())}"
    agent = ScoutAgent()
    headlines = agent.run(correlation_id)
    print(f"\nSample headline: {headlines[0]['title']}")
