"use client";

import { CheckCircle, XCircle } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import {
  type NexusMessage,
  shortTopic,
  topicTone,
} from "@/components/MessageRow";
import { Badge } from "@/components/ui/Badge";

function relativeTime(timestamp: string) {
  const diffSeconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
  );
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  return `${Math.floor(diffSeconds / 86400)}d ago`;
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function avatarColor(agentName: string) {
  if (agentName.includes("scout")) return "bg-teal-950 text-teal-300";
  if (agentName.includes("analyst")) return "bg-violet-950 text-violet-300";
  if (agentName.includes("writer")) return "bg-amber-950 text-amber-300";
  if (agentName.includes("deliverer")) return "bg-orange-950 text-orange-300";
  return "bg-[#1a1a1a] text-[#00d992]";
}

function stepState(index: number, currentStep: number, message: NexusMessage) {
  const payloadText = JSON.stringify(message.payload).toLowerCase();
  if (payloadText.includes("failed") || message.topic === "nexus.deadletter") {
    return "failed";
  }
  if (currentStep === index + 1) return "active";
  if (currentStep > index + 1) return "completed";
  return "pending";
}

function latency(previous: NexusMessage | undefined, current: NexusMessage) {
  if (!previous) return 0;
  return Math.max(
    0,
    new Date(current.timestamp).getTime() - new Date(previous.timestamp).getTime(),
  );
}

export function PipelineTimeline({
  messages,
  currentStep,
  isPlaying,
  onSelectMessage,
}: {
  messages: NexusMessage[];
  currentStep: number;
  isPlaying: boolean;
  onSelectMessage: (message: NexusMessage) => void;
}) {
  const stepRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const sortedMessages = useMemo(
    () =>
      [...messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      ),
    [messages],
  );

  useEffect(() => {
    if (!isPlaying || currentStep === 0) return;
    stepRefs.current[currentStep - 1]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, [currentStep, isPlaying]);

  if (sortedMessages.length === 0) {
    return (
      <section className="rounded-[8px] border border-dashed border-[#3d3a39] bg-[#101010] p-10 text-center text-sm text-[#8b949e]">
        No messages recorded for this run
      </section>
    );
  }

  return (
    <section className="rounded-[8px] border border-[#3d3a39] bg-[#101010] p-5">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">Step Timeline</h2>
        <p className="mt-1 text-sm text-[#8b949e]">
          Replay message flow across agents and topics.
        </p>
      </div>

      <div className="space-y-4">
        {sortedMessages.map((message, index) => {
          const state = stepState(index, currentStep, message);
          const isLast = index === sortedMessages.length - 1;
          const payloadPreview = truncate(JSON.stringify(message.payload), 40);
          const latencyMs = latency(sortedMessages[index - 1], message);

          return (
            <button
              key={message.id}
              ref={(element) => {
                stepRefs.current[index] = element;
              }}
              type="button"
              onClick={() => onSelectMessage(message)}
              className={`grid w-full gap-4 rounded-[8px] border bg-[#101010] p-4 text-left transition md:grid-cols-[1fr_120px_2fr] ${
                state === "active"
                  ? "border-sky-800 border-l-4 bg-sky-950/20 shadow-[0_0_18px_rgba(14,165,233,0.2)]"
                  : ""
              } ${
                state === "completed" ? "border-green-900 border-l-4" : ""
              } ${state === "pending" ? "border-[#3d3a39] opacity-40" : ""} ${
                state === "failed" ? "border-red-900 border-l-4 bg-red-950/20" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#3d3a39] font-semibold ${avatarColor(
                    message.sender_agent,
                  )}`}
                >
                  {message.sender_agent.slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {message.sender_agent}
                  </p>
                  <p className="mt-1 text-xs text-[#8b949e]">Step {index + 1}</p>
                </div>
              </div>

              <div className="relative flex items-center justify-start gap-3 md:flex-col md:justify-center">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border ${
                    state === "failed"
                      ? "border-red-900 bg-red-950 text-red-300"
                      : "border-green-900 bg-green-950 text-green-300"
                  }`}
                >
                  {state === "failed" ? (
                    <XCircle className="h-4 w-4" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                </span>
                {!isLast ? (
                  <span className="hidden h-8 w-px bg-[#3d3a39] md:block" />
                ) : null}
                <span className="hidden text-[#8b949e] md:block">↓</span>
                <Badge tone={topicTone(message.topic)}>{shortTopic(message.topic)}</Badge>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="text-xs text-[#8b949e]"
                    title={new Date(message.timestamp).toISOString()}
                  >
                    {relativeTime(message.timestamp)}
                  </span>
                  <span className="rounded-full border border-[#3d3a39] bg-[#1a1a1a] px-2 py-1 font-mono text-xs text-[#bdbdbd]">
                    {latencyMs}ms
                  </span>
                </div>
                <p className="mt-2 truncate font-mono text-xs leading-5 text-[#bdbdbd]">
                  {payloadPreview}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
