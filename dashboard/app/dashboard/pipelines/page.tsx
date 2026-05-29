"use client";

import { CheckCircle, Clock, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  PipelineStatusBadge,
  type PipelineStatus,
} from "@/components/PipelineStatusBadge";
import { Button } from "@/components/ui/Button";
import { getToken } from "@/lib/auth";

type PipelineRun = {
  correlation_id: string;
  trigger_input: string;
  status: PipelineStatus;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  message_count: number;
  agent_names?: string[];
  messages?: string[];
};

type Filters = {
  status: "all" | PipelineStatus;
  search: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const pageSize = 20;
const defaultFilters: Filters = {
  status: "all",
  search: "",
};

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function relativeTime(timestamp: string, currentTime: number) {
  const diffSeconds = Math.max(
    0,
    Math.floor((currentTime - new Date(timestamp).getTime()) / 1000),
  );

  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} mins ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} hrs ago`;
  return `${Math.floor(diffSeconds / 86400)} days ago`;
}

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

function runDuration(run: PipelineRun, currentTime: number) {
  if (run.status === "running") {
    const elapsed = currentTime - new Date(run.started_at).getTime();
    return `Running... ${formatDuration(elapsed)}`;
  }
  if (typeof run.duration_ms === "number") {
    return formatDuration(run.duration_ms);
  }
  if (run.ended_at) {
    return formatDuration(
      new Date(run.ended_at).getTime() - new Date(run.started_at).getTime(),
    );
  }
  return "Unknown";
}

function uniqueAgentCount(run: PipelineRun) {
  if (Array.isArray(run.agent_names)) {
    return new Set(run.agent_names).size;
  }
  return 0;
}

function filterRuns(runs: PipelineRun[], filters: Filters) {
  const query = filters.search.trim().toLowerCase();
  return runs.filter((run) => {
    if (filters.status !== "all" && run.status !== filters.status) {
      return false;
    }
    if (!query) return true;
    return (
      run.correlation_id.toLowerCase().includes(query) ||
      run.trigger_input.toLowerCase().includes(query)
    );
  });
}

function successTone(successRate: number | null) {
  if (successRate === null || successRate > 80) return "border-green-900 text-green-300";
  if (successRate >= 50) return "border-amber-900 text-amber-300";
  return "border-red-900 text-red-300";
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = "border-[#3d3a39] text-white",
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: typeof GitBranch;
  tone?: string;
}) {
  return (
    <article className={`rounded-[8px] border bg-[#101010] p-6 ${tone}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-[#8b949e]">{title}</p>
          <p className="mt-3 font-mono text-4xl font-semibold leading-none">
            {value}
          </p>
          <p className="mt-3 text-xs text-[#8b949e]">{subtitle}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] text-[#00d992]">
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </article>
  );
}

