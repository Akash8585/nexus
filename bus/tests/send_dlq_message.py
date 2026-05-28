import sys
from pathlib import Path

from redis import Redis


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from bus.config import KAFKA_BROKER, REDIS_URL
from bus.kafka.dead_letter import DeadLetterQueue
from bus.kafka.producer import NexusProducer
from bus.models.message import NexusMessage


def main() -> None:
    producer = NexusProducer(KAFKA_BROKER)
    redis_client = Redis.from_url(REDIS_URL)
    try:
        dlq = DeadLetterQueue(redis_client, producer)
        message = NexusMessage(
            correlation_id="run_dlq_test",
            topic="nexus.research",
            sender_agent="test-agent",
            payload={"test": "dead letter payload"},
        )
        record = dlq.send(message, "test failure", retry_count=3)
        print(record["id"])
    finally:
        producer.close()
        redis_client.close()


if __name__ == "__main__":
    main()
