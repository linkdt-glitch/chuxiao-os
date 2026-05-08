import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.35)]",
        secondary:
          "border-white/10 bg-slate-50 text-slate-300",
        outline:
          "border-white/15 bg-transparent text-slate-300",
        success:
          "border-emerald-500/30 bg-emerald-500/[0.12] text-emerald-300",
        warning:
          "border-amber-500/30 bg-amber-500/[0.12] text-amber-300",
        danger:
          "border-red-500/30 bg-red-500/[0.12] text-red-300",
        info:
          "border-orange-500/30 bg-orange-500/[0.10] text-orange-300"
      }
    },
    defaultVariants: {
      variant: "secondary"
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
