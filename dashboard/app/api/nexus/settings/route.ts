import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    kafkaBroker: process.env.KAFKA_BROKER || "localhost:9092",
    redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
    apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1",
  });
}
