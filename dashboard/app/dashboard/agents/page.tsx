"use client";

import { Bot } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AgentCard, type Agent } from "@/components/AgentCard";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { getToken, isAdmin } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const statusOptions = ["all", "active", "idle", "dead"];
const typeOptions = ["all", "researcher", "analyst", "writer", "deliverer", "monitor"];

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function statusRank(status: Agent["status"]) {
  if (status === "active") return 0;
  if (status === "idle") return 1;
  return 2;
}

function isDeadAgent(agent: Agent) {
  return agent.status === "dead" || agent.status === "deregistered";
}

function filterAgents(
  agents: Agent[],
  search: string,
  status: string,
  type: string,
) {
  const query = search.trim().toLowerCase();
  return agents
    .filter((agent) => {
      if (query && !agent.name.toLowerCase().includes(query)) return false;
      if (status !== "all" && agent.status !== status) return false;
      if (type !== "all" && agent.agent_type !== type) return false;
      return true;
    })
    .sort((a, b) => {
      const byStatus = statusRank(a.status) - statusRank(b.status);
      if (byStatus !== 0) return byStatus;
      return a.name.localeCompare(b.name);
    });
}

export default function AgentsPage() {
  const { on } = useWebSocketContext();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [canAdmin, setCanAdmin] = useState(false);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refreshAgents = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/agents`, {
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load agents");
      }

      setAgents(await response.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanAdmin(isAdmin());
      refreshAgents();
    }, 0);
    const intervalId = window.setInterval(() => {
      refreshAgents();
    }, 15000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [refreshAgents]);

  useEffect(() => {
    const unsubscribers = [
      on("agent.registered", (data) => {
        const agent = data as Agent;
        setAgents((current) => {
          const next = current.filter((item) => item.name !== agent.name);
          return [...next, agent];
        });
      }),
      on("agent.dead", (data) => {
        const deadAgent = data as { name: string };
        setAgents((current) =>
          current.map((agent) =>
            agent.name === deadAgent.name ? { ...agent, status: "dead" } : agent,
          ),
        );
      }),
      on("agent.heartbeat", (data) => {
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
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [on]);

  const filteredAgents = useMemo(
    () => filterAgents(agents, search, statusFilter, typeFilter),
    [agents, search, statusFilter, typeFilter],
  );
  const deadAgents = filteredAgents.filter(isDeadAgent);
  const liveAgents = filteredAgents.filter((agent) => !isDeadAgent(agent));

  async function deregisterAgent(name: string) {
    const response = await fetch(
      `${API_URL}/agents/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      setError(`Failed to deregister ${name}`);
      return;
    }

    setAgents((current) => current.filter((agent) => agent.name !== name));
    setToast(`${name} deregistered`);
    window.setTimeout(() => setToast(""), 2500);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">Agents</h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          Registered workers, heartbeats, subscriptions, and runtime health.
        </p>
      </header>

      <section className="grid gap-3 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr]">
        <label className="flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
          Search
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search agents..."
            className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none transition placeholder:text-[#8b949e] focus:border-[#00d992]"
          />
        </label>

        <label className="flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 text-sm text-[#f2f2f2] outline-none transition focus:border-[#00d992]"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "all" ? "All statuses" : status}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
          Type
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 text-sm text-[#f2f2f2] outline-none transition focus:border-[#00d992]"
          >
            {typeOptions.map((type) => (
              <option key={type} value={type}>
                {type === "all" ? "All types" : type}
              </option>
            ))}
          </select>
        </label>
      </section>

      {toast ? (
        <div className="rounded-[8px] border border-green-900 bg-green-950 px-4 py-3 text-sm text-green-300">
          {toast}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-[8px] border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-12 text-center text-sm text-[#8b949e]">
          Loading agents...
        </div>
      ) : agents.length === 0 ? (
        <div className="rounded-[8px] border border-dashed border-[#3d3a39] bg-[#101010] p-12 text-center">
          <Bot className="mx-auto h-10 w-10 text-[#00d992]" />
          <h2 className="mt-4 text-xl font-semibold text-white">
            No agents connected
          </h2>
          <p className="mt-2 text-sm text-[#8b949e]">
            Connect an agent using the Python or JavaScript SDK
          </p>
          <pre className="mx-auto mt-5 w-fit rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] px-4 py-3 font-mono text-sm text-[#f5f6f7]">
            pip install nexus-bus
          </pre>
        </div>
      ) : (
        <>
          {deadAgents.length > 0 ? (
            <section className="rounded-[8px] border border-red-900/80 bg-red-950/20">
              <div className="border-b border-red-900/80 px-5 py-4">
                <h2 className="text-lg font-semibold text-red-200">
                  Warning: Dead Agents ({deadAgents.length})
                </h2>
              </div>
              <div className="grid gap-4 p-5 xl:grid-cols-2">
                {deadAgents.map((agent) => (
                  <AgentCard
                    key={agent.name}
                    agent={agent}
                    isAdmin={canAdmin}
                    onDeregister={deregisterAgent}
                  />
                ))}
              </div>
            </section>
          ) : null}

          <section>
            {liveAgents.length === 0 && deadAgents.length === 0 ? (
              <div className="rounded-[8px] border border-dashed border-[#3d3a39] bg-[#101010] p-10 text-center text-sm text-[#8b949e]">
                No agents match the current filters
              </div>
            ) : null}
            {liveAgents.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                {liveAgents.map((agent) => (
                  <AgentCard
                    key={agent.name}
                    agent={agent}
                    isAdmin={canAdmin}
                    onDeregister={deregisterAgent}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}
