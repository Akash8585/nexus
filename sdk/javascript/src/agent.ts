import axios, { type AxiosInstance, isAxiosError } from "axios";

import { ContextClient } from "./context";
import {
  NexusAuthError,
  NexusConnectionError,
  NexusConsumeError,
  NexusPublishError,
} from "./errors";

export interface NexusAgentOptions {
  name: string;
  agentType: string;
  subscribeTopic: string;
  nexusUrl: string;
  apiKey: string;
  heartbeatIntervalMs?: number;
  pollIntervalMs?: number;
  httpClient?: AxiosInstance;
}

export type NexusMessage = {
  id: string;
  topic: string;
  correlation_id: string;
  sender_agent: string;
  payload: Record<string, unknown>;
  timestamp?: string;
};

export type MessageHandler = (message: NexusMessage) => void | Promise<void>;

export class NexusAgent {
  readonly name: string;
  readonly agentType: string;
  readonly subscribeTopic: string;
  readonly nexusUrl: string;
  readonly context: ContextClient;

  private readonly apiKey: string;
  private readonly client: AxiosInstance;
  private readonly heartbeatIntervalMs: number;
  private readonly pollIntervalMs: number;

  private running = false;
  private messageHandler: MessageHandler | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private readonly seenIds = new Set<string>();

  constructor(options: NexusAgentOptions) {
    this.name = options.name;
    this.agentType = options.agentType;
    this.subscribeTopic = options.subscribeTopic;
    this.nexusUrl = options.nexusUrl.replace(/\/$/, "");
    this.apiKey = options.apiKey;
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 10_000;
    this.pollIntervalMs = options.pollIntervalMs ?? 3_000;

    this.client =
      options.httpClient ??
      axios.create({
        baseURL: this.nexusUrl,
        timeout: 30_000,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

    this.context = new ContextClient(
      this.client,
      `${this.nexusUrl}/api/v1/context`,
    );
  }

  async register(): Promise<void> {
    try {
      const response = await this.client.post("/api/v1/agents/register", {
        name: this.name,
        agent_type: this.agentType,
        subscribe_topics: [this.subscribeTopic],
      });

      if (response.status === 409) {
        return;
      }
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new NexusAuthError();
        }
        throw new NexusConnectionError(
          `Failed to connect to Nexus at ${this.nexusUrl}`,
        );
      }
      throw error;
    }
  }

  async deregister(): Promise<void> {
    try {
      const response = await this.client.delete(`/api/v1/agents/${this.name}`);
      if (![200, 401, 403, 404].includes(response.status)) {
        throw new NexusConnectionError(
          `Failed to deregister agent '${this.name}'`,
        );
      }
    } catch (error) {
      if (isAxiosError(error)) {
        const status = error.response?.status;
        if (status && [401, 403, 404].includes(status)) {
          return;
        }
        throw new NexusConnectionError(
          `Failed to deregister agent '${this.name}'`,
        );
      }
      throw error;
    }
  }

  async publish(
    topic: string,
    payload: Record<string, unknown>,
    correlationId: string,
  ): Promise<NexusMessage> {
    try {
      const response = await this.client.post("/api/v1/messages/publish", {
        topic,
        correlation_id: correlationId,
        sender_agent: this.name,
        payload,
      });
      return response.data;
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new NexusAuthError();
        }
        throw new NexusPublishError(
          `Publish to '${topic}' failed with status ${error.response?.status ?? "unknown"}`,
        );
      }
      throw error;
    }
  }

  onMessage(handler: MessageHandler): void {
    this.messageHandler = handler;
  }

  async start(options?: { skipExisting?: boolean }): Promise<void> {
    if (this.running) {
      return;
    }

    this.running = true;
    await this.register();

    this.heartbeatTimer = setInterval(() => {
      void this.sendHeartbeat();
    }, this.heartbeatIntervalMs);

    if (this.messageHandler) {
      if (options?.skipExisting) {
        await this.markExistingSeen();
      }
      this.pollTimer = setInterval(() => {
        void this.pollMessages();
      }, this.pollIntervalMs);
    }
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    try {
      await this.deregister();
    } catch (error) {
      if (!(error instanceof NexusConnectionError)) {
        throw error;
      }
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.running) {
      return;
    }

    try {
      await this.client.post(`/api/v1/agents/${this.name}/heartbeat`);
    } catch {
      // Heartbeat failures are non-fatal.
    }
  }

  private async markExistingSeen(): Promise<void> {
    try {
      const messages = await this.fetchMessages(100);
      for (const message of messages) {
        if (message.id) {
          this.seenIds.add(message.id);
        }
      }
    } catch {
      // Ignore seed failures during startup.
    }
  }

  private async pollMessages(): Promise<void> {
    if (!this.running || !this.messageHandler) {
      return;
    }

    try {
      const messages = await this.fetchMessages(10);
      for (const message of messages) {
        if (!message.id || this.seenIds.has(message.id)) {
          continue;
        }
        this.seenIds.add(message.id);
        await this.messageHandler(message);
      }
    } catch (error) {
      if (error instanceof NexusConsumeError) {
        return;
      }
      throw error;
    }
  }

  private async fetchMessages(limit: number): Promise<NexusMessage[]> {
    try {
      const response = await this.client.get("/api/v1/messages", {
        params: {
          topic: this.subscribeTopic,
          limit,
        },
      });
      return Array.isArray(response.data) ? response.data : [];
    } catch (error) {
      if (isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new NexusAuthError();
        }
        throw new NexusConsumeError(
          `Message fetch failed with status ${error.response?.status ?? "unknown"}`,
        );
      }
      throw error;
    }
  }
}