export default function PipelinesPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [draftSearch, setDraftSearch] = useState("");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchRuns = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/pipelines?limit=100`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Failed to load pipeline runs");
      }

      setRuns(await response.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline runs");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setNow(Date.now());
      fetchRuns();
    }, 0);
    const refreshId = window.setInterval(fetchRuns, 30000);
    const clockId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(refreshId);
      window.clearInterval(clockId);
    };
  }, [fetchRuns]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) => ({ ...current, search: draftSearch }));
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [draftSearch]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setPage(1), 0);
    return () => window.clearTimeout(timeoutId);
  }, [filters.status]);

  const filteredRuns = useMemo(() => filterRuns(runs, filters), [runs, filters]);
  const totalPages = Math.max(1, Math.ceil(filteredRuns.length / pageSize));
  const visibleRuns = filteredRuns.slice((page - 1) * pageSize, page * pageSize);
  const completedRuns = runs.filter((run) => run.status === "completed");
  const successRate =
    runs.length === 0 ? null : Math.round((completedRuns.length / runs.length) * 100);
  const completedDurations = completedRuns
    .map((run) => run.duration_ms)
    .filter((duration): duration is number => typeof duration === "number");
  const averageDuration =
    completedDurations.length === 0
      ? "0s"
      : formatDuration(
          completedDurations.reduce((sum, duration) => sum + duration, 0) /
            completedDurations.length,
        );
  const hasActiveFilters = filters.status !== "all" || filters.search !== "";
  const showingStart = filteredRuns.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const showingEnd = Math.min(page * pageSize, filteredRuns.length);

  function clearFilters() {
    setDraftSearch("");
    setFilters(defaultFilters);
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-white">Pipeline History</h1>
        <p className="mt-2 text-sm text-[#8b949e]">
          Review pipeline runs, status, timing, and agent participation.
        </p>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <StatCard
          title="Total Runs Today"
          value={runs.filter((run) => isToday(run.started_at)).length}
          subtitle="started today"
          icon={GitBranch}
        />
        <StatCard
          title="Success Rate"
          value={successRate === null ? "0%" : `${successRate}%`}
          subtitle="completed runs"
          icon={CheckCircle}
          tone={successTone(successRate)}
        />
        <StatCard
          title="Average Duration"
          value={averageDuration}
          subtitle="completed runs"
          icon={Clock}
        />
      </section>

      <section className="flex flex-col gap-3 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4 lg:flex-row lg:items-end">
        <label className="flex flex-1 flex-col gap-2 text-xs font-medium text-[#8b949e] lg:max-w-xs">
          Status
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value as Filters["status"],
              }))
            }
            className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 text-sm text-[#f2f2f2] outline-none transition focus:border-[#00d992]"
          >
            <option value="all">All statuses</option>
            <option value="running">running</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
          </select>
        </label>

        <label className="flex flex-[2] flex-col gap-2 text-xs font-medium text-[#8b949e]">
          Search
          <input
            value={draftSearch}
            onChange={(event) => setDraftSearch(event.target.value)}
            placeholder="Search by run ID or trigger input..."
            className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none transition placeholder:text-[#8b949e] focus:border-[#00d992]"
          />
        </label>

        {hasActiveFilters ? (
          <Button variant="secondary" onClick={clearFilters} className="shrink-0">
            Clear filters
          </Button>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-[8px] border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <section className="rounded-[8px] border border-[#3d3a39] bg-[#101010]">
        {isLoading ? (
          <div className="p-10 text-center text-sm text-[#8b949e]">
            Loading pipeline runs...
          </div>
        ) : filteredRuns.length === 0 ? (
          <div className="p-12 text-center">
            <GitBranch className="mx-auto h-10 w-10 text-[#00d992]" />
            <h2 className="mt-4 text-xl font-semibold text-white">
              No pipeline runs yet
            </h2>
            <p className="mt-2 text-sm text-[#8b949e]">
              Run the demo pipeline to see results here
            </p>
            <pre className="mx-auto mt-5 w-fit rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] px-4 py-3 font-mono text-sm text-[#f5f6f7]">
              python demo/run.py
            </pre>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="border-b border-[#3d3a39] bg-[#1a1a1a] text-xs uppercase text-[#8b949e]">
                <tr>
                  <th className="px-4 py-3 font-medium">Correlation ID</th>
                  <th className="px-4 py-3 font-medium">Trigger Input</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Started At</th>
                  <th className="px-4 py-3 font-medium">Duration</th>
                  <th className="px-4 py-3 font-medium">Messages</th>
                  <th className="px-4 py-3 font-medium">Agents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d3a39]">
                {visibleRuns.map((run) => (
                  <tr
                    key={run.correlation_id}
                    onClick={() =>
                      router.push(`/dashboard/pipelines/${run.correlation_id}`)
                    }
                    className="cursor-pointer transition hover:bg-[#1a1a1a]"
                  >
                    <td
                      className="px-4 py-3 font-mono text-xs text-[#f5f6f7]"
                      title={run.correlation_id}
                    >
                      {truncate(run.correlation_id, 16)}
                    </td>
                    <td
                      className="px-4 py-3 text-[#bdbdbd]"
                      title={run.trigger_input}
                    >
                      {truncate(run.trigger_input, 50)}
                    </td>
                    <td className="px-4 py-3">
                      <PipelineStatusBadge status={run.status} />
                    </td>
                    <td
                      className="px-4 py-3 text-[#8b949e]"
                      title={new Date(run.started_at).toISOString()}
                    >
                      {relativeTime(run.started_at, now)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#bdbdbd]">
                      {runDuration(run, now)}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#f5f6f7]">
                      {run.message_count ?? run.messages?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 font-mono text-[#f5f6f7]">
                      {uniqueAgentCount(run)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {filteredRuns.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4 text-sm text-[#8b949e] sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing {showingStart}-{showingEnd} of {filteredRuns.length} runs
          </span>
          <div className="flex gap-3">
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
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Next
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
