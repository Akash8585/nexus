"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopNav } from "@/components/layout/TopNav";

const publicRoutes = ["/", "/login", "/signup", "/setup"];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }

    return pathname.startsWith(route);
  });

  if (isPublicRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopNav />
        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
