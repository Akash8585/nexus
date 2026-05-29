export class NexusError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NexusError";
  }
}

export class NexusAuthError extends NexusError {
  constructor(message = "Invalid or unauthorized API key") {
    super(message);
    this.name = "NexusAuthError";
  }
}

export class NexusConnectionError extends NexusError {
  constructor(message = "Failed to connect to Nexus") {
    super(message);
    this.name = "NexusConnectionError";
  }
}

export class NexusPublishError extends NexusError {
  constructor(message = "Failed to publish message") {
    super(message);
    this.name = "NexusPublishError";
  }
}

export class NexusConsumeError extends NexusError {
  constructor(message = "Failed to consume messages") {
    super(message);
    this.name = "NexusConsumeError";
  }
}
