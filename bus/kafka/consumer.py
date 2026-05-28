import json
import os
import sys
from pathlib import Path
from threading import Event
from typing import Any, Callable


MessageCallback = Callable[[dict[str, Any]], None]


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

        from kafka import KafkaConsumer
        from kafka.errors import KafkaError, NoBrokersAvailable

        return KafkaConsumer, KafkaError, NoBrokersAvailable
    finally:
        for name in list(sys.modules):
            if name == "kafka" or name.startswith("kafka."):
                sys.modules.pop(name, None)
        sys.modules.update(saved_modules)
        sys.path = original_path


class NexusConsumer:
    def __init__(self, topic: str, group_id: str, callback: MessageCallback) -> None:
        self.topic = topic
        self.group_id = group_id
        self.callback = callback
        self._stop_event = Event()
        self.consumer: Any | None = None
        broker = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
        kafka_consumer, kafka_error, no_brokers_available = _load_kafka_python()

        try:
            self.consumer = kafka_consumer(
                topic,
                bootstrap_servers=broker,
                group_id=group_id,
                auto_offset_reset="earliest",
                enable_auto_commit=True,
            )
        except no_brokers_available as exc:
            raise ConnectionError(f"Kafka broker is not available at {broker}") from exc
        except kafka_error as exc:
            raise RuntimeError(f"Failed to connect Kafka consumer to {broker}") from exc

    def start(self) -> None:
        if self.consumer is None:
            raise RuntimeError("Kafka consumer is not connected")

        _, kafka_error, _ = _load_kafka_python()

        while not self._stop_event.is_set():
            try:
                records = self.consumer.poll(timeout_ms=1000)
                for messages in records.values():
                    for message in messages:
                        try:
                            payload = json.loads(message.value.decode("utf-8"))
                            self.callback(payload)
                        except json.JSONDecodeError as exc:
                            print(f"Invalid JSON on topic '{self.topic}': {exc}")
                        except Exception as exc:
                            print(f"Consumer callback failed for topic '{self.topic}': {exc}")
            except kafka_error as exc:
                print(f"Kafka consumer error on topic '{self.topic}': {exc}")

    def stop(self) -> None:
        self._stop_event.set()

        if self.consumer is None:
            return

        _, kafka_error, _ = _load_kafka_python()

        try:
            self.consumer.close()
        except kafka_error as exc:
            raise RuntimeError("Failed to close Kafka consumer cleanly") from exc
        finally:
            self.consumer = None
