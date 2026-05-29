"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { FormEvent, useState } from "react";
import { Suspense } from "react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isAuthenticated } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body.detail || body.message || "Signup failed";
  } catch {
    return "Signup failed";
  }
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

    if (!name || !email || !password || !confirmPassword) {
      setError("All fields are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords must match");
      return;
    }

    setLoading(true);
    try {
      const signupUrl = token
        ? `${API_URL}/auth/signup?token=${encodeURIComponent(token)}`
        : `${API_URL}/auth/signup`;

      const response = await fetch(signupUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const data = await response.json();
      localStorage.setItem("nexus_token", data.access_token);
      localStorage.setItem("nexus_user", JSON.stringify(data.user));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  const isInviteSignup = Boolean(token);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#101010] px-4 py-12 text-[#f2f2f2]">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-[#00d992]">NEXUS</h1>
          <p className="mt-2 text-sm text-[#bdbdbd]">
            {isInviteSignup
              ? "Create your invited account"
              : "Create the first admin account"}
          </p>
        </div>

        <Card className="bg-[#1a1a1a]">
          {!isInviteSignup ? (
            <p className="mb-5 rounded-[6px] border border-[#3d3a39] bg-[#101010] px-3 py-2 text-sm text-[#bdbdbd]">
              Fresh Nexus install — the first account becomes Admin automatically.
            </p>
          ) : null}
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                required
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="h-12 w-full rounded-[6px] border border-[#3d3a39] bg-[#101010] px-4 text-sm outline-none transition focus:border-[#00d992]"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="signup-email">
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 w-full rounded-[6px] border border-[#3d3a39] bg-[#101010] px-4 text-sm outline-none transition focus:border-[#00d992]"
                autoComplete="email"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="signup-password">
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 w-full rounded-[6px] border border-[#3d3a39] bg-[#101010] px-4 text-sm outline-none transition focus:border-[#00d992]"
                autoComplete="new-password"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium" htmlFor="confirm-password">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="h-12 w-full rounded-[6px] border border-[#3d3a39] bg-[#101010] px-4 text-sm outline-none transition focus:border-[#00d992]"
                autoComplete="new-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating account..." : "Create account"}
            </Button>

            {error ? (
              <p className="rounded-[6px] border border-red-900 bg-red-950 px-3 py-2 text-sm text-red-200">
                {error}
              </p>
            ) : null}
          </form>
        </Card>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#101010] px-4 py-12 text-[#f2f2f2]">
          <Card className="bg-[#1a1a1a]">Loading invitation...</Card>
        </main>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
