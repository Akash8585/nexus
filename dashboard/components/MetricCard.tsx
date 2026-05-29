"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type Trend = {
  direction: "up" | "down";
  value: string;
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  danger = false,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: LucideIcon;
  trend?: Trend;
  danger?: boolean;
}) {
  return (
    <article
      aria-label={`${title}: ${value}`}
      className={`rounded-[8px] border bg-[#101010] p-6 ${
        danger ? "border-red-900" : "border-[#3d3a39]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-[#8b949e]">{title}</p>
          <p className="mt-3 font-mono text-4xl font-semibold leading-none text-white">
            {value}
          </p>
          <p className="mt-3 text-xs text-[#8b949e]">{subtitle}</p>
        </div>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border border-[#3d3a39] bg-[#1a1a1a] text-[#00d992]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      </div>
      {trend ? (
        <div
          className={`mt-5 flex items-center gap-1 text-sm ${
            trend.direction === "up" ? "text-[#00d992]" : "text-red-300"
          }`}
        >
          {trend.direction === "up" ? (
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{trend.value}</span>
        </div>
      ) : null}
    </article>
  );
}
