import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-[8px] border border-[#3d3a39] bg-[#101010] p-6 text-[#f2f2f2] ${className}`}>
      {children}
    </section>
  );
}
