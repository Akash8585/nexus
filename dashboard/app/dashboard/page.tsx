"use client";

import {
  Activity,
  AlertCircle,
  Bot,
  MessageSquare,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { MetricCard } from "@/components/MetricCard";
import {
  MiniTopology,
  type Agent,
  type NexusMessage,
} from "@/components/MiniTopology";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { getToken } from "@/lib/auth";

type PipelineRun = {
  correlation_id: string;
  trigger_input: string;
  status: "running" | "completed" | "failed";
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  message_count: number;
  messages?: string[];
  agent_names?: string[];
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

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

function isToday(timestamp: string) {
  const date = new Date(timestamp);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function relativeTime(timestamp: string) {
  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
  );

  if (diffSeconds < 60) {
    return `${diffSeconds}s ago`;
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)} mins ago`;
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)} hrs ago`;
  }
  return `${Math.floor(diffSeconds / 86400)} days ago`;
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "Running";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${Math.round(durationMs / 1000)}s`;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
}

function topicTone(topic: string) {
  if (topic.includes("research")) return "research";
  if (topic.includes("analysis")) return "analysis";
  if (topic.includes("writing")) return "writing";
  if (topic.includes("delivery")) return "delivery";
  return "default";
}

function statusTone(status: PipelineRun["status"]) {
  if (status === "completed") return "active";
  if (status === "failed") return "dead";
  return "idle";
}

export default function DashboardPage() {
  const router = useRouter();
  const { on } = useWebSocketContext();
  const feedRef = useRef<HTMLDivElement | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeAgents, setActiveAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<NexusMessage[]>([]);
  const [messagesToday, setMessagesToday] = useState(0);
  const [pipelines, setPipelines] = useState<PipelineRun[]>([]);
  const [failedRuns, setFailedRuns] = useState<PipelineRun[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function refreshDashboard() {
    const [allAgents, active, allMessages, recentPipelines, failed] =
      await Promise.all([
        fetchJson<Agent[]>("/agents"),
        fetchJson<Agent[]>("/agents?status=active"),
        fetchJson<NexusMessage[]>("/messages?limit=1000"),
        fetchJson<PipelineRun[]>("/pipelines?limit=10"),
        fetchJson<PipelineRun[]>("/pipelines?status=failed"),
      ]);

    setAgents(allAgents);
    setActiveAgents(active);
    setMessages(allMessages.slice(0, 20));
    setMessagesToday(allMessages.filter((message) => isToday(message.timestamp)).length);
    setPipelines(recentPipelines);
    setFailedRuns(failed);
    setLastRefresh(new Date());
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      refreshDashboard().catch(() => undefined);
    }, 0);
    const intervalId = window.setInterval(() => {
      refreshDashboard().catch(() => undefined);
    }, 30000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    const unsubscribers = [
      on("message.published", (data) => {
        const message = data as NexusMessage;
        setMessages((current) => [message, ...current].slice(0, 20));
        if (isToday(message.timestamp)) {
          setMessagesToday((current) => current + 1);
        }
      }),
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
      on("pipeline.started", (data) => {
        const pipeline = data as { correlation_id: string; trigger_input: string };
        const run: PipelineRun = {
          correlation_id: pipeline.correlation_id,
          trigger_input: pipeline.trigger_input,
          status: "running",
          started_at: new Date().toISOString(),
          ended_at: null,
          duration_ms: null,
          message_count: 0,
        };
        setPipelines((current) =>
          [run, ...current].slice(0, 10),
        );
      }),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [on]);

  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [messages]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-semibold text-white">Overview</h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          {lastRefresh
            ? `Last refreshed ${relativeTime(lastRefresh.toISOString())}`
            : "Loading live system state"}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Total Agents"
          value={agents.length}
          subtitle="registered"
          icon={Bot}
        />
        <MetricCard
          title="Active Now"
          value={activeAgents.length}
          subtitle="currently running"
          icon={Activity}
        />
        <MetricCard
          title="Messages Today"
          value={messagesToday}
          subtitle="published today"
          icon={MessageSquare}
        />
        <MetricCard
          title="Failed Runs"
          value={failedRuns.length}
          subtitle="need attention"
          icon={AlertCircle}
          danger={failedRuns.length > 0}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Mini Topology</h2>
            <p className="mt-1 text-sm text-[#8b949e]">
              Live agent graph from registry and message flow
            </p>
          </div>
          <MiniTopology initialAgents={agents} initialMessages={messages} />
        </Card>

        <Card>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-white">Recent Messages</h2>
            <p className="mt-1 text-sm text-[#8b949e]">
              Last 20 published events
            </p>
          </div>
          <div ref={feedRef} className="max-h-[300px] overflow-y-auto pr-1">
            {messages.length === 0 ? (
              <div className="flex h-[220px] items-center justify-center rounded-[8px] border border-dashed border-[#3d3a39] bg-[#1a1a1a] text-sm text-[#8b949e]">
                Waiting for messages...
              </div>
            ) : (
              <div className="divide-y divide-[#3d3a39]">
                {messages.map((message) => (
                  <div key={message.id} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={topicTone(message.topic)}>
                        {message.topic}
                      </Badge>
                      <span className="shrink-0 text-xs text-[#8b949e]">
                        {relativeTime(message.timestamp)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {message.sender_agent}
                    </p>
                    <p className="mt-1 truncate font-mono text-xs leading-5 text-[#bdbdbd]">
                      {truncate(JSON.stringify(message.payload), 60)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </section>

      <Card>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Recent Pipeline Runs
          </h2>
          <p className="mt-1 text-sm text-[#8b949e]">
            Latest pipeline activity across all agents
          </p>
        </div>
        {pipelines.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-[#3d3a39] bg-[#1a1a1a] p-8 text-center text-sm text-[#8b949e]">
            No pipeline runs yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#3d3a39] bg-[#1a1a1a] text-xs uppercase text-[#8b949e]">
                <tr>
                  <th className="px-4 py-3 font-medium">Correlation ID</th>
                  <th className="px-4 py-3 font-medium">Trigger input</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Started</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Messages</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d3a39]">
                {pipelines.map((run) => (
                  <tr
                    key={run.correlation_id}
                    className="cursor-pointer transition hover:bg-[#1a1a1a]"
                    onClick={() =>
                      router.push(`/dashboard/pipelines/${run.correlation_id}`)
                    }
                  >
                    <td className="px-4 py-3 font-mono text-[#f5f6f7]">
                      {truncate(run.correlation_id, 16)}
                    </td>
                    <td className="px-4 py-3 text-[#bdbdbd]">
                      {truncate(run.trigger_input, 40)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(run.status)}>{run.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-[#8b949e]">
                      {relativeTime(run.started_at)}
                    </td>
                    <td className="px-4 py-3 text-[#bdbdbd]">
                      {formatDuration(run.duration_ms)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#f5f6f7]">
                      {run.message_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
