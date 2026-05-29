"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { getToken } from "@/lib/auth";
import { NexusWebSocket, type WebSocketHandler } from "@/lib/websocket";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";

type WebSocketContextValue = {
  client: NexusWebSocket | null;
  isConnected: boolean;
  reconnectAttempt: number;
  maxReconnectAttempts: number;
  on: (eventType: string, callback: WebSocketHandler) => () => void;
  off: (eventType: string, callback: WebSocketHandler) => void;
  send: (data: object) => void;
};

const WebSocketContext = createContext<WebSocketContextValue | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
  const clientRef = useRef<NexusWebSocket | null>(null);
  const [client, setClient] = useState<NexusWebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [maxReconnectAttempts, setMaxReconnectAttempts] = useState(10);

  useEffect(() => {
    const token = getToken();
    if (!token || !WS_URL) {
      return;
    }

    const client = new NexusWebSocket(WS_URL, token);
    clientRef.current = client;
    const stateTimeoutId = window.setTimeout(() => {
      setClient(client);
      setMaxReconnectAttempts(client.getMaxReconnectAttempts());
    }, 0);

    const unsubscribeConnected = client.on("connected", () => {
      setIsConnected(true);
      setReconnectAttempt(0);
    });
    const unsubscribeDisconnected = client.on("disconnected", () => {
      setIsConnected(false);
    });
    const unsubscribeReconnecting = client.on("reconnecting", (data) => {
      const reconnect = data as { attempt?: number; max?: number } | undefined;
      setIsConnected(false);
      setReconnectAttempt(reconnect?.attempt || client.getReconnectAttempts());
      setMaxReconnectAttempts(reconnect?.max || client.getMaxReconnectAttempts());
    });

    client.connect();

    return () => {
      unsubscribeConnected();
      unsubscribeDisconnected();
      unsubscribeReconnecting();
      window.clearTimeout(stateTimeoutId);
      client.disconnect();
      clientRef.current = null;
      setClient(null);
    };
  }, []);

  const on = useCallback((eventType: string, callback: WebSocketHandler) => {
    return clientRef.current?.on(eventType, callback) || (() => undefined);
  }, []);

  const off = useCallback((eventType: string, callback: WebSocketHandler) => {
    clientRef.current?.off(eventType, callback);
  }, []);

  const send = useCallback((data: object) => {
    clientRef.current?.send(data);
  }, []);

  const value = useMemo(
    () => ({
      client,
      isConnected,
      reconnectAttempt,
      maxReconnectAttempts,
      on,
      off,
      send,
    }),
    [client, isConnected, maxReconnectAttempts, off, on, reconnectAttempt, send],
  );

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocketContext() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocketContext must be used inside WebSocketProvider");
  }
  return context;
}
