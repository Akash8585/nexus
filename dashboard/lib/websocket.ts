export type WebSocketEventType =
  | "connected"
  | "message.published"
  | "agent.registered"
  | "agent.heartbeat"
  | "agent.dead"
  | "pipeline.started"
  | "pipeline.completed"
  | "pipeline.failed"
  | "error"
  | "ping"
  | "disconnected"
  | "reconnecting";

export type WebSocketHandler = (data?: unknown) => void;

export class NexusWebSocket {
  private ws: WebSocket | null = null;
  private handlers: Map<string, WebSocketHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private token: string;
  private url: string;
  private shouldReconnect = true;
  private reconnectTimer: number | null = null;

  constructor(url: string, token: string) {
    this.url = url;
    this.token = token;
  }

  connect() {
    if (!this.url || !this.token || this.isConnected()) {
      return;
    }

    this.shouldReconnect = true;
    this.ws = new WebSocket(`${this.url}?token=${encodeURIComponent(this.token)}`);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.emit("connected");
      console.log("WebSocket connected");
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as {
          event?: string;
          data?: unknown;
          timestamp?: string;
        };

        if (parsed.event === "ping") {
          return;
        }

        if (parsed.event) {
          this.emit(parsed.event, parsed.data);
        }
      } catch (error) {
        this.emit("error", error);
      }
    };

    this.ws.onclose = () => {
      this.ws = null;
      this.emit("disconnected");
      if (
        this.shouldReconnect &&
        this.reconnectAttempts < this.maxReconnectAttempts
      ) {
        this.reconnectAttempts += 1;
        this.emit("reconnecting", {
          attempt: this.reconnectAttempts,
          max: this.maxReconnectAttempts,
        });
        console.log(`Reconnecting... attempt ${this.reconnectAttempts}`);
        this.reconnectTimer = window.setTimeout(() => {
          this.connect();
        }, this.reconnectDelay);
      }
    };

    this.ws.onerror = (event) => {
      this.emit("error", event);
      console.error("WebSocket error", event);
    };
  }

  on(eventType: string, callback: WebSocketHandler) {
    const handlers = this.handlers.get(eventType) || [];
    handlers.push(callback);
    this.handlers.set(eventType, handlers);

    return () => this.off(eventType, callback);
  }

  off(eventType: string, callback: WebSocketHandler) {
    const handlers = this.handlers.get(eventType) || [];
    this.handlers.set(
      eventType,
      handlers.filter((handler) => handler !== callback),
    );
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  getMaxReconnectAttempts(): number {
    return this.maxReconnectAttempts;
  }

  send(data: object) {
    if (this.isConnected()) {
      this.ws?.send(JSON.stringify(data));
    }
  }

  private emit(eventType: string, data?: unknown) {
    const handlers = this.handlers.get(eventType) || [];
    handlers.forEach((handler) => handler(data));
  }
}
