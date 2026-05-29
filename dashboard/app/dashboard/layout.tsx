import type { ReactNode } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { WebSocketProvider } from "@/context/WebSocketContext";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <WebSocketProvider>
        <Sidebar />
        <TopBar />
        <main className="min-h-screen bg-[#101010] pl-[var(--sidebar-width)] pt-16 transition-[padding-left] duration-200">
          <div className="p-6">{children}</div>
        </main>
      </WebSocketProvider>
    </AuthGuard>
  );
}
