import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={cn(
      "flex min-h-20 w-full rounded-md px-3 py-2 text-sm text-slate-900 transition-all duration-150",
      "bg-white border border-slate-200",
      "placeholder:text-slate-400",
      "focus-visible:outline-none",
      "focus-visible:border-orange-400",
      "focus-visible:shadow-[0_0_0_3px_rgba(249,115,22,0.15)]",
      "hover:border-slate-300",
      "disabled:cursor-not-allowed disabled:opacity-40",
      className
    )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
