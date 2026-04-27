"use client";

import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  confirmText,
  variant = "outline"
}: {
  children: React.ReactNode;
  confirmText: string;
  variant?: "outline" | "destructive" | "secondary" | "default";
}) {
  return (
    <Button
      type="submit"
      size="sm"
      variant={variant}
      onClick={(event) => {
        if (!window.confirm(confirmText)) event.preventDefault();
      }}
    >
      {children}
    </Button>
  );
}
