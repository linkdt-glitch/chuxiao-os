"use client";

import { Button, type ButtonProps } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  confirmText,
  variant = "outline",
  size = "sm",
  className
}: {
  children: React.ReactNode;
  confirmText: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  className?: string;
}) {
  return (
    <Button
      type="submit"
      size={size}
      variant={variant}
      className={className}
      onClick={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
