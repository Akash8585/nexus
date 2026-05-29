"use client";

import { ArrowLeft, GitBranch } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { MessageDetailModal } from "@/components/MessageDetailModal";
import { type NexusMessage } from "@/components/MessageRow";
import {
  PipelineStatusBadge,
  type PipelineStatus,
} from "@/components/PipelineStatusBadge";
import { PipelineTimeline } from "@/components/PipelineTimeline";
import { ReplayControls, type ReplaySpeed } from "@/components/ReplayControls";
import { Button } from "@/components/ui/Button";
import { getToken, isAdmin } from "@/lib/auth";

type PipelineRun = {
  correlation_id: string;
  trigger_input: string;
  status: PipelineStatus;
  started_at: string;
  ended_at: string | null;
  duration_ms: number | null;
  message_count: number;
  messages?: string[];
  agent_names?: string[];
};

type ContextMap = Record<string, unknown>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const speedIntervals: Record<ReplaySpeed, number> = {
  0.5: 2000,
  1: 1000,
  2: 500,
};

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

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  if (totalSeconds < 60) return `${totalSeconds}s`;
  return `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s`;
}

function runDuration(run: PipelineRun, currentTime: number) {
  if (run.status === "running") {
    return `Running... ${formatDuration(currentTime - new Date(run.started_at).getTime())}`;
  }
  if (typeof run.duration_ms === "number") return formatDuration(run.duration_ms);
  if (run.ended_at) {
    return formatDuration(
      new Date(run.ended_at).getTime() - new Date(run.started_at).getTime(),
    );
  }
  return "Unknown";
}

function normalizeMessages(data: unknown, correlationId: string): NexusMessage[] {
  const raw = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as { value?: unknown }).value)
      ? ((data as { value: unknown[] }).value)
      : [];

  return (raw as NexusMessage[])
    .filter((message) => message.correlation_id === correlationId)
    .sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
}

function previewValue(value: unknown, maxLength = 60) {
  const text = JSON.stringify(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function uniqueAgentCount(run: PipelineRun, messages: NexusMessage[]) {
  if (Array.isArray(run.agent_names) && run.agent_names.length > 0) {
    return new Set(run.agent_names).size;
  }
  return new Set(messages.map((message) => message.sender_agent)).size;
}

function ConfirmRerunModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <section className="w-full max-w-md rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.7)]">
        <h2 className="text-lg font-semibold text-white">Re-run Pipeline</h2>
        <p className="mt-3 text-sm leading-6 text-[#bdbdbd]">
          This will start a new pipeline run with the same trigger input. Continue?
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            Continue
          </Button>
        </div>
      </section>
    </div>
  );
}

