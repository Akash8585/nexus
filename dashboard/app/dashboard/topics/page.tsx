"use client";

import { Layers, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { getToken, isAdmin } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const defaultTopics = new Set([
  "nexus.research",
  "nexus.analysis",
  "nexus.writing",
  "nexus.delivery",
  "nexus.deadletter",
  "nexus.heartbeat",
]);

type Topic = {
  name: string;
  partition_count?: number;
  partitions?: number;
  message_count?: number;
  size_bytes?: number;
};

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function formatBytes(bytes?: number) {
  const value = bytes ?? 0;
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body.detail || body.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export default function TopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [canAdmin, setCanAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [deleteTopic, setDeleteTopic] = useState<Topic | null>(null);
  const [name, setName] = useState("");
  const [partitions, setPartitions] = useState(1);
  const [retentionDays, setRetentionDays] = useState(7);
  const [formError, setFormError] = useState("");

  const refreshTopics = useCallback(async (retry = true) => {
    try {
      const response = await fetch(`${API_URL}/topics`, {
        headers: authHeaders(),
        cache: "no-store",
      });
      if (!response.ok) {
        if (retry && (response.status === 500 || response.status === 503)) {
          await new Promise((resolve) => window.setTimeout(resolve, 400));
          return refreshTopics(false);
        }
        throw new Error(await readError(response));
      }
      setTopics(await response.json());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load topics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanAdmin(isAdmin());
      refreshTopics();
    }, 0);
    const intervalId = window.setInterval(refreshTopics, 30000);
    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
    };
  }, [refreshTopics]);

  const sortedTopics = useMemo(
    () => [...topics].sort((a, b) => a.name.localeCompare(b.name)),
    [topics],
  );

  async function createTopic() {
    setFormError("");
    if (!name.startsWith("nexus.")) {
      setFormError("Topic names must start with nexus.");
      return;
    }

    const response = await fetch(`${API_URL}/topics`, {
      method: "POST",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, partitions, retention_days: retentionDays }),
    });

    if (!response.ok) {
      setFormError(await readError(response));
      return;
    }

    setShowCreate(false);
    setName("");
    setPartitions(1);
    setRetentionDays(7);
    setToast(`${name} created`);
    window.setTimeout(() => setToast(""), 2500);
    refreshTopics();
  }

  async function confirmDeleteTopic() {
    if (!deleteTopic) return;
    const response = await fetch(
      `${API_URL}/topics/${encodeURIComponent(deleteTopic.name)}`,
      {
        method: "DELETE",
        headers: authHeaders(),
      },
    );

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setTopics((current) => current.filter((topic) => topic.name !== deleteTopic.name));
    setToast(`${deleteTopic.name} deleted`);
    setDeleteTopic(null);
    window.setTimeout(() => setToast(""), 2500);
  }

  return (
    <AuthGuard>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Topics</h1>
            <p className="mt-2 text-sm text-[#8b949e]">
              Kafka-backed channels that carry messages between Nexus agents.
            </p>
          </div>
          {canAdmin ? (
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-[#00d992] px-4 text-sm font-semibold text-[#101010] transition hover:bg-[#2fd6a1]"
            >
              <Plus className="h-4 w-4" />
              Create Topic
            </button>
          ) : null}
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

        <section className="overflow-hidden rounded-[8px] border border-[#3d3a39] bg-[#101010]">
          {isLoading ? (
            <div className="p-8 text-sm text-[#8b949e]">Loading topics...</div>
          ) : sortedTopics.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <Layers className="h-10 w-10 text-[#8b949e]" />
              <h2 className="text-lg font-semibold text-white">No topics found</h2>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#3d3a39] bg-[#1a1a1a] text-xs text-[#8b949e]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Partitions</th>
                    <th className="px-4 py-3 font-medium">Messages</th>
                    <th className="px-4 py-3 font-medium">Size</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTopics.map((topic) => {
                    const isDefault = defaultTopics.has(topic.name);
                    return (
                      <tr key={topic.name} className="border-b border-[#3d3a39] last:border-0">
                        <td className="px-4 py-4 font-mono text-[#f2f2f2]">{topic.name}</td>
                        <td className="px-4 py-4">
                          {isDefault ? (
                            <span className="rounded-full border border-[#00d992]/40 bg-[#00d992]/10 px-2 py-1 text-xs text-[#2fd6a1]">
                              Default
                            </span>
                          ) : (
                            <span className="rounded-full border border-[#3d3a39] px-2 py-1 text-xs text-[#8b949e]">
                              Custom
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-[#bdbdbd]">
                          {topic.partition_count ?? topic.partitions ?? 0}
                        </td>
                        <td className="px-4 py-4 text-[#bdbdbd]">{topic.message_count ?? 0}</td>
                        <td className="px-4 py-4 text-[#8b949e]">
                          {formatBytes(topic.size_bytes)}
                        </td>
                        <td className="px-4 py-4 text-right">
                          {canAdmin ? (
                            <button
                              disabled={isDefault}
                              title={isDefault ? "Cannot delete default topic" : "Delete topic"}
                              onClick={() => setDeleteTopic(topic)}
                              className="inline-flex items-center gap-2 rounded-[6px] border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 transition enabled:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-[#3d3a39] disabled:text-[#555]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Delete
                            </button>
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

        {showCreate ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6 shadow-2xl">
              <h2 className="text-lg font-semibold text-white">Create Topic</h2>
              <div className="mt-5 flex flex-col gap-4">
                <label className="flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
                  Name
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="nexus.custom"
                    className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none focus:border-[#00d992]"
                  />
                  <span>Topic names must start with nexus.</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
                    Partitions
                    <input
                      type="number"
                      min={1}
                      value={partitions}
                      onChange={(event) => setPartitions(Number(event.target.value))}
                      className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none focus:border-[#00d992]"
                    />
                  </label>
                  <label className="flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
                    Retention days
                    <input
                      type="number"
                      min={1}
                      value={retentionDays}
                      onChange={(event) => setRetentionDays(Number(event.target.value))}
                      className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none focus:border-[#00d992]"
                    />
                  </label>
                </div>
              </div>
              {formError ? <p className="mt-4 text-sm text-red-300">{formError}</p> : null}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreate(false)}
                  className="rounded-[6px] border border-[#3d3a39] px-4 py-2 text-sm font-semibold text-[#f2f2f2]"
                >
                  Cancel
                </button>
                <button
                  onClick={createTopic}
                  className="rounded-[6px] bg-[#00d992] px-4 py-2 text-sm font-semibold text-[#101010]"
                >
                  Create
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {deleteTopic ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6 shadow-2xl">
              <h2 className="text-lg font-semibold text-white">Delete topic {deleteTopic.name}?</h2>
              <p className="mt-2 text-sm text-[#8b949e]">All messages will be lost.</p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTopic(null)}
                  className="rounded-[6px] border border-[#3d3a39] px-4 py-2 text-sm font-semibold text-[#f2f2f2]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDeleteTopic}
                  className="rounded-[6px] bg-red-500 px-4 py-2 text-sm font-semibold text-white"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
