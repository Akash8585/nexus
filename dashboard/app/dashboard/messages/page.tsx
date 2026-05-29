"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { MessageDetailModal } from "@/components/MessageDetailModal";
import {
  MessageFilterBar,
  type MessageFilters,
} from "@/components/MessageFilterBar";
import { MessageRow, type NexusMessage } from "@/components/MessageRow";
import { Button } from "@/components/ui/Button";
import { useWebSocketContext } from "@/context/WebSocketContext";
import { getToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "";
const defaultFilters: MessageFilters = {
  topic: "all",
  agent: "all",
  correlationId: "",
};

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function applyFilters(messages: NexusMessage[], filters: MessageFilters) {
  const correlationFilter = filters.correlationId.trim().toLowerCase();

  return messages.filter((message) => {
    if (filters.topic !== "all" && message.topic !== filters.topic) {
      return false;
    }
    if (filters.agent !== "all" && message.sender_agent !== filters.agent) {
      return false;
    }
    if (
      correlationFilter &&
      !message.correlation_id.toLowerCase().includes(correlationFilter)
    ) {
      return false;
    }
    return true;
  });
}

export default function MessagesPage() {
  const { on } = useWebSocketContext();
  const listRef = useRef<HTMLDivElement | null>(null);
  const [messages, setMessages] = useState<NexusMessage[]>([]);
  const [filters, setFilters] = useState<MessageFilters>(defaultFilters);
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<NexusMessage | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const filteredMessages = useMemo(
    () => applyFilters(messages, filters),
    [messages, filters],
  );

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/messages?limit=50`, {
        headers: authHeaders(),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load messages");
      }

      const data = (await response.json()) as NexusMessage[];
      setMessages(data.slice(0, 100));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchMessages();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchMessages]);

  useEffect(() => {
    const unsubscribe = on("message.published", (data) => {
      const message = data as NexusMessage;
      const previousScrollTop = listRef.current?.scrollTop ?? 0;
      setMessages((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== message.id);
        return [message, ...withoutDuplicate].slice(0, 100);
      });

      requestAnimationFrame(() => {
        if (listRef.current) {
          if (autoScroll) {
            listRef.current.scrollTop = 0;
          } else {
            listRef.current.scrollTop = previousScrollTop;
          }
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, [autoScroll, on]);

  return (
    <div className="flex min-h-[calc(100vh-7rem)] flex-col gap-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Live Messages</h1>
          <p className="mt-2 text-sm text-[#8b949e]">
            Kafka-backed message traffic across every Nexus topic.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#3d3a39] bg-[#1a1a1a] px-3 py-2 text-sm text-[#bdbdbd]">
            Showing{" "}
            <span className="font-mono text-[#f5f6f7]">
              {filteredMessages.length}
            </span>{" "}
            messages
          </span>
          <Button
            variant={autoScroll ? "primary" : "secondary"}
            onClick={() => setAutoScroll((current) => !current)}
          >
            Auto-scroll: {autoScroll ? "ON" : "OFF"}
          </Button>
        </div>
      </header>

      <MessageFilterBar
        filters={filters}
        onChange={setFilters}
        onClear={() => setFilters(defaultFilters)}
      />

      <section className="min-h-0 flex-1 rounded-[8px] border border-[#3d3a39] bg-[#101010]">
        <div className="grid grid-cols-[minmax(90px,0.8fr)_minmax(140px,1fr)_minmax(120px,0.8fr)_minmax(220px,2fr)_minmax(80px,0.6fr)_minmax(64px,0.5fr)] gap-4 border-b border-[#3d3a39] bg-[#1a1a1a] px-4 py-3 text-xs font-medium uppercase text-[#8b949e]">
          <span>Topic</span>
          <span>Sender</span>
          <span>Run</span>
          <span>Payload</span>
          <span>Time</span>
          <span>Latency</span>
        </div>

        <div ref={listRef} className="max-h-[62vh] overflow-auto">
          {isLoading ? (
            <div className="flex h-72 items-center justify-center text-sm text-[#8b949e]">
              Loading messages...
            </div>
          ) : error ? (
            <div className="flex h-72 items-center justify-center text-sm text-red-300">
              {error}
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex h-72 items-center justify-center text-sm text-[#8b949e]">
              No messages match the current filters
            </div>
          ) : (
            filteredMessages.map((message) => (
              <MessageRow
                key={message.id}
                message={message}
                onClick={() => setSelectedMessage(message)}
              />
            ))
          )}
        </div>
      </section>

      <MessageDetailModal
        message={selectedMessage}
        isOpen={selectedMessage !== null}
        onClose={() => setSelectedMessage(null)}
      />
    </div>
  );
}
