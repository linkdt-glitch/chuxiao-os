import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, style: styleProp, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-spotlight
      className={cn(
        "rounded-lg text-card-foreground transition-all duration-300",
        className
      )}
      style={{
        background: "linear-gradient(180deg, rgba(10,16,32,0.90), rgba(7,12,24,0.86))",
        border: "1px solid rgba(249,115,22,0.13)",
        boxShadow:
          "0 0 0 1px rgba(249,115,22,0.05) inset, 0 24px 60px rgba(0,0,0,0.50)",
        backdropFilter: "blur(18px)",
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
      className={cn("text-base font-semibold text-slate-100", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative z-10 p-5 pt-0", className)} {...props} />;
}
