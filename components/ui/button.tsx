import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        // 主 CTA：橙色渐变 + 轻软投影
        default: [
          "bg-gradient-to-b from-orange-500 to-orange-600 text-white font-semibold",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_-4px_rgba(249,115,22,0.40)]",
          "hover:from-orange-500 hover:to-orange-700 hover:-translate-y-0.5",
          "hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_16px_-4px_rgba(249,115,22,0.50)]",
          "active:translate-y-0",
        ].join(" "),
        // 次级：浅橙底 + 橙边
        secondary: [
          "text-orange-700 font-medium",
          "bg-orange-50 border border-orange-200",
          "hover:bg-orange-100 hover:border-orange-300 hover:-translate-y-0.5",
          "active:translate-y-0",
        ].join(" "),
        // outline：白底 + 浅灰边，hover 变橙
        outline: [
          "text-slate-700 font-medium",
          "bg-white border border-slate-200",
          "hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50/50",
          "hover:-translate-y-0.5 active:translate-y-0",
        ].join(" "),
        // ghost：透明 hover 变浅橙
        ghost: [
          "text-slate-600",
          "hover:bg-orange-50 hover:text-orange-700",
          "active:scale-95",
        ].join(" "),
        // destructive：红
        destructive: [
          "bg-gradient-to-b from-red-500 to-red-600 text-white font-semibold",
          "shadow-[0_1px_2px_rgba(0,0,0,0.05),0_4px_12px_-4px_rgba(239,68,68,0.40)]",
          "hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_8px_16px_-4px_rgba(239,68,68,0.50)]",
          "active:translate-y-0",
        ].join(" "),
      },
      size: {
        sm:   "h-8 px-3 text-xs",
        md:   "h-9 px-4",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        data-interactive
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
