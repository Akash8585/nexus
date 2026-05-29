"use client";

import { Copy, KeyRound, Plus, ShieldX } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { getToken, isAdmin } from "@/lib/auth";

const API_URL = "/api/nexus/proxy";

type ApiKeyRecord = {
  id: string;
  key_id?: string;
  name: string;
  prefix: string;
  created_at: string;
  is_active: boolean;
  last_used_at?: string | null;
  last_used_by_agent?: string | null;
  request_count?: number;
};

function authHeaders(contentType = false): HeadersInit {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(contentType ? { "Content-Type": "application/json" } : {}),
  };
}

function relativeTime(value?: string | null) {
  if (!value) return "Never";
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

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [revealedKey, setRevealedKey] = useState("");
  const [generatedId, setGeneratedId] = useState("");

  const refreshKeys = useCallback(async () => {
    const response = await fetch(`${API_URL}/keys`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await readError(response));
    setKeys(await response.json());
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const admin = isAdmin();
      setAllowed(admin);
      setCheckedAccess(true);
      if (admin) {
        refreshKeys().catch((err) =>
          setError(err instanceof Error ? err.message : "Failed to load API keys"),
        );
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [refreshKeys]);

  const sortedKeys = useMemo(
    () =>
      [...keys].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [keys],
  );

  async function generateKey() {
    if (!keyName.trim()) {
      setError("Key name is required");
      return;
    }

    const response = await fetch(`${API_URL}/keys`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ name: keyName.trim() }),
    });

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const data = await response.json();
    setRevealedKey(data.key);
    setGeneratedId(data.id || data.key_id);
    setKeys((current) => [
      {
        id: data.id || data.key_id,
        name: data.name || keyName.trim(),
        prefix: data.key.slice(0, 20),
        created_at: new Date().toISOString(),
        is_active: true,
      },
      ...current,
    ]);
    setKeyName("");
    setError("");
  }

  async function revokeKey(record: ApiKeyRecord) {
    if (!window.confirm(`Revoke ${record.name}? Any agents using this key will immediately lose access.`)) {
      return;
    }

    const response = await fetch(`${API_URL}/keys/${encodeURIComponent(record.id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setKeys((current) =>
      current.map((item) => (item.id === record.id ? { ...item, is_active: false } : item)),
    );
    setToast(`${record.name} revoked`);
    window.setTimeout(() => setToast(""), 2500);
  }

  async function copyKey() {
    await navigator.clipboard.writeText(revealedKey);
    setToast("Copied!");
    window.setTimeout(() => setToast(""), 2500);
  }

  function closeReveal() {
    setShowCreate(false);
    setRevealedKey("");
    setGeneratedId("");
  }

  if (checkedAccess && !allowed) {
    return (
      <AuthGuard>
        <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-8">
          <h1 className="text-2xl font-semibold text-white">Admin access required</h1>
          <p className="mt-2 text-sm text-[#8b949e]">API keys can only be managed by admins.</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">API Keys</h1>
            <p className="mt-2 text-sm text-[#8b949e]">
              Generate and revoke keys used by agents and SDK clients.
            </p>
          </div>
          <button
            onClick={() => {
              setShowCreate(true);
              setError("");
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-[#00d992] px-4 text-sm font-semibold text-[#101010] hover:bg-[#2fd6a1]"
          >
            <Plus className="h-4 w-4" />
            Generate New Key
          </button>
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
          {sortedKeys.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <KeyRound className="h-10 w-10 text-[#8b949e]" />
              <h2 className="text-lg font-semibold text-white">No API keys yet</h2>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-[#3d3a39] bg-[#1a1a1a] text-xs text-[#8b949e]">
                  <tr>
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">Key prefix</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Last used</th>
                    <th className="px-4 py-3 font-medium">Agent</th>
                    <th className="px-4 py-3 font-medium">Requests</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeys.map((record) => (
                    <tr key={record.id} className="border-b border-[#3d3a39] last:border-0">
                      <td className="px-4 py-4 font-medium text-white">{record.name}</td>
                      <td className="px-4 py-4 font-mono text-[#bdbdbd]">{record.prefix}...</td>
                      <td className="px-4 py-4 text-[#8b949e]">{relativeTime(record.created_at)}</td>
                      <td className="px-4 py-4 text-[#8b949e]">{relativeTime(record.last_used_at)}</td>
                      <td className="px-4 py-4 text-[#bdbdbd]">{record.last_used_by_agent || "-"}</td>
                      <td className="px-4 py-4 text-[#bdbdbd]">{record.request_count ?? 0}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs ${
                            record.is_active
                              ? "border-[#00d992]/40 bg-[#00d992]/10 text-[#2fd6a1]"
                              : "border-[#3d3a39] bg-[#1a1a1a] text-[#8b949e]"
                          }`}
                        >
                          {record.is_active ? "Active" : "Revoked"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {record.is_active ? (
                          <button
                            onClick={() => revokeKey(record)}
                            className="inline-flex items-center gap-2 rounded-[6px] border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                          >
                            <ShieldX className="h-3.5 w-3.5" />
                            Revoke
                          </button>
                        ) : (
                          <span className="text-xs text-[#8b949e]">No actions</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {showCreate ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-lg rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6 shadow-2xl">
              {!revealedKey ? (
                <>
                  <h2 className="text-lg font-semibold text-white">Generate New Key</h2>
                  <label className="mt-5 flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
                    Name
                    <input
                      value={keyName}
                      onChange={(event) => setKeyName(event.target.value)}
                      placeholder="production-agents"
                      className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none focus:border-[#00d992]"
                    />
                  </label>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => setShowCreate(false)}
                      className="rounded-[6px] border border-[#3d3a39] px-4 py-2 text-sm font-semibold text-[#f2f2f2]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={generateKey}
                      className="rounded-[6px] bg-[#00d992] px-4 py-2 text-sm font-semibold text-[#101010]"
                    >
                      Generate
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-white">Copy your API key</h2>
                  <p className="mt-2 text-sm text-[#8b949e]">Key ID: {generatedId}</p>
                  <div className="mt-5 rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4 font-mono text-sm text-[#f2f2f2] break-all">
                    {revealedKey}
                  </div>
                  <button
                    onClick={copyKey}
                    className="mt-4 inline-flex items-center gap-2 rounded-[6px] border border-[#3d3a39] px-4 py-2 text-sm font-semibold text-[#f2f2f2] hover:border-[#00d992]"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                  <div className="mt-4 rounded-[8px] border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-200">
                    Store this key securely. You will not be able to see it again.
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={closeReveal}
                      className="rounded-[6px] bg-[#00d992] px-4 py-2 text-sm font-semibold text-[#101010]"
                    >
                      I&apos;ve copied it
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
