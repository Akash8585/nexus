"use client";

import Link from "next/link";
import { Download, KeyRound, Trash2, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { getToken, isAdmin } from "@/lib/auth";

const API_URL = "/api/nexus/proxy";
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "";

type HealthResponse = {
  status?: string;
  service?: string;
  version?: string;
};

type SettingsInfo = {
  kafkaBroker: string;
  redisUrl: string;
  apiUrl: string;
};

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body.detail || body.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [settings, setSettings] = useState<SettingsInfo>({
    kafkaBroker: "localhost:9092",
    redisUrl: "redis://localhost:6379",
    apiUrl: BACKEND_URL,
  });
  const [canAdmin, setCanAdmin] = useState(false);
  const [flushText, setFlushText] = useState("");
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");

  const refreshInfo = useCallback(async () => {
    try {
      const healthResponse = await fetch(`${BACKEND_URL.replace("/api/v1", "")}/health`, {
        cache: "no-store",
      });
      if (healthResponse.ok) {
        setHealth(await healthResponse.json());
      }

      const settingsResponse = await fetch("/api/nexus/settings", { cache: "no-store" });
      if (settingsResponse.ok) {
        setSettings(await settingsResponse.json());
      }
    } catch {
      setHealth(null);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCanAdmin(isAdmin());
      refreshInfo();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshInfo]);

  const apiOnline = health?.status === "ok";

  async function downloadMessages() {
    const response = await fetch(`${API_URL}/messages?limit=1000`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const data = await response.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "messages.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function clearDeadAgents() {
    if (!window.confirm("Remove all dead agents?")) return;
    const response = await fetch("/api/nexus/agents/cleanup", {
      method: "POST",
      headers: authHeaders(),
    });
    if (!response.ok) {
      setError(await readError(response));
      return;
    }
    const data = await response.json();
    setToast(`Removed ${data.removed} stale agents`);
    window.setTimeout(() => setToast(""), 2500);
  }

  async function flushContextStore() {
    if (flushText !== "FLUSH") {
      setError("Type FLUSH to confirm context deletion");
      return;
    }

    const response = await fetch(`${API_URL}/context/flush-all`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const data = await response.json();
    setToast(`Flushed ${data.deleted} context keys`);
    setFlushText("");
    setError("");
    window.setTimeout(() => setToast(""), 2500);
  }

  function disabledTitle() {
    return canAdmin ? undefined : "Admin required";
  }

  return (
    <AuthGuard>
      <div className="flex flex-col gap-5">
        <header>
          <h1 className="text-2xl font-semibold text-white">Settings</h1>
          <p className="mt-2 text-sm text-[#8b949e]">
            System configuration, team administration, and operational controls.
          </p>
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

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/dashboard/settings/api-keys"
            className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5 transition hover:border-[#00d992]"
          >
            <KeyRound className="h-5 w-5 text-[#00d992]" />
            <h2 className="mt-3 text-lg font-semibold text-white">API Keys</h2>
            <p className="mt-2 text-sm text-[#8b949e]">Create and revoke agent access keys.</p>
          </Link>
          <Link
            href="/dashboard/settings/team"
            className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5 transition hover:border-[#00d992]"
          >
            <Users className="h-5 w-5 text-[#00d992]" />
            <h2 className="mt-3 text-lg font-semibold text-white">Team</h2>
            <p className="mt-2 text-sm text-[#8b949e]">Invite members and manage roles.</p>
          </Link>
        </section>

        <section className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">Connection Info</h2>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <div className="text-xs text-[#8b949e]">Kafka Broker</div>
              <div className="mt-2 font-mono text-[#f2f2f2]">{settings.kafkaBroker}</div>
            </div>
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <div className="text-xs text-[#8b949e]">Redis URL</div>
              <div className="mt-2 font-mono text-[#f2f2f2]">{settings.redisUrl}</div>
            </div>
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <div className="text-xs text-[#8b949e]">API URL</div>
              <div className="mt-2 font-mono text-[#f2f2f2]">{settings.apiUrl}</div>
            </div>
          </div>
          <p className="mt-4 text-sm text-[#8b949e]">
            Connection settings are configured via environment variables.
          </p>
        </section>

        <section className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-white">System Info</h2>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <div className="text-xs text-[#8b949e]">Nexus Version</div>
              <div className="mt-2 text-[#f2f2f2]">{health?.version || "1.0.0"}</div>
            </div>
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <div className="text-xs text-[#8b949e]">Environment</div>
              <div className="mt-2 text-[#f2f2f2]">development</div>
            </div>
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <div className="text-xs text-[#8b949e]">API Status</div>
              <div className="mt-2 flex items-center gap-2 text-[#f2f2f2]">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    apiOnline ? "bg-[#00d992]" : "bg-red-500"
                  }`}
                />
                {apiOnline ? "Online" : "Offline"}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[8px] border border-red-500/50 bg-[#101010] p-5">
          <h2 className="text-lg font-semibold text-red-200">Danger Zone</h2>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <h3 className="font-semibold text-white">Download Message Log</h3>
              <p className="mt-2 min-h-10 text-sm text-[#8b949e]">Export the latest 1000 messages.</p>
              <button
                disabled={!canAdmin}
                title={disabledTitle()}
                onClick={downloadMessages}
                className="mt-4 inline-flex items-center gap-2 rounded-[6px] border border-[#3d3a39] px-3 py-2 text-sm font-semibold text-[#f2f2f2] enabled:hover:border-[#00d992] disabled:cursor-not-allowed disabled:text-[#555]"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
            </div>
            <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
              <h3 className="font-semibold text-white">Clear Dead Agents</h3>
              <p className="mt-2 min-h-10 text-sm text-[#8b949e]">Remove dead and deregistered agents.</p>
              <button
                disabled={!canAdmin}
                title={disabledTitle()}
                onClick={clearDeadAgents}
                className="mt-4 inline-flex items-center gap-2 rounded-[6px] border border-[#3d3a39] px-3 py-2 text-sm font-semibold text-[#f2f2f2] enabled:hover:border-[#00d992] disabled:cursor-not-allowed disabled:text-[#555]"
              >
                <Trash2 className="h-4 w-4" />
                Clear Dead Agents
              </button>
            </div>
            <div className="rounded-[8px] border border-red-500/40 bg-red-500/5 p-4">
              <h3 className="font-semibold text-white">Flush Context Store</h3>
              <p className="mt-2 text-sm text-[#8b949e]">
                This will delete ALL pipeline context data permanently.
              </p>
              <input
                value={flushText}
                onChange={(event) => setFlushText(event.target.value)}
                placeholder="Type FLUSH"
                disabled={!canAdmin}
                className="mt-4 min-h-10 w-full rounded-[6px] border border-[#3d3a39] bg-[#101010] px-3 text-sm text-[#f2f2f2] outline-none focus:border-red-400 disabled:cursor-not-allowed disabled:text-[#555]"
              />
              <button
                disabled={!canAdmin}
                title={disabledTitle()}
                onClick={flushContextStore}
                className="mt-3 rounded-[6px] bg-red-500 px-3 py-2 text-sm font-semibold text-white enabled:hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-[#3d3a39] disabled:text-[#555]"
              >
                Flush Context Store
              </button>
            </div>
          </div>
        </section>
      </div>
    </AuthGuard>
  );
}
