"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { isAuthenticated } from "@/lib/auth";
import { Spinner } from "@/components/ui/Spinner";

export function AuthGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied">(
    "checking",
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStatus(isAuthenticated() ? "allowed" : "denied");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (status === "denied") {
      router.replace("/login");
    }
  }, [router, status]);

  if (status !== "allowed") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#101010] text-[#f2f2f2]">
        <Spinner label="Checking access" />
      </div>
    );
  }

  return children;
}
