import type { AxiosInstance } from "axios";

import {
  NexusAuthError,
  NexusConnectionError,
} from "./errors";

export class ContextClient {
  constructor(
    private readonly client: AxiosInstance,
    private readonly apiBase: string,
  ) {}

  async get<T = unknown>(
    correlationId: string,
    key: string,
  ): Promise<T | null> {
    try {
      const response = await this.client.get(
        `${this.apiBase}/${correlationId}/${key}`,
      );
      return response.data as T;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      if (isAxiosError(error) && error.response?.status === 401) {
        throw new NexusAuthError();
      }
      throw new NexusConnectionError(
        `Failed to read context key '${key}' for '${correlationId}'`,
      );
    }
  }

  async set(
    correlationId: string,
    key: string,
    value: unknown,
    ttlHours = 24,
  ): Promise<{ status: string; key: string }> {
    try {
      const response = await this.client.put(
        `${this.apiBase}/${correlationId}/${key}`,
        { value, ttl_hours: ttlHours },
      );
      return response.data;
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        throw new NexusAuthError();
      }
      throw new NexusConnectionError(
        `Failed to write context key '${key}' for '${correlationId}'`,
      );
    }
  }

  async getAll(correlationId: string): Promise<Record<string, unknown>> {
    try {
      const response = await this.client.get(`${this.apiBase}/${correlationId}`);
      return response.data ?? {};
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 401) {
        throw new NexusAuthError();
      }
      throw new NexusConnectionError(
        `Failed to read context for '${correlationId}'`,
      );
    }
  }
}

function isAxiosError(
  error: unknown,
): error is { response?: { status?: number } } {
  return typeof error === "object" && error !== null && "response" in error;
}
