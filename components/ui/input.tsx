import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-9 w-full rounded-md px-3 py-1 text-sm text-slate-900 transition-all duration-150",
        "bg-white border border-slate-200",
        "placeholder:text-slate-400",
        "focus-visible:outline-none",
        "focus-visible:border-orange-400",
        "focus-visible:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        "hover:border-slate-300",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";
