"""Official Python SDK for the Nexus multi-agent coordination bus."""

from nexus_bus.agent import NexusAgent
from nexus_bus.context import ContextClient
from nexus_bus.exceptions import (
    NexusAuthError,
    NexusConnectionError,
    NexusConsumeError,
    NexusError,
    NexusPublishError,
)

__all__ = [
    "ContextClient",
    "NexusAgent",
    "NexusAuthError",
    "NexusConnectionError",
    "NexusConsumeError",
    "NexusError",
    "NexusPublishError",
]
__version__ = "0.1.0"
