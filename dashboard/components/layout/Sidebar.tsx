import {
  Activity,
  Cable,
  FileText,
  Gauge,
  KeyRound,
  MailWarning,
  Route,
  Users,
} from "lucide-react";
import Link from "next/link";

const navItems = [
  { href: "/", label: "Overview", icon: Gauge },
  { href: "/dashboard/topology", label: "Topology", icon: Route },
  { href: "/dashboard/messages", label: "Messages", icon: Cable },
  { href: "/dashboard/pipelines", label: "Pipelines", icon: Activity },
  { href: "/dashboard/agents", label: "Agents", icon: Users },
  { href: "/dashboard/deadletter", label: "Dead Letter", icon: MailWarning },
  { href: "/dashboard/keys", label: "API Keys", icon: KeyRound },
  { href: "/dashboard/docs", label: "Runbook", icon: FileText },
];

export function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-[#3d3a39] bg-[#101010] px-4 py-5 lg:block">
      <Link href="/" className="flex items-center gap-3 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#00d992] text-sm font-bold text-[#101010]">
          N
        </span>
        <span>
          <span className="block text-sm font-semibold text-white">Nexus</span>
          <span className="block text-xs text-[#8b949e]">Agent Bus</span>
        </span>
      </Link>

      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-[6px] px-3 py-2 text-sm text-[#bdbdbd] transition hover:bg-[#1a1a1a] hover:text-white"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
