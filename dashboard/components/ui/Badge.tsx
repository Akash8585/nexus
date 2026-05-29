import type { ReactNode } from "react";

type BadgeTone =
  | "default"
  | "active"
  | "idle"
  | "dead"
  | "research"
  | "analysis"
  | "writing"
  | "delivery";

const tones: Record<BadgeTone, string> = {
  default: "border-zinc-700 bg-zinc-900 text-zinc-300",
  active: "border-green-900 bg-green-950 text-green-300",
  idle: "border-zinc-700 bg-zinc-900 text-zinc-300",
  dead: "border-red-900 bg-red-950 text-red-300",
  research: "border-teal-900 bg-teal-950 text-teal-300",
  analysis: "border-violet-900 bg-violet-950 text-violet-300",
  writing: "border-amber-900 bg-amber-950 text-amber-300",
  delivery: "border-rose-900 bg-rose-950 text-rose-300",
};

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: BadgeTone;
}) {
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  );
}
