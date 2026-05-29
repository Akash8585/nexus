import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-[#00d992] text-[#101010] hover:bg-[#2fd6a1]",
  secondary: "border border-[#3d3a39] bg-[#101010] text-[#f2f2f2] hover:border-[#00d992]",
  danger: "border border-red-900 bg-red-950 text-red-200 hover:bg-red-900",
};

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center rounded-[6px] px-4 text-base font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2fd6a1] disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
