import { Bell, CircleUserRound, Search } from "lucide-react";

export function TopNav() {
  return (
    <header className="flex h-16 items-center justify-between border-b border-[#3d3a39] bg-[#101010] px-4 lg:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <Search className="h-4 w-4 text-[#8b949e]" aria-hidden="true" />
        <span className="truncate text-sm text-[#8b949e]">Search agents, runs, messages</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#3d3a39] text-[#bdbdbd] transition hover:border-[#00d992] hover:text-white"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#3d3a39] text-[#bdbdbd] transition hover:border-[#00d992] hover:text-white"
          aria-label="Account"
        >
          <CircleUserRound className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
