"use client";

import { X } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import type { Agent } from "@/components/TopologyGraph";

function formatDate(timestamp: string) {
  return new Date(timestamp).toLocaleString();
}

function formatUptime(timestamp: string) {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
  );
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function statusTone(status: Agent["status"]) {
  if (status === "active") return "active";
  if (status === "dead") return "dead";
  return "idle";
}

export function AgentDetailPanel({
  agent,
  onClose,
}: {
  agent: Agent | null;
  onClose: () => void;
}) {
  if (!agent) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50" aria-modal="true" role="dialog">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/50"
        aria-label="Close agent details"
        onClick={onClose}
      />
      <aside className="absolute right-0 top-0 h-full w-full max-w-md translate-x-0 border-l border-[#3d3a39] bg-[#101010] p-6 text-[#f2f2f2] shadow-[0_20px_60px_rgba(0,0,0,0.7)] transition-transform">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="truncate text-2xl font-bold text-white">{agent.name}</h2>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-[#3d3a39] px-2.5 py-1 text-xs text-[#bdbdbd]">
                {agent.agent_type}
              </span>
              <Badge tone={statusTone(agent.status)}>{agent.status}</Badge>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#3d3a39] text-[#bdbdbd] transition hover:border-[#00d992] hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <dl className="mt-8 grid gap-4">
          <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
            <dt className="text-xs text-[#8b949e]">Registered at</dt>
            <dd className="mt-1 text-sm text-white">{formatDate(agent.registered_at)}</dd>
          </div>
          <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
            <dt className="text-xs text-[#8b949e]">Uptime</dt>
            <dd className="mt-1 font-mono text-lg text-white">
              {formatUptime(agent.registered_at)}
            </dd>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <dt className="text-xs text-[#8b949e]">Messages processed</dt>
              <dd className="mt-1 font-mono text-lg text-white">
                {agent.messages_processed}
              </dd>
            </div>
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <dt className="text-xs text-[#8b949e]">Error count</dt>
              <dd className="mt-1 font-mono text-lg text-white">
                {agent.error_count}
              </dd>
            </div>
          </div>
          <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
            <dt className="text-xs text-[#8b949e]">Last heartbeat</dt>
            <dd className="mt-1 text-sm text-white">
              {formatDate(agent.last_heartbeat)}
            </dd>
          </div>
        </dl>

        <Link
          href={`/dashboard/agents/${encodeURIComponent(agent.name)}`}
          className="mt-8 inline-flex min-h-11 w-full items-center justify-center rounded-[6px] bg-[#00d992] px-4 text-base font-semibold text-[#101010] transition hover:bg-[#2fd6a1]"
        >
          View full details
        </Link>
      </aside>
    </div>
  );
}
