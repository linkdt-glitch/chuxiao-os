import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-gradient-to-r from-orange-500 to-red-500 text-primary-foreground",
        secondary: "border-slate-200 bg-white/70 text-secondary-foreground",
        outline: "border-slate-200/80 bg-white/45 text-foreground",
        success: "border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700",
        warning: "border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700",
        danger: "border-red-200 bg-gradient-to-r from-red-50 to-rose-50 text-red-700",
        info: "border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700"
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
