import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost";
};

export function Button({ className, variant = "default", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-50",
        variant === "default" && "bg-[var(--accent)] text-[#0b0f14] hover:bg-[#f0c976]",
        variant === "outline" && "border border-[var(--line)] text-[var(--foreground)] hover:bg-[var(--surface)]",
        variant === "ghost" && "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]",
        className,
      )}
      {...props}
    />
  );
}
