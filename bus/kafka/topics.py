import sys
import threading
from pathlib import Path
from typing import Any


_kafka_lock = threading.Lock()
_kafka_types: tuple[type, type, type, type, type] | None = None


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


def _get_kafka_types() -> tuple[type, type, type, type, type]:
    global _kafka_types
    if _kafka_types is not None:
        return _kafka_types

    with _kafka_lock:
        if _kafka_types is None:
            _kafka_types = _load_kafka_python()
        return _kafka_types


class TopicManager:
    def __init__(self, broker: str) -> None:
        self.broker = broker
        self.admin_client: Any | None = None
        self._admin_lock = threading.Lock()
        (
            kafka_admin_client,
            new_topic,
            kafka_error,
            no_brokers_available,
            topic_already_exists,
        ) = _get_kafka_types()
        self._new_topic = new_topic
        self._kafka_error = kafka_error
        self._topic_already_exists = topic_already_exists

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

        topic = self._new_topic(
            name=name,
            num_partitions=partitions,
            replication_factor=replication_factor,
        )

        with self._admin_lock:
            try:
                self.admin_client.create_topics([topic], validate_only=False)
            except self._topic_already_exists:
                return
            except self._kafka_error as exc:
                raise RuntimeError(f"Failed to create Kafka topic '{name}'") from exc

    def delete_topic(self, name: str) -> None:
        if self.admin_client is None:
            raise RuntimeError("Kafka admin client is not connected")

        with self._admin_lock:
            try:
                self.admin_client.delete_topics([name])
            except self._kafka_error as exc:
                raise RuntimeError(f"Failed to delete Kafka topic '{name}'") from exc

    def list_topics(self) -> list[str]:
        if self.admin_client is None:
            raise RuntimeError("Kafka admin client is not connected")

        with self._admin_lock:
            try:
                return sorted(self.admin_client.list_topics())
            except self._kafka_error as exc:
                raise RuntimeError("Failed to list Kafka topics") from exc

    def topic_exists(self, name: str) -> bool:
        try:
            return name in self.list_topics()
        except RuntimeError as exc:
            raise RuntimeError(f"Failed to check Kafka topic '{name}'") from exc
