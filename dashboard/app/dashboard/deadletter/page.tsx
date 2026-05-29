"use client";

import Link from "next/link";
import { CheckCircle, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { getToken, isAdmin } from "@/lib/auth";

const API_URL = "/api/nexus/proxy";

type DeadLetterRecord = {
  id: string;
  original_topic?: string;
  error?: string;
  retry_count?: number;
  failed_at?: string;
  original_message?: {
    sender_agent?: string;
    correlation_id?: string;
    topic?: string;
  };
};

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function topicClass(topic: string) {
  if (topic === "nexus.research") return "border-teal-400/30 bg-teal-400/10 text-teal-200";
  if (topic === "nexus.analysis") return "border-violet-400/30 bg-violet-400/10 text-violet-200";
  if (topic === "nexus.writing") return "border-amber-400/30 bg-amber-400/10 text-amber-200";
  if (topic === "nexus.delivery") return "border-orange-400/30 bg-orange-400/10 text-orange-200";
  if (topic === "nexus.deadletter") return "border-red-400/30 bg-red-400/10 text-red-200";
  return "border-[#3d3a39] bg-[#1a1a1a] text-[#bdbdbd]";
}

function relativeTime(value?: string) {
  if (!value) return "Unknown";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body.detail || body.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export default function DeadLetterPage() {
  const [records, setRecords] = useState<DeadLetterRecord[]>([]);
  const [canAdmin, setCanAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const refreshRecords = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/deadletter`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await readError(response));
      setRecords(await response.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dead letter queue");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanAdmin(isAdmin());
      refreshRecords();
    }, 0);
    const intervalId = window.setInterval(refreshRecords, 15000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [refreshRecords]);

  const countBadgeClass = records.length
    ? "border-red-500/40 bg-red-500/10 text-red-300"
    : "border-[#00d992]/40 bg-[#00d992]/10 text-[#2fd6a1]";

  const orderedRecords = useMemo(
    () =>
      [...records].sort(
        (a, b) =>
          new Date(b.failed_at || 0).getTime() - new Date(a.failed_at || 0).getTime(),
      ),
    [records],
  );

  async function retryRecord(record: DeadLetterRecord) {
    const response = await fetch(`${API_URL}/deadletter/${encodeURIComponent(record.id)}/retry`, {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setToast("Message retried");
    window.setTimeout(() => setToast(""), 2500);
  }

  async function discardRecord(record: DeadLetterRecord) {
    const response = await fetch(`${API_URL}/deadletter/${encodeURIComponent(record.id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    setRecords((current) => current.filter((item) => item.id !== record.id));
    setToast("Message discarded");
    window.setTimeout(() => setToast(""), 2500);
  }

  async function retryAll() {
    if (!window.confirm("Retry all dead letter messages?")) return;
    for (const record of orderedRecords) {
      await retryRecord(record);
    }
  }

  async function discardAll() {
    if (!window.confirm("Discard all dead letter messages?")) return;
    for (const record of orderedRecords) {
      await discardRecord(record);
    }
  }

  return (
    <AuthGuard>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Dead Letter Queue</h1>
            <p className="mt-2 text-sm text-[#8b949e]">
              Failed messages that need retry or manual discard.
            </p>
          </div>
          <span className={`w-fit rounded-full border px-3 py-1 text-sm font-semibold ${countBadgeClass}`}>
            Dead Letter Queue ({records.length})
          </span>
        </header>

        {toast ? (
          <div className="rounded-[8px] border border-[#00d992] bg-[#00d992]/10 px-4 py-3 text-sm text-[#2fd6a1]">
            {toast}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        {canAdmin && orderedRecords.length > 0 ? (
          <section className="flex flex-wrap gap-3 rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4">
            <button
              onClick={retryAll}
              className="inline-flex items-center gap-2 rounded-[6px] border border-[#00d992]/40 px-4 py-2 text-sm font-semibold text-[#2fd6a1] transition hover:bg-[#00d992]/10"
            >
              <RotateCcw className="h-4 w-4" />
              Retry all
            </button>
            <button
              onClick={discardAll}
              className="inline-flex items-center gap-2 rounded-[6px] border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
            >
              <Trash2 className="h-4 w-4" />
              Discard all
            </button>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[8px] border border-[#3d3a39] bg-[#101010]">
          {isLoading ? (
            <div className="p-8 text-sm text-[#8b949e]">Loading failed messages...</div>
          ) : orderedRecords.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <CheckCircle className="h-12 w-12 text-[#00d992]" />
              <h2 className="text-lg font-semibold text-white">No failed messages</h2>
              <p className="text-sm text-[#8b949e]">All agents are processing normally</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#3d3a39] bg-[#1a1a1a] text-xs text-[#8b949e]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Original topic</th>
                    <th className="px-4 py-3 font-medium">Sender</th>
                    <th className="px-4 py-3 font-medium">Correlation ID</th>
                    <th className="px-4 py-3 font-medium">Retry</th>
                    <th className="px-4 py-3 font-medium">Last error</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orderedRecords.map((record) => {
                    const topic = record.original_topic || record.original_message?.topic || "unknown";
                    const correlationId = record.original_message?.correlation_id || "";
                    return (
                      <tr key={record.id} className="border-b border-[#3d3a39] last:border-0">
                        <td className="px-4 py-4">
                          <span className={`rounded-full border px-2 py-1 text-xs ${topicClass(topic)}`}>
                            {topic.replace("nexus.", "")}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-medium text-[#f2f2f2]">
                          {record.original_message?.sender_agent || "unknown"}
                        </td>
                        <td className="px-4 py-4">
                          {correlationId ? (
                            <Link
                              href={`/dashboard/pipelines/${encodeURIComponent(correlationId)}`}
                              className="font-mono text-[#2fd6a1] hover:text-[#00d992]"
                            >
                              {correlationId.slice(0, 12)}
                            </Link>
                          ) : (
                            <span className="text-[#8b949e]">unknown</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-[#bdbdbd]">{record.retry_count ?? 3}</td>
                        <td className="max-w-xs px-4 py-4 text-[#bdbdbd]" title={record.error || ""}>
                          <span className="block truncate">{record.error || "Unknown error"}</span>
                        </td>
                        <td className="px-4 py-4 text-[#8b949e]">{relativeTime(record.failed_at)}</td>
                        <td className="px-4 py-4 text-right">
                          {canAdmin ? (
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => retryRecord(record)}
                                className="rounded-[6px] border border-[#00d992]/40 px-3 py-2 text-xs font-semibold text-[#2fd6a1] hover:bg-[#00d992]/10"
                              >
                                Retry
                              </button>
                              <button
                                onClick={() => discardRecord(record)}
                                className="rounded-[6px] border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                              >
                                Discard
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-[#8b949e]">Admin only</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </AuthGuard>
  );
}
