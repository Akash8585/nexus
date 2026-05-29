"use client";

import { CheckCircle, Copy, MailPlus, Shield, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AuthGuard } from "@/components/AuthGuard";
import { getToken, getUser, isAdmin } from "@/lib/auth";

const API_URL = "/api/nexus/proxy";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "viewer";
  status?: string;
  created_at?: string;
  last_login?: string | null;
};

type InviteResponse = {
  message: string;
  email: string;
  role: "admin" | "viewer";
  invite_link: string;
  token: string;
  expires_in: string;
};

function authHeaders(contentType = false): HeadersInit {
  const token = getToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(contentType ? { "Content-Type": "application/json" } : {}),
  };
}

function relativeTime(value?: string | null) {
  if (!value) return "Never";
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

async function readError(response: Response) {
  try {
    const body = await response.json();
    return body.detail || body.message || "Request failed";
  } catch {
    return "Request failed";
  }
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [allowed, setAllowed] = useState(false);
  const [checkedAccess, setCheckedAccess] = useState(false);
  const [currentUserId, setCurrentUserId] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "viewer">("viewer");
  const [inviteResult, setInviteResult] = useState<InviteResponse | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  const refreshTeam = useCallback(async () => {
    const response = await fetch(`${API_URL}/team`, {
      headers: authHeaders(),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(await readError(response));
    setMembers(await response.json());
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const user = getUser();
      const admin = isAdmin();
      setCurrentUserId(user?.id || "");
      setAllowed(admin);
      setCheckedAccess(true);
      if (admin) {
        refreshTeam().catch((err) =>
          setError(err instanceof Error ? err.message : "Failed to load team"),
        );
      }
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [refreshTeam]);

  const orderedMembers = useMemo(
    () => [...members].sort((a, b) => a.email.localeCompare(b.email)),
    [members],
  );

  async function inviteMember() {
    const response = await fetch(`${API_URL}/team/invite`, {
      method: "POST",
      headers: authHeaders(true),
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setInviteResult(await response.json());
    setError("");
  }

  async function copyInviteLink() {
    if (!inviteResult) return;
    await navigator.clipboard.writeText(inviteResult.invite_link);
    setCopiedInvite(true);
    window.setTimeout(() => setCopiedInvite(false), 2000);
  }

  function closeInviteModal() {
    setShowInvite(false);
    setInviteEmail("");
    setInviteRole("viewer");
    setInviteResult(null);
    setCopiedInvite(false);
  }

  async function updateRole(member: TeamMember, role: "admin" | "viewer") {
    const response = await fetch(`${API_URL}/team/${encodeURIComponent(member.id)}/role`, {
      method: "PATCH",
      headers: authHeaders(true),
      body: JSON.stringify({ role }),
    });

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    const updated = await response.json();
    setMembers((current) => current.map((item) => (item.id === member.id ? updated : item)));
  }

  async function removeMember(member: TeamMember) {
    if (!window.confirm(`Remove ${member.name}? They will lose access immediately.`)) return;

    const response = await fetch(`${API_URL}/team/${encodeURIComponent(member.id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });

    if (!response.ok) {
      setError(await readError(response));
      return;
    }

    setMembers((current) => current.filter((item) => item.id !== member.id));
    setToast(`${member.name} removed`);
    window.setTimeout(() => setToast(""), 2500);
  }

  if (checkedAccess && !allowed) {
    return (
      <AuthGuard>
        <div className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-8">
          <h1 className="text-2xl font-semibold text-white">Admin access required</h1>
          <p className="mt-2 text-sm text-[#8b949e]">Team settings can only be managed by admins.</p>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className="flex flex-col gap-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">Team</h1>
            <p className="mt-2 text-sm text-[#8b949e]">Manage admins, viewers, and invitations.</p>
          </div>
          <button
            onClick={() => {
              setShowInvite(true);
              setInviteResult(null);
              setCopiedInvite(false);
            }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[6px] bg-[#00d992] px-4 text-sm font-semibold text-[#101010] hover:bg-[#2fd6a1]"
          >
            <MailPlus className="h-4 w-4" />
            Invite Member
          </button>
        </header>

        {toast ? (
          <div className="rounded-[8px] border border-[#00d992] bg-[#00d992]/10 px-4 py-3 text-sm text-[#2fd6a1]">
            {toast}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-[8px] border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[8px] border border-[#3d3a39] bg-[#101010]">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-[#3d3a39] bg-[#1a1a1a] text-xs text-[#8b949e]">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Role</th>
                  <th className="px-4 py-3 font-medium">Joined</th>
                  <th className="px-4 py-3 font-medium">Last login</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orderedMembers.map((member) => {
                  const isSelf = member.id === currentUserId;
                  return (
                    <tr key={member.id} className="border-b border-[#3d3a39] last:border-0">
                      <td className="px-4 py-4 font-medium text-white">{member.name}</td>
                      <td className="px-4 py-4 text-[#bdbdbd]">{member.email}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`rounded-full border px-2 py-1 text-xs ${
                            member.role === "admin"
                              ? "border-indigo-400/40 bg-indigo-400/10 text-indigo-200"
                              : "border-[#3d3a39] bg-[#1a1a1a] text-[#bdbdbd]"
                          }`}
                        >
                          {member.role === "admin" ? "Admin" : "Viewer"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-[#8b949e]">{relativeTime(member.created_at)}</td>
                      <td className="px-4 py-4 text-[#8b949e]">{relativeTime(member.last_login)}</td>
                      <td className="px-4 py-4 text-[#bdbdbd]">{member.status || "active"}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <select
                            value={member.role}
                            disabled={isSelf}
                            title={isSelf ? "You cannot change your own role" : "Change role"}
                            onChange={(event) =>
                              updateRole(member, event.target.value as "admin" | "viewer")
                            }
                            className="rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 py-2 text-xs text-[#f2f2f2] disabled:cursor-not-allowed disabled:text-[#555]"
                          >
                            <option value="admin">Admin</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <button
                            disabled={isSelf}
                            title={isSelf ? "You cannot remove yourself" : "Remove member"}
                            onClick={() => removeMember(member)}
                            className="inline-flex items-center gap-2 rounded-[6px] border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-300 enabled:hover:bg-red-500/10 disabled:cursor-not-allowed disabled:border-[#3d3a39] disabled:text-[#555]"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {showInvite ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-md rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6 shadow-2xl">
              {!inviteResult ? (
                <>
                  <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                    <Shield className="h-5 w-5 text-[#00d992]" />
                    Invite Member
                  </h2>
                  <div className="mt-5 flex flex-col gap-4">
                    <label className="flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
                      Email
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(event) => setInviteEmail(event.target.value)}
                        className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none focus:border-[#00d992]"
                      />
                    </label>
                    <label className="flex flex-col gap-2 text-xs font-medium text-[#8b949e]">
                      Role
                      <select
                        value={inviteRole}
                        onChange={(event) => setInviteRole(event.target.value as "admin" | "viewer")}
                        className="min-h-11 rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-4 text-sm text-[#f2f2f2] outline-none focus:border-[#00d992]"
                      >
                        <option value="admin">Admin</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </label>
                  </div>
                  <div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={closeInviteModal}
                      className="rounded-[6px] border border-[#3d3a39] px-4 py-2 text-sm font-semibold text-[#f2f2f2]"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={inviteMember}
                      className="rounded-[6px] bg-[#00d992] px-4 py-2 text-sm font-semibold text-[#101010]"
                    >
                      Send Invite
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center text-center">
                    <CheckCircle className="h-12 w-12 text-[#00d992]" />
                    <h2 className="mt-4 text-xl font-semibold text-white">Invitation created!</h2>
                    <p className="mt-2 text-sm text-[#8b949e]">
                      Share this link with {inviteResult.email}:
                    </p>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <code className="min-w-0 flex-1 overflow-x-auto rounded-[6px] border border-[#3d3a39] bg-[#1a1a1a] px-3 py-3 font-mono text-xs text-[#f2f2f2]">
                      {inviteResult.invite_link}
                    </code>
                    <button
                      onClick={copyInviteLink}
                      className="inline-flex shrink-0 items-center gap-2 rounded-[6px] border border-[#3d3a39] px-3 py-2 text-sm font-semibold text-[#f2f2f2] hover:border-[#00d992]"
                    >
                      <Copy className="h-4 w-4" />
                      {copiedInvite ? "Copied ✓" : "Copy"}
                    </button>
                  </div>
                  <p className="mt-4 text-xs leading-5 text-[#8b949e]">
                    This link expires in 48 hours. In production this would be sent automatically via email.
                  </p>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={closeInviteModal}
                      className="rounded-[6px] bg-[#00d992] px-4 py-2 text-sm font-semibold text-[#101010]"
                    >
                      Done
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}
