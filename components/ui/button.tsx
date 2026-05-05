import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default: [
          "bg-gradient-to-b from-orange-400 via-orange-500 to-red-500 text-white font-semibold",
          "shadow-[0_0_20px_rgba(249,115,22,0.35),0_4px_16px_rgba(0,0,0,0.4)]",
          "hover:-translate-y-0.5 hover:shadow-[0_0_28px_rgba(249,115,22,0.55),0_8px_24px_rgba(0,0,0,0.45)]",
          "active:translate-y-0 active:shadow-[0_0_12px_rgba(249,115,22,0.35)]",
        ].join(" "),
        secondary: [
          "text-slate-200 font-medium",
          "bg-[rgba(249,115,22,0.08)] border border-[rgba(249,115,22,0.22)]",
          "shadow-[0_0_10px_rgba(249,115,22,0.08)]",
          "hover:bg-[rgba(249,115,22,0.14)] hover:border-[rgba(249,115,22,0.38)] hover:-translate-y-0.5",
          "hover:shadow-[0_0_18px_rgba(249,115,22,0.18)]",
          "active:translate-y-0",
        ].join(" "),
        outline: [
          "text-slate-300 font-medium",
          "bg-transparent border border-[rgba(249,115,22,0.18)]",
          "hover:border-[rgba(249,115,22,0.45)] hover:text-orange-400 hover:bg-[rgba(249,115,22,0.06)] hover:-translate-y-0.5",
          "active:translate-y-0",
        ].join(" "),
        ghost: [
          "text-slate-400 shadow-none",
          "hover:bg-[rgba(249,115,22,0.07)] hover:text-slate-200",
          "active:scale-95",
        ].join(" "),
        destructive: [
          "bg-gradient-to-b from-red-500 to-red-700 text-white font-semibold",
          "shadow-[0_0_16px_rgba(239,68,68,0.35),0_4px_16px_rgba(0,0,0,0.4)]",
          "hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(239,68,68,0.5)]",
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
