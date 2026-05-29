import argparse
import os
import sys
import threading
import time
from datetime import datetime

from colorama import Fore, Style, init
from dotenv import load_dotenv


init(autoreset=True)

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

sys.path.insert(0, os.path.dirname(__file__))

from agents.analyst import AnalystAgent
from agents.deliverer import DelivererAgent
from agents.scout import ScoutAgent
from agents.writer import WriterAgent
from nexus_local import NexusAgent


NEXUS_URL = os.getenv("NEXUS_URL")
NEXUS_API_KEY = os.getenv("NEXUS_API_KEY")


def info(msg: str) -> None:
    print(f"{Fore.CYAN}{msg}{Style.RESET_ALL}")


def success(msg: str) -> None:
    print(f"{Fore.GREEN}{msg}{Style.RESET_ALL}")


def warn(msg: str) -> None:
    print(f"{Fore.YELLOW}{msg}{Style.RESET_ALL}")


def error(msg: str) -> None:
    print(f"{Fore.RED}{msg}{Style.RESET_ALL}")


def generate_correlation_id() -> str:
    import random
    import string

    chars = string.ascii_lowercase + string.digits
    suffix = "".join(random.choices(chars, k=6))
    return f"run_{int(time.time())}_{suffix}"


def wait_for_completion(
    nexus_client: NexusAgent,
    correlation_id: str,
    timeout: int = 120,
) -> bool:
    info("⏳ Waiting for pipeline to complete...")
    start = time.time()
    while time.time() - start < timeout:
        result = nexus_client.context_read(correlation_id, "delivery_status")
        if result and result.get("status") == "delivery_complete":
            return True
        time.sleep(3)
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Run Nexus demo pipeline")
    parser.add_argument(
        "trigger",
        nargs="?",
        default="Give me a morning briefing on AI news",
        help="Pipeline trigger input",
    )
    args = parser.parse_args()

    correlation_id = generate_correlation_id()
    start_time = time.time()

    print()
    info("=" * 55)
    info("🚀 NEXUS DEMO PIPELINE")
    info("=" * 55)
    info(f"Trigger:        {args.trigger}")
    info(f"Correlation ID: {correlation_id}")
    info(f"Started at:     {datetime.now().strftime('%H:%M:%S')}")
    info("=" * 55)
    print()

    monitor = NexusAgent(
        name="monitor-client",
        agent_type="monitor",
        subscribe_topic="nexus.research",
        nexus_url=NEXUS_URL,
        api_key=NEXUS_API_KEY,
    )

    info("Starting agents...")

    analyst = AnalystAgent()
    writer = WriterAgent()
    deliverer = DelivererAgent()

    analyst_thread = threading.Thread(
        target=analyst.run,
        kwargs={"skip_existing": True},
        daemon=True,
    )
    writer_thread = threading.Thread(
        target=writer.run,
        kwargs={"skip_existing": True},
        daemon=True,
    )
    deliverer_thread = threading.Thread(
        target=deliverer.run,
        kwargs={"skip_existing": True},
        daemon=True,
    )

    analyst_thread.start()
    writer_thread.start()
    deliverer_thread.start()

    success("✓ Analyst agent listening on nexus.research")
    success("✓ Writer agent listening on nexus.analysis")
    success("✓ Deliverer agent listening on nexus.writing")
    print()

    info("Waiting for agents to connect...")
    time.sleep(4)

    info("Triggering Scout agent...")
    scout = ScoutAgent()
    scout_thread = threading.Thread(
        target=scout.run,
        args=(correlation_id,),
        daemon=True,
    )
    scout_thread.start()
    scout_thread.join(timeout=30)

    print()
    info("Pipeline running — agents coordinating through Nexus...")
    print()

    completed = wait_for_completion(monitor, correlation_id, timeout=120)
    duration = round(time.time() - start_time, 1)

    print()
    info("=" * 55)
    if completed:
        success("🎉 PIPELINE COMPLETE!")
        success(f"   Duration: {duration} seconds")
        success(f"   Correlation ID: {correlation_id}")

        output_dir = os.path.join(os.path.dirname(__file__), "output")
        files = sorted(
            [
                filename
                for filename in os.listdir(output_dir)
                if filename.endswith(".md") and correlation_id in filename
            ]
        )
        if files:
            success(f"   Output: demo/output/{files[-1]}")
    else:
        error("❌ Pipeline timed out after 120 seconds")
        error("   Check agent logs for errors")
    info("=" * 55)
    print()


if __name__ == "__main__":
    main()
