export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-zinc-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-indigo-500" />
      <span>{label}</span>
    </span>
  );
}
