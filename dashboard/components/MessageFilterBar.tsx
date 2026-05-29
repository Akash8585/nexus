"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { getToken } from "@/lib/auth";

export type MessageFilters = {
  topic: string;
  agent: string;
  correlationId: string;
};

type Agent = {
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const topics = [
  "nexus.research",
  "nexus.analysis",
  "nexus.writing",
  "nexus.delivery",
  "nexus.deadletter",
  "nexus.heartbeat",
];

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function MessageFilterBar({
  filters,
  onChange,
  onClear,
}: {
  filters: MessageFilters;
  onChange: (filters: MessageFilters) => void;
  onClear: () => void;
}) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [draftCorrelationId, setDraftCorrelationId] = useState(
    filters.correlationId,
  );
  const hasActiveFilters =
    filters.topic !== "all" || filters.agent !== "all" || filters.correlationId !== "";

  useEffect(() => {
    fetch(`${API_URL}/agents`, {
      headers: authHeaders(),
      cache: "no-store",
    })
      .then((response) => (response.ok ? response.json() : []))
      .then((data: Agent[]) => setAgents(data))
      .catch(() => setAgents([]));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDraftCorrelationId(filters.correlationId);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [filters.correlationId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (draftCorrelationId !== filters.correlationId) {
        onChange({ ...filters, correlationId: draftCorrelationId });
      }
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [draftCorrelationId, filters, onChange]);

  return (
    <div className="flex flex-col gap-3 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4 lg:flex-row lg:items-end">
      <label className="flex flex-1 flex-col gap-2 text-xs font-medium text-[#8b949e]">
        Topic
        <select
          value={filters.topic}
          onChange={(event) =>
            onChange({ ...filters, topic: event.target.value })
          }
          className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 text-sm text-[#f2f2f2] outline-none transition focus:border-[#00d992]"
        >
          <option value="all">All topics</option>
          {topics.map((topic) => (
            <option key={topic} value={topic}>
              {topic.replace(/^nexus\./, "")}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-1 flex-col gap-2 text-xs font-medium text-[#8b949e]">
        Agent
        <select
          value={filters.agent}
          onChange={(event) =>
            onChange({ ...filters, agent: event.target.value })
          }
          className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 text-sm text-[#f2f2f2] outline-none transition focus:border-[#00d992]"
        >
          <option value="all">All agents</option>
          {agents.map((agent) => (
            <option key={agent.name} value={agent.name}>
              {agent.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-[1.4] flex-col gap-2 text-xs font-medium text-[#8b949e]">
        Correlation ID
        <input
          value={draftCorrelationId}
          onChange={(event) => setDraftCorrelationId(event.target.value)}
          placeholder="Filter by run ID..."
          className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none transition placeholder:text-[#8b949e] focus:border-[#00d992]"
        />
      </label>

      {hasActiveFilters ? (
        <Button variant="secondary" onClick={onClear} className="shrink-0">
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}
