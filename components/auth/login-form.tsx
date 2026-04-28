"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isError, setIsError] = useState(Boolean(initialMessage));
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setIsError(false);
    setMessage("");

    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        full_name: formData.get("full_name"),
        organization_name: formData.get("organization_name")
      })
    });
    const payload = (await response.json().catch(() => ({}))) as { message?: string; error?: string };

    setPending(false);
    setIsError(!response.ok || Boolean(payload.error));
    setMessage(payload.error ?? payload.message ?? "请求已提交。");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input id="email" name="email" type="email" placeholder="founder@company.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">姓名</Label>
        <Input id="full_name" name="full_name" placeholder="创始人" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organization_name">组织名称</Label>
        <Input id="organization_name" name="organization_name" placeholder="启明时刻 AI 公司" />
      </div>
      <Button className="w-full" type="submit" disabled={pending}>
        <Mail className="h-4 w-4" />
        {pending ? "发送中..." : "发送登录链接"}
      </Button>
      {message ? (
        <p className={isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
