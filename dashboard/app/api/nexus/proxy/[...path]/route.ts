import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forward(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetUrl = new URL(`${API_URL}/${path.map(encodeURIComponent).join("/")}`);
  request.nextUrl.searchParams.forEach((value, key) => {
    targetUrl.searchParams.set(key, value);
  });

  const headers: HeadersInit = {};
  const authorization = request.headers.get("authorization");
  const contentType = request.headers.get("content-type");
  if (authorization) headers.Authorization = authorization;
  if (contentType) headers["Content-Type"] = contentType;

  const method = request.method;
  const hasBody = !["GET", "HEAD"].includes(method);
  const body = hasBody ? await request.text() : undefined;
  let response: Response;

  try {
    response = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  } catch {
    if (targetUrl.hostname !== "localhost") {
      throw new Error("Nexus API is unreachable");
    }
    targetUrl.hostname = "127.0.0.1";
    response = await fetch(targetUrl, {
      method,
      headers,
      body,
      cache: "no-store",
    });
  }

  const text = await response.text();
  return new NextResponse(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") || "application/json",
    },
  });
}

export async function GET(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return forward(request, context);
}
