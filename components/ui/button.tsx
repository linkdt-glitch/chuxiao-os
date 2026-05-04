import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium shadow-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-orange-400 via-orange-500 to-red-500 text-primary-foreground shadow-[0_12px_28px_rgba(238,97,25,0.28)] hover:-translate-y-0.5 hover:brightness-105 active:translate-y-0",
        secondary: "border border-white/75 bg-white/74 text-secondary-foreground backdrop-blur-xl hover:-translate-y-0.5 hover:bg-white",
        outline: "border border-slate-200/80 bg-white/66 backdrop-blur-xl hover:-translate-y-0.5 hover:border-orange-200 hover:bg-orange-50/76",
        ghost: "shadow-none hover:bg-white/66",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90"
      },
      size: {
        sm: "h-8 px-3",
        md: "h-9 px-4",
        icon: "h-9 w-9"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "md"
    }
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
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
