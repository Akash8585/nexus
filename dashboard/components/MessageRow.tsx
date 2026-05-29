"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";

export type NexusMessage = {
  id: string;
  correlation_id: string;
  topic: string;
  sender_agent: string;
  payload: Record<string, unknown>;
  timestamp: string;
  retry_count: number;
  latency?: number;
  latency_ms?: number;
};

export function shortTopic(topic: string) {
  return topic.replace(/^nexus\./, "");
}

export function topicTone(topic: string) {
  if (topic === "nexus.research") return "research";
  if (topic === "nexus.analysis") return "analysis";
  if (topic === "nexus.writing") return "writing";
  if (topic === "nexus.delivery") return "delivery";
  if (topic === "nexus.deadletter") return "dead";
  return "default";
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}...`;
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

function latencyClass(latency: number) {
  if (latency < 500) {
    return "border-green-900 bg-green-950 text-green-300";
  }
  if (latency <= 2000) {
    return "border-amber-900 bg-amber-950 text-amber-300";
  }
  return "border-red-900 bg-red-950 text-red-300";
}

export function MessageRow({
  message,
  onClick,
}: {
  message: NexusMessage;
  onClick: () => void;
}) {
  const [now, setNow] = useState(0);
  const payloadPreview = useMemo(
    () => truncate(JSON.stringify(message.payload), 80),
    [message.payload],
  );
  const latency = message.latency_ms ?? message.latency;

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setNow(Date.now()), 0);
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      className="grid w-full grid-cols-[minmax(90px,0.8fr)_minmax(140px,1fr)_minmax(120px,0.8fr)_minmax(220px,2fr)_minmax(80px,0.6fr)_minmax(64px,0.5fr)] items-center gap-4 border-b border-[#3d3a39] px-4 py-3 text-left transition hover:bg-[#1a1a1a]"
    >
      <span>
        <Badge tone={topicTone(message.topic)}>{shortTopic(message.topic)}</Badge>
      </span>

      <Link
        href={`/dashboard/agents/${encodeURIComponent(message.sender_agent)}`}
        onClick={(event) => event.stopPropagation()}
        className="truncate text-sm font-semibold text-[#f2f2f2] transition hover:text-[#00d992]"
      >
        {message.sender_agent}
      </Link>

      <Link
        href={`/dashboard/pipelines/${encodeURIComponent(message.correlation_id)}`}
        onClick={(event) => event.stopPropagation()}
        className="truncate font-mono text-xs text-[#8b949e] transition hover:text-[#00d992]"
      >
        {truncate(message.correlation_id, 12)}
      </Link>

      <span className="truncate font-mono text-xs leading-5 text-[#bdbdbd]">
        {payloadPreview}
      </span>

      <span
        className="text-xs text-[#8b949e]"
        title={new Date(message.timestamp).toISOString()}
      >
        {relativeTime(message.timestamp, now)}
      </span>

      <span>
        {typeof latency === "number" ? (
          <span
            className={`inline-flex rounded-full border px-2 py-1 font-mono text-xs ${latencyClass(latency)}`}
          >
            {latency}ms
          </span>
        ) : null}
      </span>
    </button>
  );
}
