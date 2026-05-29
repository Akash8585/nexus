import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type Agent = {
  name: string;
  status: string;
};

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return NextResponse.json({ detail: "Missing Authorization header" }, { status: 401 });
  }

  const agentsResponse = await fetch(`${API_URL}/agents`, {
    headers: { Authorization: authorization },
    cache: "no-store",
  });

  if (!agentsResponse.ok) {
    return NextResponse.json(
      { detail: "Failed to load agents" },
      { status: agentsResponse.status },
    );
  }

  const agents = (await agentsResponse.json()) as Agent[];
  const staleAgents = agents.filter(
    (agent) => agent.status === "dead" || agent.status === "deregistered",
  );

  let removed = 0;
  for (const agent of staleAgents) {
    const response = await fetch(`${API_URL}/agents/${encodeURIComponent(agent.name)}`, {
      method: "DELETE",
      headers: { Authorization: authorization },
    });
    if (response.ok) {
      removed += 1;
    }
  }

  return NextResponse.json({ removed });
}
