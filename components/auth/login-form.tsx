"use client";

import { useState } from "react";
import { KeyRound, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isError, setIsError] = useState(Boolean(initialMessage));
  const [pendingAction, setPendingAction] = useState<"password" | "magic" | "bootstrap" | null>(null);

  async function submit(form: HTMLFormElement, mode: "password" | "magic" | "bootstrap") {
    setPendingAction(mode);
    setIsError(false);
    setMessage("");

    const formData = new FormData(form);
    const endpoint =
      mode === "magic"
        ? "/api/auth/request-link"
        : mode === "bootstrap"
          ? "/api/auth/bootstrap-owner"
          : "/api/auth/password-login";

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        password: formData.get("password"),
        full_name: formData.get("full_name"),
        organization_name: formData.get("organization_name")
      })
    });
    const payload = (await response.json().catch(() => ({}))) as {
      message?: string;
      error?: string;
      redirectTo?: string;
    };

    setPendingAction(null);
    setIsError(!response.ok || Boolean(payload.error));
    setMessage(payload.error ?? payload.message ?? "请求已提交。");

    if (response.ok && payload.redirectTo) {
      window.location.href = payload.redirectTo;
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        submit(event.currentTarget, "password");
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="email">邮箱</Label>
        <Input id="email" name="email" type="email" placeholder="founder@company.com" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <Input id="password" name="password" type="password" placeholder="首次管理员密码或已创建账号密码" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">姓名</Label>
        <Input id="full_name" name="full_name" placeholder="创始人" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="organization_name">组织名称</Label>
        <Input id="organization_name" name="organization_name" placeholder="启明时刻 AI 公司" />
      </div>
      <Button className="w-full" type="submit" disabled={Boolean(pendingAction)}>
        <KeyRound className="h-4 w-4" />
        {pendingAction === "password" ? "登录中..." : "邮箱密码登录"}
      </Button>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled={Boolean(pendingAction)}
          onClick={(event) => {
            if (event.currentTarget.form) submit(event.currentTarget.form, "magic");
          }}
        >
          <Mail className="h-4 w-4" />
          {pendingAction === "magic" ? "发送中..." : "发送登录链接"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={Boolean(pendingAction)}
          onClick={(event) => {
            if (event.currentTarget.form) submit(event.currentTarget.form, "bootstrap");
          }}
        >
          <ShieldCheck className="h-4 w-4" />
          {pendingAction === "bootstrap" ? "初始化中..." : "初始化 Owner"}
        </Button>
      </div>
      {message ? (
        <p className={isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
