import json
import os
import sys
from datetime import date

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


class WriterAgent:
    def __init__(self) -> None:
        self.nexus = NexusAgent(
            name="writer-agent",
            agent_type="writer",
            subscribe_topic="nexus.analysis",
            nexus_url=NEXUS_URL,
            api_key=NEXUS_API_KEY,
        )
        self.groq = Groq(api_key=GROQ_API_KEY)

    def write_briefing(self, top5: list[dict]) -> str:
        today = date.today().strftime("%B %d, %Y")
        try:
            stories_text = json.dumps(top5, indent=2)
            response = self.groq.chat.completions.create(
                model=MODEL,
                messages=[
                    {
                        "role": "user",
                        "content": f"""Write a professional morning AI news briefing newsletter for {today}.

Based on these top 5 AI stories:
{stories_text}

Format exactly like this:
# Morning AI Briefing — {today}

[2 sentence intro paragraph]

## [Story 1 title]
[2-3 sentence summary]

## [Story 2 title]
[2-3 sentence summary]

## [Story 3 title]
[2-3 sentence summary]

## [Story 4 title]
[2-3 sentence summary]

## [Story 5 title]
[2-3 sentence summary]

[1 sentence closing line]

Keep total under 400 words.
Write in professional newsletter tone.""",
                    }
                ],
                temperature=0.7,
            )
            return response.choices[0].message.content
        except Exception as exc:
            print(f"⚠ Groq failed: {exc}. Using fallback briefing.")
            stories_summary = "\n".join(
                [
                    f"- {story.get('title', 'Story')}: {story.get('summary', '')}"
                    for story in top5
                ]
            )
            return f"""# Morning AI Briefing — {today}

Today's top AI stories:

{stories_summary}

Stay informed and keep building."""

    def handle_message(self, message: dict) -> None:
        correlation_id = message.get("correlation_id")
        print("✍️  Writer: Writing briefing...")
        top5 = self.nexus.context_read(correlation_id, "top5_stories")
        if not top5:
            print("⚠ No top5 stories found in context")
            return
        briefing = self.write_briefing(top5)
        word_count = len(briefing.split())
        self.nexus.context_write(
            correlation_id,
            "final_briefing",
            {"content": briefing},
        )
        self.nexus.publish(
            "nexus.writing",
            {"word_count": word_count, "status": "writing_complete"},
            correlation_id,
        )
        print(
            f"✓ Writer: Briefing written ({word_count} words). "
            "Published to nexus.writing"
        )

    def run(self, skip_existing: bool = False) -> None:
        print("👂 Writer: Listening on nexus.analysis...")
        self.nexus.start(callback=self.handle_message, skip_existing=skip_existing)

    def start(self, skip_existing: bool = False) -> None:
        self.run(skip_existing=skip_existing)


if __name__ == "__main__":
    import time

    agent = WriterAgent()
    agent.run()
    time.sleep(60)
