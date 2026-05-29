import os
import sys
from datetime import date

from dotenv import load_dotenv


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from nexus_local import NexusAgent


load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

NEXUS_URL = os.getenv("NEXUS_URL")
NEXUS_API_KEY = os.getenv("NEXUS_API_KEY")

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "..", "output")


class DelivererAgent:
    def __init__(self) -> None:
        self.nexus = NexusAgent(
            name="deliverer-agent",
            agent_type="deliverer",
            subscribe_topic="nexus.writing",
            nexus_url=NEXUS_URL,
            api_key=NEXUS_API_KEY,
        )

    def save_briefing(self, correlation_id: str, content: str) -> str:
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        today = date.today().strftime("%Y-%m-%d")
        safe_correlation_id = "".join(
            char if char.isalnum() or char in {"-", "_"} else "_"
            for char in correlation_id
        )
        filename = f"briefing_{today}_{safe_correlation_id}.md"
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as file:
            file.write(content)
        return filename

    def handle_message(self, message: dict) -> None:
        correlation_id = message.get("correlation_id")
        print("📬 Deliverer: Saving briefing...")
        briefing_data = self.nexus.context_read(correlation_id, "final_briefing")
        if not briefing_data:
            print("⚠ No briefing found in context")
            return
        content = briefing_data.get("content", "")
        if not content:
            print("⚠ Briefing content is empty")
            return
        filename = self.save_briefing(correlation_id, content)
        print("=" * 50)
        print(content)
        print("=" * 50)
        print(f"✓ Deliverer: Briefing saved to output/{filename}")
        self.nexus.context_write(
            correlation_id,
            "delivery_status",
            {"filename": filename, "status": "delivery_complete"},
        )
        self.nexus.publish(
            "nexus.delivery",
            {"filename": filename, "status": "delivery_complete"},
            correlation_id,
        )
        print("🎉 Pipeline complete!")
        print(f"   Correlation ID: {correlation_id}")

    def run(self, skip_existing: bool = False) -> None:
        print("👂 Deliverer: Listening on nexus.writing...")
        self.nexus.start(callback=self.handle_message, skip_existing=skip_existing)


if __name__ == "__main__":
    import time

    agent = DelivererAgent()
    agent.run()
    time.sleep(60)
