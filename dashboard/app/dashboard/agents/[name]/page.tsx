"use client";

import {
  AlertCircle,
  ArrowLeft,
  Bot,
  Clock,
  Heart,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { type Agent } from "@/components/AgentCard";
import { AuthGuard } from "@/components/AuthGuard";
import { MessageDetailModal } from "@/components/MessageDetailModal";
import {
  type NexusMessage,
  shortTopic,
  topicTone,
} from "@/components/MessageRow";
import { MetricCard } from "@/components/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getToken, isAdmin } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const pageSize = 20;

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function relativeTime(timestamp: string, currentTime: number) {
  const diffSeconds = Math.max(
    0,
    Math.floor((currentTime - new Date(timestamp).getTime()) / 1000),
  );

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function formatUptime(timestamp: string, currentTime: number) {
  const diffSeconds = Math.max(
    0,
    Math.floor((currentTime - new Date(timestamp).getTime()) / 1000),
  );
  const days = Math.floor(diffSeconds / 86400);
  const hours = Math.floor((diffSeconds % 86400) / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${diffSeconds}s`;
}

function heartbeatSeconds(agent: Agent, currentTime: number) {
  return Math.max(
    0,
    Math.floor((currentTime - new Date(agent.last_heartbeat).getTime()) / 1000),
  );
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function statusTone(status: Agent["status"]) {
  if (status === "active") return "active";
  if (status === "dead") return "dead";
  return "idle";
}

function statusDot(status: Agent["status"]) {
  if (status === "active") return "bg-[#22c55e]";
  if (status === "dead") return "bg-[#ef4444]";
  return "bg-[#6b7280]";
}

function buildHourlyBucketData(timestamps: string[], currentTime: number) {
  const bucketCount = 8;
  const hourMs = 60 * 60 * 1000;

  return Array.from({ length: bucketCount }, (_, index) => {
    const hoursAgo = bucketCount - 1 - index;
    const bucketStart = currentTime - (hoursAgo + 1) * hourMs;
    const bucketEnd = currentTime - hoursAgo * hourMs;
    const value = timestamps.filter((timestamp) => {
      const ts = new Date(timestamp).getTime();
      return ts >= bucketStart && ts < bucketEnd;
    }).length;

    return {
      label: hoursAgo === 0 ? "Now" : `-${hoursAgo}h`,
      value,
    };
  });
}

type AgentError = {
  id: string;
  original_topic?: string;
  error?: string;
  retry_count?: number;
  failed_at?: string;
  original_message?: {
    correlation_id?: string;
    topic?: string;
  };
};

function ChartPanel({
  title,
  value,
  data,
  color,
  subtitle,
}: {
  title: string;
  value: number;
  data: { label: string; value: number }[];
  color: string;
  subtitle: string;
}) {
  return (
    <section className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <p className="mt-1 text-xs text-[#8b949e]">{subtitle}</p>
        </div>
        <span className="font-mono text-2xl font-semibold text-[#f5f6f7]">
          {value}
        </span>
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#3d3a39" strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke="#8b949e" fontSize={12} tickLine={false} />
            <YAxis stroke="#8b949e" fontSize={12} tickLine={false} width={32} />
            <Tooltip
              contentStyle={{
                background: "#101010",
                border: "1px solid #3d3a39",
                borderRadius: "8px",
                color: "#f2f2f2",
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ConfirmModal({
  agentName,
  onCancel,
  onConfirm,
}: {
  agentName: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section className="w-full max-w-md rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <h2 className="text-lg font-semibold text-white">Deregister Agent</h2>
        <p className="mt-3 text-sm leading-6 text-[#bdbdbd]">
          Deregister {agentName}? This cannot be undone.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Confirm Deregister
          </Button>
        </div>
      </section>
    </div>
  );
}

function AgentDetailContent() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const agentName = decodeURIComponent(params.name);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [messages, setMessages] = useState<NexusMessage[]>([]);
  const [errors, setErrors] = useState<AgentError[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<NexusMessage | null>(null);
  const [canAdmin, setCanAdmin] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [page, setPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchAgentDetails = useCallback(async () => {
    try {
      const [agentResponse, messagesResponse, errorsResponse] = await Promise.all([
        fetch(`${API_URL}/agents/${encodeURIComponent(agentName)}`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch(`${API_URL}/messages?agent=${encodeURIComponent(agentName)}&limit=100`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch(`${API_URL}/agents/${encodeURIComponent(agentName)}/errors`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
      ]);

      if (agentResponse.status === 404) {
        setNotFound(true);
        return;
      }
      if (!agentResponse.ok || !messagesResponse.ok || !errorsResponse.ok) {
        throw new Error("Failed to load agent details");
      }

      setAgent(await agentResponse.json());
      setMessages(await messagesResponse.json());
      setErrors(await errorsResponse.json());
      setNotFound(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent details");
    }
  }, [agentName]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanAdmin(isAdmin());
      setNow(Date.now());
      fetchAgentDetails();
    }, 0);
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [fetchAgentDetails]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeoutId);
  }, [agentName]);

  const publishedTopics = useMemo(
    () => Array.from(new Set(messages.map((message) => message.topic))).sort(),
    [messages],
  );
  const totalPages = Math.max(1, Math.ceil(messages.length / pageSize));
  const visibleMessages = messages.slice((page - 1) * pageSize, page * pageSize);
  const messageCount = messages.length;
  const errorCount = errors.length;
  const messageVolumeData = useMemo(
    () => buildHourlyBucketData(messages.map((message) => message.timestamp), now || Date.now()),
    [messages, now],
  );
  const errorVolumeData = useMemo(
    () =>
      buildHourlyBucketData(
        errors.map((record) => record.failed_at || ""),
        now || Date.now(),
      ),
    [errors, now],
  );

  async function deregisterAgent() {
    if (!agent) return;

    const response = await fetch(
      `${API_URL}/agents/${encodeURIComponent(agent.name)}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      setError(`Failed to deregister ${agent.name}`);
      setShowConfirm(false);
      return;
    }

    sessionStorage.setItem("nexus_agent_notice", `${agent.name} deregistered`);
    router.push("/dashboard/agents");
  }

  if (notFound) {
    return (
      <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-10 text-center">
        <Bot className="mx-auto h-12 w-12 text-[#00d992]" />
        <h1 className="mt-5 text-2xl font-semibold text-white">Agent not found</h1>
        <Link href="/dashboard/agents" className="mt-6 inline-flex">
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to agents
          </Button>
        </Link>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-10 text-sm text-[#8b949e]">
        Loading agent details...
      </div>
    );
  }

  const heartbeatAge = heartbeatSeconds(agent, now);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/dashboard/agents"
          className="inline-flex items-center gap-2 text-[#00d992] transition hover:text-[#2fd6a1]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <span className="text-[#3d3a39]">/</span>
        <Link href="/dashboard/agents" className="text-[#8b949e] hover:text-[#f2f2f2]">
          Agents
        </Link>
        <span className="text-[#3d3a39]">/</span>
        <span className="font-mono text-[#bdbdbd]">{agent.name}</span>
      </div>

      <header className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold text-white">{agent.name}</h1>
              <Badge tone={statusTone(agent.status)}>
                <span className={`mr-2 h-2 w-2 rounded-full ${statusDot(agent.status)}`} />
                {agent.status}
              </Badge>
            </div>
            <span className="mt-4 inline-flex rounded-full border border-[#3d3a39] bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-[#bdbdbd]">
              {agent.agent_type}
            </span>
          </div>

          <div className="grid gap-3 text-sm text-[#bdbdbd] md:grid-cols-2 lg:min-w-[520px]">
            <div className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] p-3">
              <p className="text-xs text-[#8b949e]">Registered at</p>
              <p className="mt-1 font-mono">{new Date(agent.registered_at).toLocaleString()}</p>
            </div>
            <div className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] p-3">
              <p className="text-xs text-[#8b949e]">Uptime</p>
              <p className="mt-1 font-mono">{formatUptime(agent.registered_at, now)}</p>
            </div>
            <div className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] p-3">
              <p className="text-xs text-[#8b949e]">Last heartbeat</p>
              <p className={`mt-1 font-mono ${heartbeatAge > 30 ? "text-red-300" : ""}`}>
                {relativeTime(agent.last_heartbeat, now)}
              </p>
            </div>
            <div className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] p-3">
              <p className="text-xs text-[#8b949e]">Subscribe topics</p>
              <p className="mt-1 font-mono">{agent.subscribe_topics.length}</p>
            </div>
          </div>
        </div>
      </header>

      {error ? (
        <div className="rounded-[8px] border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Messages Processed"
          value={messageCount}
          subtitle="total messages"
          icon={MessageSquare}
        />
        <MetricCard
          title="Error Count"
          value={errorCount}
          subtitle="total errors"
          icon={AlertCircle}
          danger={errorCount > 0}
        />
        <MetricCard
          title="Uptime"
          value={formatUptime(agent.registered_at, now)}
          subtitle="since registration"
          icon={Clock}
        />
        <MetricCard
          title="Last Heartbeat"
          value={relativeTime(agent.last_heartbeat, now)}
          subtitle="heartbeat"
          icon={Heart}
          danger={heartbeatAge > 30}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Message Volume"
          value={messageCount}
          data={messageVolumeData}
          color="#00d992"
          subtitle="Messages per hour over the last 8 hours"
        />
        <ChartPanel
          title="Error Rate"
          value={errorCount}
          data={errorVolumeData}
          color={errorCount > 0 ? "#ef4444" : "#8b949e"}
          subtitle="Errors per hour over the last 8 hours"
        />
      </section>

      <section className="rounded-[8px] border border-[#3d3a39] bg-[#101010]">
        <div className="flex flex-col gap-3 border-b border-[#3d3a39] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Message History</h2>
            <p className="mt-1 text-sm text-[#8b949e]">
              Last 100 messages from this agent
            </p>
          </div>
          {messages.length > pageSize ? (
            <div className="flex items-center gap-3 text-sm text-[#8b949e]">
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="secondary"
                disabled={page === 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                disabled={page === totalPages}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>
        {messages.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8b949e]">No messages yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#3d3a39] bg-[#1a1a1a] text-xs uppercase text-[#8b949e]">
                <tr>
                  <th className="px-4 py-3 font-medium">Topic</th>
                  <th className="px-4 py-3 font-medium">Correlation ID</th>
                  <th className="px-4 py-3 font-medium">Timestamp</th>
                  <th className="px-4 py-3 font-medium">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d3a39]">
                {visibleMessages.map((message) => (
                  <tr
                    key={message.id}
                    onClick={() => setSelectedMessage(message)}
                    className="cursor-pointer transition hover:bg-[#1a1a1a]"
                  >
                    <td className="px-4 py-3">
                      <Badge tone={topicTone(message.topic)}>
                        {shortTopic(message.topic)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/pipelines/${encodeURIComponent(message.correlation_id)}`}
                        onClick={(event) => event.stopPropagation()}
                        className="font-mono text-xs text-[#bdbdbd] transition hover:text-[#00d992]"
                      >
                        {truncate(message.correlation_id, 18)}
                      </Link>
                    </td>
                    <td
                      className="px-4 py-3 text-xs text-[#8b949e]"
                      title={new Date(message.timestamp).toISOString()}
                    >
                      {relativeTime(message.timestamp, now)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#bdbdbd]">
                      {truncate(JSON.stringify(message.payload), 60)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-[8px] border border-[#3d3a39] bg-[#101010]">
        <div className="border-b border-[#3d3a39] px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Error Log</h2>
          <p className="mt-1 text-sm text-[#8b949e]">
            Dead letter queue entries from this agent
          </p>
        </div>
        {errors.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#8b949e]">No errors recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-[#3d3a39] bg-[#1a1a1a] text-xs uppercase text-[#8b949e]">
                <tr>
                  <th className="px-4 py-3 font-medium">Topic</th>
                  <th className="px-4 py-3 font-medium">Correlation ID</th>
                  <th className="px-4 py-3 font-medium">Failed at</th>
                  <th className="px-4 py-3 font-medium">Error</th>
                  <th className="px-4 py-3 font-medium">Retries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d3a39]">
                {errors.map((record) => (
                  <tr key={record.id} className="transition hover:bg-[#1a1a1a]">
                    <td className="px-4 py-3">
                      <Badge tone={topicTone(record.original_topic || "")}>
                        {shortTopic(record.original_topic || "unknown")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {record.original_message?.correlation_id ? (
                        <Link
                          href={`/dashboard/pipelines/${encodeURIComponent(record.original_message.correlation_id)}`}
                          className="font-mono text-xs text-[#bdbdbd] transition hover:text-[#00d992]"
                        >
                          {truncate(record.original_message.correlation_id, 18)}
                        </Link>
                      ) : (
                        <span className="font-mono text-xs text-[#8b949e]">—</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-xs text-[#8b949e]"
                      title={
                        record.failed_at
                          ? new Date(record.failed_at).toISOString()
                          : undefined
                      }
                    >
                      {record.failed_at ? relativeTime(record.failed_at, now) : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-red-300">
                      {truncate(record.error || "Unknown error", 80)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#bdbdbd]">
                      {record.retry_count ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">Subscribes to</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {agent.subscribe_topics.length > 0 ? (
              agent.subscribe_topics.map((topic) => (
                <Badge key={topic} tone={topicTone(topic)}>
                  {shortTopic(topic)}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-[#8b949e]">No subscriptions</p>
            )}
          </div>
        </div>

        <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">Publishes to</h2>
          <p className="mt-1 text-sm text-[#8b949e]">
            Detected from message history
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {publishedTopics.length > 0 ? (
              publishedTopics.map((topic) => (
                <Badge key={topic} tone={topicTone(topic)}>
                  {shortTopic(topic)}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-[#8b949e]">No published topics detected</p>
            )}
          </div>
        </div>
      </section>

      {canAdmin ? (
        <div className="flex justify-end border-t border-[#3d3a39] pt-5">
          <Button variant="danger" onClick={() => setShowConfirm(true)}>
            Deregister Agent
          </Button>
        </div>
      ) : null}

      <MessageDetailModal
        message={selectedMessage}
        isOpen={selectedMessage !== null}
        onClose={() => setSelectedMessage(null)}
      />
      {showConfirm ? (
        <ConfirmModal
          agentName={agent.name}
          onCancel={() => setShowConfirm(false)}
          onConfirm={deregisterAgent}
        />
      ) : null}
    </div>
  );
}

export default function AgentDetailPage() {
  return (
    <AuthGuard>
      <AgentDetailContent />
    </AuthGuard>
  );
}
