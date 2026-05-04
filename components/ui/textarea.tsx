import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        "border-white/75 bg-white/76 shadow-[0_1px_0_rgba(255,255,255,0.9)_inset] backdrop-blur-xl focus-visible:border-orange-200 focus-visible:bg-white focus-visible:shadow-[0_0_0_4px_rgba(238,97,25,0.12)]",
        className
      )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
