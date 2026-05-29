"use client";

import { X } from "lucide-react";
import Link from "next/link";

import {
  type NexusMessage,
  shortTopic,
  topicTone,
} from "@/components/MessageRow";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

export function MessageDetailModal({
  message,
  isOpen,
  onClose,
}: {
  message: NexusMessage | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen || !message) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <section
        className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[8px] border border-[#3d3a39] bg-[#101010] shadow-[0_20px_60px_rgba(0,0,0,0.7)]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-[#3d3a39] px-5 py-4">
          <h2 className="text-lg font-semibold text-white">Message Details</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-[6px] border border-[#3d3a39] text-[#bdbdbd] transition hover:border-[#00d992] hover:text-white"
            aria-label="Close message details"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid max-h-[62vh] gap-5 overflow-y-auto p-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
            <h3 className="text-sm font-semibold text-white">Metadata</h3>
            <dl className="mt-4 space-y-4 text-sm">
              <div>
                <dt className="text-xs text-[#8b949e]">ID</dt>
                <dd className="mt-1 break-all font-mono text-[#f5f6f7]">
                  {message.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8b949e]">Topic</dt>
                <dd className="mt-1">
                  <Badge tone={topicTone(message.topic)}>
                    {shortTopic(message.topic)}
                  </Badge>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8b949e]">Sender</dt>
                <dd className="mt-1">
                  <Link
                    href={`/dashboard/agents/${encodeURIComponent(message.sender_agent)}`}
                    className="font-semibold text-[#f2f2f2] transition hover:text-[#00d992]"
                  >
                    {message.sender_agent}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8b949e]">Correlation ID</dt>
                <dd className="mt-1">
                  <Link
                    href={`/dashboard/pipelines/${encodeURIComponent(message.correlation_id)}`}
                    className="break-all font-mono text-[#bdbdbd] transition hover:text-[#00d992]"
                  >
                    {message.correlation_id}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8b949e]">Timestamp</dt>
                <dd className="mt-1 font-mono text-[#bdbdbd]">
                  {new Date(message.timestamp).toISOString()}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#8b949e]">Retry count</dt>
                <dd className="mt-1 font-mono text-[#f5f6f7]">
                  {message.retry_count}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] p-4">
            <h3 className="text-sm font-semibold text-white">Payload</h3>
            <pre className="mt-4 max-h-[420px] overflow-auto rounded-[8px] border border-[#3d3a39] bg-[#101010] p-4 font-mono text-xs leading-5 text-[#f5f6f7]">
              {JSON.stringify(message.payload, null, 2)}
            </pre>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-[#3d3a39] px-5 py-4 sm:flex-row sm:justify-end">
          <Link href={`/dashboard/pipelines/${encodeURIComponent(message.correlation_id)}`}>
            <Button variant="primary" className="w-full sm:w-auto">
              View Pipeline Run
            </Button>
          </Link>
          <Link href={`/dashboard/agents/${encodeURIComponent(message.sender_agent)}`}>
            <Button variant="secondary" className="w-full sm:w-auto">
              View Agent
            </Button>
          </Link>
        </footer>
      </section>
    </div>
  );
}
