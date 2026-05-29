"use client";

import { useWebSocketContext } from "@/context/WebSocketContext";

export function WSConnectionStatus() {
  const { isConnected, reconnectAttempt, maxReconnectAttempts } =
    useWebSocketContext();

  return (
    <div
      className="flex items-center gap-2 rounded-full border border-[#3d3a39] bg-[#1a1a1a] px-3 py-1.5 text-xs text-[#bdbdbd]"
      aria-label={isConnected ? "WebSocket live" : "WebSocket reconnecting"}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          isConnected ? "bg-[#00d992]" : "bg-red-500"
        }`}
      />
      <span>
        {isConnected
          ? "Live"
          : reconnectAttempt > 0
            ? `Reconnecting (${reconnectAttempt}/${maxReconnectAttempts})...`
            : "Reconnecting..."}
      </span>
    </div>
  );
}
