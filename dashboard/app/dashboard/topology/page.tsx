"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { AgentDetailPanel } from "@/components/AgentDetailPanel";
import {
  TopologyGraph,
  type Agent,
  type Message,
} from "@/components/TopologyGraph";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { getToken, isAdmin } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const agentTypes = ["all", "researcher", "analyst", "writer", "deliverer", "monitor"];

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}`);
  }

  return response.json() as Promise<T>;
}

function relativeTime(timestamp: string) {
  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
  );
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function statusColor(status: Agent["status"]) {
  if (status === "active") return "bg-[#22c55e]";
  if (status === "dead") return "bg-[#ef4444]";
  if (status === "deregistered") return "bg-[#374151]";
  return "bg-[#6b7280]";
}

export default function TopologyPage() {
  const { on } = useWebSocketContext();
  const pausedRef = useRef(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [agentTypeFilter, setAgentTypeFilter] = useState("all");
  const [liveMessage, setLiveMessage] = useState<Message | null>(null);
  const [resetVersion, setResetVersion] = useState(0);
  const [canAdmin, setCanAdmin] = useState(false);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanAdmin(isAdmin());
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const refreshData = useCallback(async () => {
    const [agentData, messageData] = await Promise.all([
      fetchJson<Agent[]>("/agents"),
      fetchJson<Message[]>("/messages?limit=300"),
    ]);
    setAgents(agentData);
    setMessages(messageData);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshData().catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshData]);

  useEffect(() => {
    const unsubscribers = [
      on("agent.registered", (data) => {
        if (pausedRef.current) {
          return;
        }
        const agent = data as Agent;
        setAgents((current) => {
          const next = current.filter((item) => item.name !== agent.name);
          return [...next, agent];
        });
      }),
      on("agent.dead", (data) => {
        if (pausedRef.current) {
          return;
        }
        const deadAgent = data as { name: string };
        setAgents((current) =>
          current.map((agent) =>
            agent.name === deadAgent.name ? { ...agent, status: "dead" } : agent,
          ),
        );
      }),
      on("agent.heartbeat", (data) => {
        if (pausedRef.current) {
          return;
        }
        const heartbeat = data as { name: string; timestamp: string };
        setAgents((current) =>
          current.map((agent) =>
            agent.name === heartbeat.name
              ? {
                  ...agent,
                  status: "active",
                  last_heartbeat: heartbeat.timestamp,
                }
              : agent,
          ),
        );
      }),
      on("message.published", (data) => {
        if (pausedRef.current) {
          return;
        }
        const message = data as Message;
        setMessages((current) => [message, ...current].slice(0, 300));
        setLiveMessage(message);
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [on]);

  function clearGraph() {
    setMessages([]);
    setLiveMessage(null);
    setResetVersion((current) => current + 1);
  }

  async function clearDeadAgents() {
    if (!canAdmin) {
      return;
    }
    const staleAgents = agents.filter(
      (agent) => agent.status === "dead" || agent.status === "deregistered",
    );
    if (staleAgents.length === 0) {
      return;
    }
    if (!window.confirm("Remove all dead agents?")) {
      return;
    }

    await Promise.all(
      staleAgents.map((agent) =>
        fetch(`${API_URL}/agents/${encodeURIComponent(agent.name)}`, {
          method: "DELETE",
          headers: authHeaders(),
        }),
      ),
    );
    await refreshData();
    setSelectedAgent(null);
  }

  const activeAgents = useMemo(
    () => agents.filter((agent) => agent.status === "active"),
    [agents],
  );

  return (
    <div className="flex h-[calc(100vh-112px)] min-h-[720px] flex-col gap-4">
      <div className="flex flex-col justify-between gap-4 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Topology</h1>
          <p className="mt-1 text-sm text-[#8b949e]">
            Live force graph of agents, topics, and message movement.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={isPaused ? "primary" : "secondary"}
            onClick={() => setIsPaused((current) => !current)}
          >
            {isPaused ? "Resume" : "Pause"}
          </Button>
          <label className="flex items-center gap-2 text-sm text-[#bdbdbd]">
            Agent type
            <select
              value={agentTypeFilter}
              onChange={(event) => setAgentTypeFilter(event.target.value)}
              className="h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 text-sm text-[#f2f2f2] outline-none focus:border-[#00d992]"
            >
              {agentTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All" : type}
                </option>
              ))}
            </select>
          </label>
          <Button type="button" variant="secondary" onClick={clearGraph}>
            Clear
          </Button>
          {canAdmin ? (
            <Button type="button" variant="danger" onClick={clearDeadAgents}>
              Clear dead agents
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[3fr_1fr]">
        <section className="min-h-0">
          <TopologyGraph
            agents={agents}
            messages={messages}
            isPaused={isPaused}
            agentTypeFilter={agentTypeFilter}
            liveMessage={liveMessage}
            resetVersion={resetVersion}
            onAgentClick={setSelectedAgent}
          />
        </section>

        <aside className="min-h-0 rounded-[8px] border border-[#3d3a39] bg-[#101010]">
          <div className="flex items-center justify-between border-b border-[#3d3a39] p-4">
            <h2 className="text-lg font-semibold text-white">Active Agents</h2>
            <Badge tone="active">{activeAgents.length}</Badge>
          </div>
          <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-3">
            {agents.length === 0 ? (
              <div className="flex h-48 items-center justify-center rounded-[8px] border border-dashed border-[#3d3a39] bg-[#1a1a1a] text-sm text-[#8b949e]">
                No agents connected
              </div>
            ) : (
              <div className="space-y-2">
                {agents.map((agent) => (
                  <button
                    key={agent.name}
                    type="button"
                    onClick={() => setSelectedAgent(agent)}
                    className="w-full rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-3 text-left transition hover:border-[#00d992]"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${statusColor(
                          agent.status,
                        )}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">
                          {agent.name}
                        </p>
                        <p className="mt-1 text-xs text-[#8b949e]">
                          {agent.agent_type}
                        </p>
                        <p className="mt-2 text-xs text-[#bdbdbd]">
                          Last heartbeat: {relativeTime(agent.last_heartbeat)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>

      <AgentDetailPanel
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}