function PipelineDetailContent() {
  const params = useParams<{ correlationId: string }>();
  const router = useRouter();
  const correlationId = decodeURIComponent(params.correlationId);
  const [run, setRun] = useState<PipelineRun | null>(null);
  const [messages, setMessages] = useState<NexusMessage[]>([]);
  const [contextData, setContextData] = useState<ContextMap>({});
  const [expandedContextKey, setExpandedContextKey] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<NexusMessage | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<ReplaySpeed>(1);
  const [canAdmin, setCanAdmin] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const [showRerunConfirm, setShowRerunConfirm] = useState(false);

  const fetchRun = useCallback(async () => {
    try {
      const [runResponse, messageResponse] = await Promise.all([
        fetch(`${API_URL}/pipelines/${encodeURIComponent(correlationId)}`, {
          headers: authHeaders(),
          cache: "no-store",
        }),
        fetch(
          `${API_URL}/messages?correlation_id=${encodeURIComponent(correlationId)}&limit=100`,
          {
            headers: authHeaders(),
            cache: "no-store",
          },
        ),
      ]);

      if (runResponse.status === 404) {
        setNotFound(true);
        return;
      }
      if (!runResponse.ok || !messageResponse.ok) {
        throw new Error("Failed to load pipeline run");
      }

      setRun(await runResponse.json());
      setMessages(normalizeMessages(await messageResponse.json(), correlationId));
      fetch(`/api/nexus/context/${encodeURIComponent(correlationId)}`, {
        headers: authHeaders(),
        cache: "no-store",
      })
        .then((response) => (response.ok ? response.json() : {}))
        .then((data) => setContextData(data))
        .catch(() => setContextData({}));
      setNotFound(false);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load pipeline run");
    }
  }, [correlationId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanAdmin(isAdmin());
      setNow(Date.now());
      fetchRun();
    }, 0);
    const clockId = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(clockId);
    };
  }, [fetchRun]);

  useEffect(() => {
    if (!isPlaying) return;
    const intervalId = window.setInterval(() => {
      setCurrentStep((step) => {
        if (step >= messages.length) {
          setIsPlaying(false);
          return step;
        }
        return step + 1;
      });
    }, speedIntervals[speed]);

    return () => window.clearInterval(intervalId);
  }, [isPlaying, messages.length, speed]);

  const contextEntries = useMemo(() => Object.entries(contextData), [contextData]);
  const isComplete = messages.length > 0 && currentStep >= messages.length;

  async function rerunPipeline() {
    if (!run) return;
    try {
      const response = await fetch(
        `${API_URL}/pipelines/${encodeURIComponent(run.correlation_id)}/rerun`,
        {
          method: "POST",
          headers: authHeaders(),
        },
      );
      if (!response.ok) throw new Error("Rerun failed");
      const data = await response.json();
      const nextId =
        data.new_correlation_id || data.correlation_id || data.id || data.run_id;
      if (!nextId) throw new Error("Rerun response did not include a correlation ID");
      router.push(`/dashboard/pipelines/${nextId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rerun failed");
      setShowRerunConfirm(false);
    }
  }

  if (notFound) {
    return (
      <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-10 text-center">
        <GitBranch className="mx-auto h-12 w-12 text-[#00d992]" />
        <h1 className="mt-5 text-2xl font-semibold text-white">Pipeline run not found</h1>
        <Link href="/dashboard/pipelines" className="mt-6 inline-flex">
          <Button variant="secondary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to pipelines
          </Button>
        </Link>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-10 text-sm text-[#8b949e]">
        Loading pipeline run...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/dashboard/pipelines"
          className="inline-flex items-center gap-2 text-[#00d992] transition hover:text-[#2fd6a1]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <span className="text-[#3d3a39]">/</span>
        <Link href="/dashboard/pipelines" className="text-[#8b949e] hover:text-[#f2f2f2]">
          Pipelines
        </Link>
        <span className="text-[#3d3a39]">/</span>
        <span className="font-mono text-[#bdbdbd]">{run.correlation_id}</span>
      </div>

      <header className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="break-all font-mono text-2xl font-semibold text-white">
                {run.correlation_id}
              </h1>
              <PipelineStatusBadge status={run.status} />
            </div>
            <p className="mt-4 text-base italic leading-7 text-[#bdbdbd]">
              “{run.trigger_input}”
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] p-3">
            <p className="text-xs text-[#8b949e]">Started</p>
            <p className="mt-1 font-mono text-sm text-[#f5f6f7]" title={new Date(run.started_at).toISOString()}>
              {relativeTime(run.started_at, now)}
            </p>
          </div>
          <div className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] p-3">
            <p className="text-xs text-[#8b949e]">Duration</p>
            <p className="mt-1 font-mono text-sm text-[#f5f6f7]">
              {runDuration(run, now)}
            </p>
          </div>
          <div className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] p-3">
            <p className="text-xs text-[#8b949e]">Messages</p>
            <p className="mt-1 font-mono text-sm text-[#f5f6f7]">
              {run.message_count || messages.length}
            </p>
          </div>
          <div className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] p-3">
            <p className="text-xs text-[#8b949e]">Agents</p>
            <p className="mt-1 font-mono text-sm text-[#f5f6f7]">
              {uniqueAgentCount(run, messages)}
            </p>
          </div>
        </div>

        {run.status === "failed" ? (
          <div className="mt-5 rounded-[8px] border border-red-900 bg-red-950 p-4 text-sm text-red-200">
            Pipeline failed
            {run.ended_at ? ` at ${new Date(run.ended_at).toLocaleString()}` : ""}
          </div>
        ) : null}
      </header>

      {error ? (
        <div className="rounded-[8px] border border-red-900 bg-red-950 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      <ReplayControls
        totalSteps={messages.length}
        currentStep={currentStep}
        isPlaying={isPlaying}
        speed={speed}
        isComplete={isComplete}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onStepForward={() => setCurrentStep((step) => Math.min(messages.length, step + 1))}
        onStepBack={() => setCurrentStep((step) => Math.max(0, step - 1))}
        onReset={() => {
          setIsPlaying(false);
          setCurrentStep(0);
        }}
        onSpeedChange={setSpeed}
      />

      <PipelineTimeline
        messages={messages}
        currentStep={currentStep}
        isPlaying={isPlaying}
        onSelectMessage={setSelectedMessage}
      />

      <section className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-white">Context Store</h2>
          <span className="rounded-full border border-[#3d3a39] bg-[#1a1a1a] px-3 py-1 font-mono text-xs text-[#bdbdbd]">
            {contextEntries.length} keys
          </span>
        </div>
        {contextEntries.length === 0 ? (
          <div className="mt-5 rounded-[8px] border border-dashed border-[#3d3a39] bg-[#1a1a1a] p-8 text-center text-sm text-[#8b949e]">
            No context data for this run
          </div>
        ) : (
          <div className="mt-5 divide-y divide-[#3d3a39] rounded-[8px] border border-[#3d3a39]">
            {contextEntries.map(([key, value]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setExpandedContextKey((current) => (current === key ? null : key))
                }
                className="block w-full p-4 text-left transition hover:bg-[#1a1a1a]"
              >
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                  <span className="font-mono text-sm font-semibold text-[#f5f6f7]">
                    {key}
                  </span>
                  <span className="truncate font-mono text-xs text-[#8b949e]">
                    {previewValue(value)}
                  </span>
                </div>
                {expandedContextKey === key ? (
                  <pre className="mt-4 max-h-[360px] overflow-auto rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4 font-mono text-xs leading-5 text-[#f5f6f7]">
                    {JSON.stringify(value, null, 2)}
                  </pre>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </section>

      {canAdmin ? (
        <div className="flex justify-end border-t border-[#3d3a39] pt-5">
          <Button variant="primary" onClick={() => setShowRerunConfirm(true)}>
            Re-run Pipeline
          </Button>
        </div>
      ) : null}

      <MessageDetailModal
        message={selectedMessage}
        isOpen={selectedMessage !== null}
        onClose={() => setSelectedMessage(null)}
      />
      {showRerunConfirm ? (
        <ConfirmRerunModal
          onCancel={() => setShowRerunConfirm(false)}
          onConfirm={rerunPipeline}
        />
      ) : null}
    </div>
  );
}

export default function PipelineDetailPage() {
  return (
    <AuthGuard>
      <PipelineDetailContent />
    </AuthGuard>
  );
}
