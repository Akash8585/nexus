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


class AnalystAgent:
    def __init__(self) -> None:
        self.nexus = NexusAgent(
            name="analyst-agent",
            agent_type="analyst",
            subscribe_topic="nexus.research",
            nexus_url=NEXUS_URL,
            api_key=NEXUS_API_KEY,
        )
        self.groq = Groq(api_key=GROQ_API_KEY)

    def rank_stories(self, headlines: list[dict]) -> list[dict]:
        try:
            headlines_text = json.dumps(headlines, indent=2)
            response = self.groq.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Here are AI news headlines:
{headlines_text}

Rank the top 5 most important stories.
Return ONLY a JSON array of 5 objects.
Each object must have exactly these fields:
rank (1-5), title, source, summary, importance
No other text. No markdown. Just the JSON array.""",
                    }
                ],
                temperature=0.3,
            )
            content = response.choices[0].message.content
            top5 = json.loads(content)
            if isinstance(top5, list) and len(top5) > 0:
                return top5[:5]
            return headlines[:5]
        except Exception as exc:
            print(f"⚠ Groq failed: {exc}. Using first 5 headlines.")
            return headlines[:5]

    def handle_message(self, message: dict) -> None:
        correlation_id = message.get("correlation_id")
        print("🔬 Analyst: Ranking stories...")
        headlines = self.nexus.context_read(correlation_id, "raw_headlines")
        if not headlines:
            print("⚠ No headlines found in context")
            return
        top5 = self.rank_stories(headlines)
        self.nexus.context_write(correlation_id, "top5_stories", top5)
        self.nexus.publish(
            "nexus.analysis",
            {"story_count": len(top5), "status": "analysis_complete"},
            correlation_id,
        )
        print("✓ Analyst: Ranked top 5 stories. Published to nexus.analysis")

    def run(self, skip_existing: bool = False) -> None:
        print("👂 Analyst: Listening on nexus.research...")
        self.nexus.start(callback=self.handle_message, skip_existing=skip_existing)


if __name__ == "__main__":
    import time

    agent = AnalystAgent()
    agent.run()
    time.sleep(60)
