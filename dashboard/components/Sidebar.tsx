"use client";

import {
  AlertTriangle,
  Bot,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  Home,
  Layers,
  LogOut,
  Mail,
  Network,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { getUser, logout, type User } from "@/lib/auth";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: Home },
  { label: "Topology", href: "/dashboard/topology", icon: Network },
  { label: "Messages", href: "/dashboard/messages", icon: Mail },
  { label: "Agents", href: "/dashboard/agents", icon: Bot },
  { label: "Pipelines", href: "/dashboard/pipelines", icon: GitBranch },
  { label: "Topics", href: "/dashboard/topics", icon: Layers },
  { label: "Dead Letter", href: "/dashboard/deadletter", icon: AlertTriangle },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

const EXPANDED_WIDTH = 220;
const COLLAPSED_WIDTH = 48;

function setSidebarWidth(collapsed: boolean) {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.style.setProperty(
    "--sidebar-width",
    `${collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH}px`,
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const userInitial = user?.name?.trim().charAt(0).toUpperCase() || "N";

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const saved = localStorage.getItem("nexus_sidebar_collapsed") === "true";
      setCollapsed(saved);
      setSidebarWidth(saved);
      setUser(getUser());
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    setSidebarWidth(next);
    localStorage.setItem("nexus_sidebar_collapsed", String(next));
  }

  return (
    <aside
      className="fixed inset-y-0 left-0 z-40 flex flex-col border-r border-[#3d3a39] bg-[#101010] transition-[width] duration-200"
      style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
    >
      <div className="flex h-16 items-center justify-between border-b border-[#3d3a39] px-3">
        <Link
          href="/dashboard"
          className="min-w-0 text-xl font-bold text-[#00d992]"
          aria-label="Nexus dashboard"
        >
          {collapsed ? "N" : "NEXUS"}
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] border border-[#3d3a39] text-[#bdbdbd] transition hover:border-[#00d992] hover:text-white"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex h-11 items-center gap-3 rounded-[6px] px-3 text-sm transition ${
                active
                  ? "bg-[#00d992] text-[#101010]"
                  : "text-[#bdbdbd] hover:bg-[#1a1a1a] hover:text-white"
              } ${collapsed ? "justify-center px-0" : ""}`}
              data-active={active ? "true" : "false"}
            >
              <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#3d3a39] p-2">
        <div
          className={`mb-2 flex items-center gap-3 rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-2 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00d992] text-sm font-semibold text-[#101010]">
            {userInitial}
          </span>
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {user?.name || "Nexus User"}
              </p>
              <span className="mt-1 inline-flex rounded-full border border-[#3d3a39] px-2 py-0.5 text-xs text-[#bdbdbd]">
                {user?.role === "admin" ? "Admin" : "Viewer"}
              </span>
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={logout}
          className={`flex h-11 w-full items-center gap-3 rounded-[6px] px-3 text-sm text-[#bdbdbd] transition hover:bg-[#1a1a1a] hover:text-white ${
            collapsed ? "justify-center px-0" : ""
          }`}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!collapsed ? <span>Logout</span> : null}
        </button>
      </div>
    </aside>
  );
}
