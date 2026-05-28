import os


KAFKA_BROKER = os.getenv(
    "KAFKA_BROKER",
    os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092"),
)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
