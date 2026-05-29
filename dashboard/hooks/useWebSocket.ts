"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getToken } from "@/lib/auth";
import { NexusWebSocket, type WebSocketHandler } from "@/lib/websocket";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

export function useWebSocket() {
  const wsRef = useRef<NexusWebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token || !WS_URL) {
      return;
    }

    const ws = new NexusWebSocket(WS_URL, token);
    wsRef.current = ws;
    const unsubscribeConnected = ws.on("connected", () => setIsConnected(true));
    const unsubscribeDisconnected = ws.on("disconnected", () => setIsConnected(false));
    ws.connect();

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      ws.disconnect();
      wsRef.current = null;
    };
  }, []);

  const on = useCallback((eventType: string, callback: WebSocketHandler) => {
    return wsRef.current?.on(eventType, callback) || (() => undefined);
  }, []);

  const off = useCallback((eventType: string, callback: WebSocketHandler) => {
    wsRef.current?.off(eventType, callback);
  }, []);

  const send = useCallback((data: object) => {
    wsRef.current?.send(data);
  }, []);

  return { isConnected, on, off, send };
}
