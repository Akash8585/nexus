from typing import Any

import httpx

from nexus_bus.exceptions import NexusAuthError, NexusConnectionError


class ContextClient:
    """HTTP client for the Nexus shared context store."""

    def __init__(self, client: httpx.Client, nexus_url: str) -> None:
        self._client = client
        self._api_base = f"{nexus_url.rstrip('/')}/api/v1/context"

    def get(self, correlation_id: str, key: str) -> Any | None:
        try:
            response = self._client.get(f"{self._api_base}/{correlation_id}/{key}")
        except httpx.HTTPError as exc:
            raise NexusConnectionError(
                f"Failed to read context key '{key}' for '{correlation_id}'"
            ) from exc

        if response.status_code == 404:
            return None
        if response.status_code == 401:
            raise NexusAuthError("Invalid API key for context read")
        if not response.is_success:
            raise NexusConnectionError(
                f"Context read failed with status {response.status_code}"
            )

        return response.json()

    def set(
        self,
        correlation_id: str,
        key: str,
        value: Any,
        ttl_hours: int = 24,
    ) -> dict[str, str]:
        try:
            response = self._client.put(
                f"{self._api_base}/{correlation_id}/{key}",
                json={"value": value, "ttl_hours": ttl_hours},
            )
        except httpx.HTTPError as exc:
            raise NexusConnectionError(
                f"Failed to write context key '{key}' for '{correlation_id}'"
            ) from exc

        if response.status_code == 401:
            raise NexusAuthError("Invalid API key for context write")
        if not response.is_success:
            raise NexusConnectionError(
                f"Context write failed with status {response.status_code}"
            )

        return response.json()

    def get_all(self, correlation_id: str) -> dict[str, Any]:
        try:
            response = self._client.get(f"{self._api_base}/{correlation_id}")
        except httpx.HTTPError as exc:
            raise NexusConnectionError(
                f"Failed to read context for '{correlation_id}'"
            ) from exc

        if response.status_code == 401:
            raise NexusAuthError("Invalid API key for context read")
        if not response.is_success:
            raise NexusConnectionError(
                f"Context read failed with status {response.status_code}"
            )

        data = response.json()
        return data if isinstance(data, dict) else {}
