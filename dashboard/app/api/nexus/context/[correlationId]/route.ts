import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ correlationId: string }> },
) {
  const { correlationId } = await params;
  const authorization = request.headers.get("authorization");

  const response = await fetch(
    `${API_URL}/context/${encodeURIComponent(correlationId)}`,
    {
      headers: authorization ? { Authorization: authorization } : {},
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({}, { status: response.status });
  }

  return NextResponse.json(await response.json());
}
