import sys
from pathlib import Path
from typing import Any


def _load_kafka_python() -> tuple[type, type, type, type, type]:
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

        from kafka.admin import KafkaAdminClient, NewTopic
        from kafka.errors import (
            KafkaError,
            NoBrokersAvailable,
            TopicAlreadyExistsError,
        )

        return (
            KafkaAdminClient,
            NewTopic,
            KafkaError,
            NoBrokersAvailable,
            TopicAlreadyExistsError,
        )
    finally:
        for name in list(sys.modules):
            if name == "kafka" or name.startswith("kafka."):
                sys.modules.pop(name, None)
        sys.modules.update(saved_modules)
        sys.path = original_path


class TopicManager:
    def __init__(self, broker: str) -> None:
        self.broker = broker
        self.admin_client: Any | None = None
        kafka_admin_client, _, kafka_error, no_brokers_available, _ = _load_kafka_python()

        try:
            self.admin_client = kafka_admin_client(
                bootstrap_servers=broker,
                client_id="nexus-topic-manager",
            )
        except no_brokers_available as exc:
            raise ConnectionError(f"Kafka broker is not available at {broker}") from exc
        except kafka_error as exc:
            raise RuntimeError(f"Failed to connect Kafka admin client to {broker}") from exc

    def create_topic(
        self,
        name: str,
        partitions: int = 1,
        replication_factor: int = 1,
    ) -> None:
        if self.admin_client is None:
            raise RuntimeError("Kafka admin client is not connected")

        _, new_topic, kafka_error, _, topic_already_exists = _load_kafka_python()
        topic = new_topic(
            name=name,
            num_partitions=partitions,
            replication_factor=replication_factor,
        )

        try:
            self.admin_client.create_topics([topic], validate_only=False)
        except topic_already_exists:
            return
        except kafka_error as exc:
            raise RuntimeError(f"Failed to create Kafka topic '{name}'") from exc

    def delete_topic(self, name: str) -> None:
        if self.admin_client is None:
            raise RuntimeError("Kafka admin client is not connected")

        _, _, kafka_error, _, _ = _load_kafka_python()

        try:
            self.admin_client.delete_topics([name])
        except kafka_error as exc:
            raise RuntimeError(f"Failed to delete Kafka topic '{name}'") from exc

    def list_topics(self) -> list[str]:
        if self.admin_client is None:
            raise RuntimeError("Kafka admin client is not connected")

        _, _, kafka_error, _, _ = _load_kafka_python()

        try:
            return sorted(self.admin_client.list_topics())
        except kafka_error as exc:
            raise RuntimeError("Failed to list Kafka topics") from exc

    def topic_exists(self, name: str) -> bool:
        try:
            return name in self.list_topics()
        except RuntimeError as exc:
            raise RuntimeError(f"Failed to check Kafka topic '{name}'") from exc
