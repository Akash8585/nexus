import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-md border border-dashed border-zinc-800 px-6 py-10 text-center">
      <Icon className="h-8 w-8 text-zinc-600" aria-hidden="true" />
      <h3 className="mt-3 text-sm font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>
    </div>
  );
}
