"use client";

import { CheckCircle, LoaderCircle, XCircle } from "lucide-react";

export type PipelineStatus = "running" | "completed" | "failed";

export function PipelineStatusBadge({ status }: { status: PipelineStatus }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center rounded-full border border-sky-900 bg-sky-950 px-3 py-1 text-xs font-medium text-sky-300">
        <LoaderCircle className="mr-2 h-3.5 w-3.5 animate-spin" />
        Running
      </span>
    );
  }

  if (status === "completed") {
    return (
      <span className="inline-flex items-center rounded-full border border-green-900 bg-green-950 px-3 py-1 text-xs font-medium text-green-300">
        <CheckCircle className="mr-2 h-3.5 w-3.5" />
        Completed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center rounded-full border border-red-900 bg-red-950 px-3 py-1 text-xs font-medium text-red-300">
      <XCircle className="mr-2 h-3.5 w-3.5" />
      Failed
    </span>
  );
}
