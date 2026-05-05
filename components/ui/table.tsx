import * as React from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div
      className="w-full overflow-auto rounded-lg"
      style={{
        background:
          "linear-gradient(180deg, rgba(8,13,28,0.72) 0%, rgba(4,8,20,0.62) 100%)",
        border: "1px solid rgba(249,115,22,0.12)",
        boxShadow:
          "0 12px 32px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(249,115,22,0.04)",
        backdropFilter: "blur(14px)"
      }}
    >
      <table className={cn("w-full min-w-[620px] caption-bottom text-sm sm:min-w-0", className)} {...props} />
    </div>
  );
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "[&_tr]:border-b [&_tr]:border-orange-500/10",
        className
      )}
      style={{
        background:
          "linear-gradient(180deg, rgba(249,115,22,0.06) 0%, rgba(249,115,22,0.02) 100%)"
      }}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-white/[0.04] transition-colors",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 px-3 text-left align-middle text-[11px] font-medium uppercase tracking-[0.16em] text-orange-400/60",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-3 align-middle text-slate-200", className)} {...props} />;
}
