"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useEffect } from "react";

import { isAuthenticated, login } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated()) {
      router.replace("/dashboard");
    }
  }, [router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password, rememberMe);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101010] px-4 py-12 text-[#f2f2f2]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#00d992]">NEXUS</h1>
          <p className="mt-2 text-sm text-[#bdbdbd]">Multi-agent coordination bus</p>
        </div>

        <Card className="bg-[#1a1a1a]">
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium text-[#f2f2f2]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-[6px] border border-[#3d3a39] bg-[#101010] px-4 text-sm text-[#f2f2f2] outline-none transition placeholder:text-[#8b949e] focus:border-[#00d992]"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-[#f2f2f2]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-[6px] border border-[#3d3a39] bg-[#101010] px-4 text-sm text-[#f2f2f2] outline-none transition placeholder:text-[#8b949e] focus:border-[#00d992]"
                autoComplete="current-password"
              />
            </div>

            <label className="flex items-center gap-3 text-sm text-[#bdbdbd]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
                className="h-4 w-4 rounded border-[#3d3a39] accent-[#00d992]"
              />
              Remember me
            </label>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>

            {error ? (
              <p className="rounded-[6px] border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
          </form>
        </Card>

        <p className="mt-5 text-center text-sm text-[#8b949e]">
          First time here?{" "}
          <Link href="/signup" className="text-[#00d992] hover:underline">
            Create admin account
          </Link>
        </p>
      </div>
    </main>
  );
}
