"use client";

import { useCallback, useEffect, useState } from "react";

import { useWebSocket } from "@/hooks/useWebSocket";
import type { WebSocketHandler } from "@/lib/websocket";

type Message = Record<string, unknown>;
type Agent = Record<string, unknown>;
type Pipeline = Record<string, unknown>;

export function useLiveData() {
  const { isConnected, on, off } = useWebSocket();
  const [latestMessage, setLatestMessage] = useState<Message | null>(null);
  const [latestAgent, setLatestAgent] = useState<Agent | null>(null);
  const [latestPipeline, setLatestPipeline] = useState<Pipeline | null>(null);

  useEffect(() => {
    const unsubscribers = [
      on("message.published", (data) => setLatestMessage((data || null) as Message | null)),
      on("agent.registered", (data) => setLatestAgent((data || null) as Agent | null)),
      on("agent.heartbeat", (data) => setLatestAgent((data || null) as Agent | null)),
      on("agent.dead", (data) => setLatestAgent((data || null) as Agent | null)),
      on("pipeline.started", (data) => setLatestPipeline((data || null) as Pipeline | null)),
      on("pipeline.completed", (data) => setLatestPipeline((data || null) as Pipeline | null)),
      on("pipeline.failed", (data) => setLatestPipeline((data || null) as Pipeline | null)),
    ];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, [on]);

  const onMessage = useCallback(
    (callback: WebSocketHandler) => on("message.published", callback),
    [on],
  );
  const onAgent = useCallback(
    (callback: WebSocketHandler) => {
      const unsubscribers = [
        on("agent.registered", callback),
        on("agent.heartbeat", callback),
        on("agent.dead", callback),
      ];
      return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
    [on],
  );
  const onPipeline = useCallback(
    (callback: WebSocketHandler) => {
      const unsubscribers = [
        on("pipeline.started", callback),
        on("pipeline.completed", callback),
        on("pipeline.failed", callback),
      ];
      return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
    },
    [on],
  );

  return {
    isConnected,
    latestMessage,
    latestAgent,
    latestPipeline,
    onMessage,
    onAgent,
    onPipeline,
    off,
  };
}
