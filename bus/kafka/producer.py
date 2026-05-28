import json
import sys
from pathlib import Path
from typing import Any


def _load_kafka_python() -> tuple[type, type, type]:
    saved_modules = {
        name: module
        for name, module in sys.modules.items()
        if name == "kafka" or name.startswith("kafka.")
    }
    bus_dir = str(Path(__file__).resolve().parents[1])
    original_path = list(sys.path)

    try:
        for name in list(saved_modules):
            sys.modules.pop(name, None)
        sys.path = [path for path in sys.path if str(Path(path or ".").resolve()) != bus_dir]

        from kafka import KafkaProducer
        from kafka.errors import KafkaError, NoBrokersAvailable

        return KafkaProducer, KafkaError, NoBrokersAvailable
    finally:
        for name in list(sys.modules):
            if name == "kafka" or name.startswith("kafka."):
                sys.modules.pop(name, None)
        sys.modules.update(saved_modules)
        sys.path = original_path


class NexusProducer:
    def __init__(self, broker: str) -> None:
        self.broker = broker
        self.producer: Any | None = None
        kafka_producer, kafka_error, no_brokers_available = _load_kafka_python()

        try:
            self.producer = kafka_producer(
                bootstrap_servers=broker,
                value_serializer=lambda value: json.dumps(value).encode("utf-8"),
                retries=3,
            )
        except no_brokers_available as exc:
            raise ConnectionError(f"Kafka broker is not available at {broker}") from exc
        except kafka_error as exc:
            raise RuntimeError(f"Failed to connect Kafka producer to {broker}") from exc

    def publish(self, topic: str, message_dict: dict[str, Any]) -> None:
        if self.producer is None:
            raise RuntimeError("Kafka producer is not connected")

        _, kafka_error, _ = _load_kafka_python()

        try:
            future = self.producer.send(topic, value=message_dict)
            future.get(timeout=10)
            self.producer.flush()
        except TypeError as exc:
            raise ValueError("Message must be JSON serialisable") from exc
        except kafka_error as exc:
            raise RuntimeError(f"Failed to publish message to topic '{topic}'") from exc

    def close(self) -> None:
        if self.producer is None:
            return

        _, kafka_error, _ = _load_kafka_python()

        try:
            self.producer.flush()
            self.producer.close(timeout=10)
        except kafka_error as exc:
            raise RuntimeError("Failed to close Kafka producer cleanly") from exc
        finally:
            self.producer = None
