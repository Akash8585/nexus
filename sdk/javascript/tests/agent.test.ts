import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NexusAgent } from "../src/agent";
import { ContextClient } from "../src/context";
import {
  NexusAuthError,
  NexusPublishError,
} from "../src/errors";

const NEXUS_URL = "http://localhost:8000";
const API_KEY = "nxs_live_sk_testkey1234567890abcdefghij";

function createAgent(overrides: Partial<ConstructorParameters<typeof NexusAgent>[0]> = {}) {
  const client = axios.create({
    baseURL: NEXUS_URL,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
  });

  const agent = new NexusAgent({
    name: "writer-agent",
    agentType: "writer",
    subscribeTopic: "nexus.analysis",
    nexusUrl: NEXUS_URL,
    apiKey: API_KEY,
    httpClient: client,
    ...overrides,
  });

  const mock = new MockAdapter(client);
  return { agent, mock, client };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NexusAgent", () => {
  it("registers successfully with a valid API key", async () => {
    const { agent, mock } = createAgent();
    mock.onPost("/api/v1/agents/register").reply(200, {
      name: "writer-agent",
      agent_type: "writer",
      status: "active",
    });

    await expect(agent.register()).resolves.toBeUndefined();
  });

  it("fails registration with an invalid API key", async () => {
    const { agent, mock } = createAgent();
    mock.onPost("/api/v1/agents/register").reply(401, { detail: "Invalid API key" });

    await expect(agent.register()).rejects.toBeInstanceOf(NexusAuthError);
  });

  it("publishes a message successfully", async () => {
    const { agent, mock } = createAgent();
    mock.onPost("/api/v1/messages/publish").reply(200, {
      id: "msg-1",
      topic: "nexus.writing",
      correlation_id: "run_test",
      sender_agent: "writer-agent",
      payload: { status: "done" },
    });

    const result = await agent.publish("nexus.writing", { status: "done" }, "run_test");
    expect(result.id).toBe("msg-1");
  });

  it("raises NexusPublishError when publish fails", async () => {
    const { agent, mock } = createAgent();
    mock.onPost("/api/v1/messages/publish").reply(400, { detail: "Topic missing" });

    await expect(
      agent.publish("nexus.missing", {}, "run_test"),
    ).rejects.toBeInstanceOf(NexusPublishError);
  });

  it("deregisters on stop", async () => {
    const { agent, mock } = createAgent();
    const calls: string[] = [];

    mock.onPost("/api/v1/agents/register").reply((config) => {
      calls.push("register");
      return [200, { name: "writer-agent" }];
    });
    mock.onDelete("/api/v1/agents/writer-agent").reply((config) => {
      calls.push("deregister");
      return [200, { message: "ok" }];
    });
    mock.onPost("/api/v1/agents/writer-agent/heartbeat").reply(200, { status: "ok" });
    mock.onGet("/api/v1/messages").reply(200, []);

    agent.onMessage(() => undefined);
    await agent.start({ skipExisting: true });
    await agent.stop();

    expect(calls).toContain("register");
    expect(calls).toContain("deregister");
  });

  it("stores an onMessage handler", () => {
    const { agent } = createAgent();
    const handler = vi.fn();
    agent.onMessage(handler);
    expect(handler).toBeTypeOf("function");
  });
});

describe("ContextClient", () => {
  it("reads and writes context values", async () => {
    const client = axios.create({ baseURL: NEXUS_URL });
    const mock = new MockAdapter(client);
    const context = new ContextClient(client, `${NEXUS_URL}/api/v1/context`);

    mock
      .onGet("/api/v1/context/run_1/top5")
      .reply(200, { stories: [1, 2, 3] });
    mock.onPut("/api/v1/context/run_1/top5").reply(200, {
      status: "ok",
      key: "top5",
    });

    await expect(context.get("run_1", "top5")).resolves.toEqual({
      stories: [1, 2, 3],
    });
    await expect(context.set("run_1", "top5", { stories: [] })).resolves.toEqual({
      status: "ok",
      key: "top5",
    });
  });

  it("returns null for missing context keys", async () => {
    const client = axios.create({ baseURL: NEXUS_URL });
    const mock = new MockAdapter(client);
    const context = new ContextClient(client, `${NEXUS_URL}/api/v1/context`);

    mock.onGet("/api/v1/context/run_1/missing").reply(404, { detail: "not found" });

    await expect(context.get("run_1", "missing")).resolves.toBeNull();
  });
});
