"use client";

import { Button } from "@/components/ui/button";

export function ConfirmButton({
  label,
  confirmText,
  variant = "outline"
}: {
  label: string;
  confirmText: string;
  variant?: "outline" | "destructive" | "secondary";
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      onClick={() => {
        window.confirm(confirmText);
      }}
    >
      {label}
    </Button>
  );
}
