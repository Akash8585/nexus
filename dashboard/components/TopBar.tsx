"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getToken, getUser, type User } from "@/lib/auth";
import { WSConnectionStatus } from "@/components/WSConnectionStatus";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/topology": "Topology",
  "/dashboard/messages": "Live Messages",
  "/dashboard/agents": "Agents",
  "/dashboard/pipelines": "Pipeline History",
  "/dashboard/topics": "Topics",
  "/dashboard/deadletter": "Dead Letter Queue",
  "/dashboard/settings": "Settings",
};

type StatusKey = "api" | "kafka" | "redis";
type SystemStatus = Record<StatusKey, boolean>;

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const API_BASE_URL = API_URL.replace(/\/api\/v1\/?$/, "");

async function checkEndpoint(url: string, token?: string | null) {
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  return response.ok;
}

function StatusDot({
  label,
  healthy,
}: {
  label: string;
  healthy: boolean;
}) {
  return (
    <span
      className="group relative inline-flex h-8 w-8 items-center justify-center"
      aria-label={`${label}: ${healthy ? "online" : "offline"}`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          healthy ? "bg-[#00d992]" : "bg-red-500"
        }`}
      />
      <span className="pointer-events-none absolute top-9 hidden rounded-[6px] border border-[#3d3a39] bg-[#101010] px-2 py-1 text-xs text-[#f2f2f2] group-hover:block">
        {label}
      </span>
    </span>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<SystemStatus>({
    api: false,
    kafka: false,
    redis: false,
  });

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | undefined;

    const timeoutId = window.setTimeout(() => {
      const currentToken = getToken();
      setUser(getUser());

      async function pollStatus() {
        const nextStatus: SystemStatus = {
          api: false,
          kafka: false,
          redis: false,
        };

        try {
          nextStatus.api = await checkEndpoint(`${API_BASE_URL}/health`);
        } catch {
          nextStatus.api = false;
        }

        try {
          nextStatus.kafka = await checkEndpoint(`${API_URL}/topics`, currentToken);
        } catch {
          nextStatus.kafka = false;
        }

        try {
          nextStatus.redis = await checkEndpoint(
            `${API_URL}/context/status-check`,
            currentToken,
          );
        } catch {
          nextStatus.redis = false;
        }

        if (!cancelled) {
          setStatus(nextStatus);
        }
      }

      pollStatus();
      intervalId = window.setInterval(pollStatus, 30000);
    }, 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (intervalId !== undefined) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  const title = pageTitles[pathname] || "Dashboard";
  const initial = user?.name?.trim().charAt(0).toUpperCase() || "N";

  return (
    <header className="fixed right-0 top-0 z-30 flex h-16 items-center justify-between border-b border-[#3d3a39] bg-[#101010] px-6 transition-[left] duration-200 left-[var(--sidebar-width)]">
      <h1 className="text-xl font-semibold text-white">{title}</h1>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1" aria-label="System status">
          <StatusDot label="API" healthy={status.api} />
          <StatusDot label="Kafka" healthy={status.kafka} />
          <StatusDot label="Redis" healthy={status.redis} />
        </div>
        <WSConnectionStatus />
        <div className="flex items-center gap-2 border-l border-[#3d3a39] pl-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#00d992] text-sm font-semibold text-[#101010]">
            {initial}
          </span>
          <span className="rounded-full border border-[#3d3a39] px-2.5 py-1 text-xs text-[#bdbdbd]">
            {user?.role === "admin" ? "Admin" : "Viewer"}
          </span>
        </div>
      </div>
    </header>
  );
}
