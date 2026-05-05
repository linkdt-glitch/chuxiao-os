import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, style: styleProp, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-spotlight
      className={cn(
        "relative rounded-xl text-card-foreground transition-all duration-300 hover:-translate-y-0.5",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(12,18,36,0.92) 0%, rgba(7,12,24,0.88) 100%)",
        border: "1px solid rgba(249,115,22,0.14)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.04), 0 0 0 1px rgba(249,115,22,0.04) inset, 0 18px 40px rgba(0,0,0,0.45)",
        backdropFilter: "blur(20px) saturate(1.1)",
        ...styleProp,
      }}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative z-10 space-y-1.5 p-5", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold text-slate-100 tracking-tight", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-slate-400", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative z-10 p-5 pt-0", className)} {...props} />;
}
