from .topics import TopicManager


DEFAULT_TOPICS = [
    "nexus.research",
    "nexus.analysis",
    "nexus.writing",
    "nexus.delivery",
    "nexus.deadletter",
    "nexus.heartbeat",
]


def create_default_topics(broker: str) -> None:
    try:
        manager = TopicManager(broker)
        for topic in DEFAULT_TOPICS:
            manager.create_topic(topic)
    except Exception as exc:
        print(f"Kafka default topic setup skipped: {exc}")
