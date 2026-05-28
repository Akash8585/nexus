import os
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from bus.kafka.consumer import NexusConsumer
from bus.kafka.producer import NexusProducer


BROKER = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
TOPIC = "nexus.research"
EXPECTED_TEXT = "hello from nexus"


def main() -> None:
    marker = uuid.uuid4().hex
    message = {
        "test": EXPECTED_TEXT,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "marker": marker,
    }
    received_messages: list[dict] = []
    message_received = threading.Event()

    def on_message(payload: dict) -> None:
        received_messages.append(payload)
        if payload.get("marker") == marker:
            message_received.set()

    producer = NexusProducer(BROKER)
    try:
        producer.publish(TOPIC, message)
        print("Test 1 passed: published message to nexus.research")
    finally:
        producer.close()

    consumer = NexusConsumer(
        topic=TOPIC,
        group_id=f"nexus-test-{marker}",
        callback=on_message,
    )
    consumer_thread = threading.Thread(target=consumer.start, daemon=True)
    consumer_thread.start()

    try:
        if not message_received.wait(timeout=10):
            raise AssertionError("No matching Kafka message received within 10 seconds")

        print("Test 2 passed: consumed at least one message from nexus.research")

        matching_message = next(
            payload for payload in received_messages if payload.get("marker") == marker
        )
        assert matching_message.get("test") == EXPECTED_TEXT
        print("Test 3 passed: consumed message content matches expected payload")
    finally:
        consumer.stop()
        consumer_thread.join(timeout=5)
        time.sleep(0.1)

    print("All Kafka tests passed")


if __name__ == "__main__":
    main()
