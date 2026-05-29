class NexusError(Exception):
    """Base exception for Nexus SDK errors."""


class NexusAuthError(NexusError):
    """Raised when the API key is invalid or unauthorized."""


class NexusConnectionError(NexusError):
    """Raised when the SDK cannot connect to the Nexus bus API."""


class NexusPublishError(NexusError):
    """Raised when publishing a message to the bus fails."""


class NexusConsumeError(NexusError):
    """Raised when consuming messages from the bus fails."""
