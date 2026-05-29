"use client";

import { Bot } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { shortTopic, topicTone } from "@/components/MessageRow";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export type Agent = {
  name: string;
  agent_type: string;
  subscribe_topics: string[];
  status: "active" | "idle" | "dead" | "deregistered";
  registered_at: string;
  last_heartbeat: string;
  messages_processed: number;
  error_count: number;
};

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

function heartbeatSeconds(agent: Agent, currentTime: number) {
  return Math.max(
    0,
    Math.floor((currentTime - new Date(agent.last_heartbeat).getTime()) / 1000),
  );
}

function statusMeta(status: Agent["status"]) {
  if (status === "active") {
    return { label: "Active", dot: "bg-[#22c55e]", tone: "active" as const };
  }
  if (status === "dead") {
    return { label: "Dead", dot: "bg-[#ef4444]", tone: "dead" as const };
  }
  if (status === "deregistered") {
    return { label: "Deregistered", dot: "bg-[#374151]", tone: "default" as const };
  }
  return { label: "Idle", dot: "bg-[#6b7280]", tone: "idle" as const };
}

function statChipClass(isDanger = false) {
  return `rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 py-2 ${
    isDanger ? "text-red-300" : "text-[#bdbdbd]"
  }`;
}

export function AgentCard({
  agent,
  onDeregister,
  isAdmin,
}: {
  agent: Agent;
  onDeregister: (name: string) => void;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [now, setNow] = useState(0);
  const isDead = agent.status === "dead" || agent.status === "deregistered";
  const heartbeatAge = heartbeatSeconds(agent, now);
  const status = statusMeta(agent.status);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setNow(Date.now()), 0);
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  function confirmDeregister(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    if (window.confirm(`Deregister ${agent.name}? This cannot be undone.`)) {
      onDeregister(agent.name);
    }
  }

  return (
    <article
      onClick={() => router.push(`/dashboard/agents/${encodeURIComponent(agent.name)}`)}
      className={`cursor-pointer rounded-[8px] border bg-[#101010] p-5 transition hover:border-[#00d992] ${
        isDead
          ? "border-red-900/80 border-l-4 opacity-70"
          : "border-[#3d3a39]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3d3a39] bg-[#1a1a1a] text-[#00d992]">
              <Bot className="h-5 w-5" />
            </span>
            <h2 className="truncate text-xl font-semibold text-white">
              {agent.name}
            </h2>
          </div>
          <div className="mt-3">
            <span className="inline-flex rounded-full border border-[#3d3a39] bg-[#1a1a1a] px-3 py-1 text-xs font-medium text-[#bdbdbd]">
              {agent.agent_type}
            </span>
          </div>
        </div>
        <Badge tone={status.tone}>
          <span className={`mr-2 h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </Badge>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {agent.subscribe_topics.map((topic) => (
          <Badge key={topic} tone={topicTone(topic)}>
            {shortTopic(topic)}
          </Badge>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div className={statChipClass()}>
          <p className="text-[#8b949e]">Messages</p>
          <p className="mt-1 font-mono text-[#f5f6f7]">
            {agent.messages_processed}
          </p>
        </div>
        <div className={statChipClass(agent.error_count > 0)}>
          <p className="text-[#8b949e]">Errors</p>
          <p className="mt-1 font-mono">{agent.error_count}</p>
        </div>
        <div className={statChipClass(heartbeatAge > 30 || isDead)}>
          <p className="text-[#8b949e]">{isDead ? "Last seen" : "Heartbeat"}</p>
          <p className="mt-1 font-mono">
            {relativeTime(agent.last_heartbeat, now)}
          </p>
        </div>
        <div className={statChipClass()}>
          <p className="text-[#8b949e]">Registered</p>
          <p className="mt-1 font-mono text-[#f5f6f7]">
            {relativeTime(agent.registered_at, now)}
          </p>
        </div>
      </div>

      {isAdmin ? (
        <div className="mt-5 border-t border-[#3d3a39] pt-4">
          <Button
            type="button"
            variant="danger"
            onClick={confirmDeregister}
            className="w-full sm:w-auto"
          >
            Deregister
          </Button>
        </div>
      ) : null}
    </article>
  );
}
