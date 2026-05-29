"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { isAuthenticated } from "@/lib/auth";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAllowed] = useState(() => isAuthenticated());

  useEffect(() => {
    if (!isAllowed) {
      router.replace("/login");
    }
  }, [isAllowed, router]);

  if (!isAllowed) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101010] text-[#f2f2f2]">
        <Spinner label="Checking access" />
      </div>
    );
  }

  return children;
}
