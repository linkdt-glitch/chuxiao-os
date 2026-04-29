"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function BackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="shrink-0 rounded-full bg-white/58 shadow-none ring-1 ring-white/75 hover:bg-white"
      aria-label="返回上一页"
      title="返回上一页"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
        } else {
          router.push("/dashboard");
        }
      }}
    >
      <ArrowLeft className="h-4 w-4" />
    </Button>
  );
}
