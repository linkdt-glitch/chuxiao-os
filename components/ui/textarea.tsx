import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-20 w-full rounded-md px-3 py-2 text-sm text-slate-100 transition-all duration-200",
      "bg-[rgba(8,13,28,0.85)] border border-[rgba(249,115,22,0.15)]",
      "placeholder:text-slate-600",
      "focus-visible:outline-none",
      "focus-visible:border-[rgba(249,115,22,0.55)]",
      "focus-visible:shadow-[0_0_0_3px_rgba(249,115,22,0.15),0_0_16px_rgba(249,115,22,0.12)]",
      "focus-visible:bg-[rgba(10,16,34,0.95)]",
      "hover:border-[rgba(249,115,22,0.28)]",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
