import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
      className={cn(
        "flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
        "border-white/75 bg-white/72 shadow-[0_1px_0_rgba(255,255,255,0.86)_inset] backdrop-blur-xl focus-visible:bg-white",
        className
      )}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";
