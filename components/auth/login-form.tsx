"use client";

import { useState } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const [message, setMessage] = useState(initialMessage ?? "");
  const [isError, setIsError] = useState(Boolean(initialMessage));
  const [pendingAction, setPendingAction] = useState<"password" | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  async function submit(form: HTMLFormElement) {
    setPendingAction("password");
    setIsError(false);
    setMessage("");

    const formData = new FormData(form);

    const response = await fetch("/api/auth/password-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: formData.get("identifier"),
        password: formData.get("password")
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
        submit(event.currentTarget);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="identifier">邮箱 / 手机号</Label>
        <Input
          id="identifier"
          name="identifier"
          type="text"
          placeholder="founder@company.com 或 18800000001"
          autoComplete="username"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">密码</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="首次管理员密码或已创建账号密码"
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "隐藏密码" : "显示密码"}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <Button className="w-full" type="submit" disabled={Boolean(pendingAction)}>
        <KeyRound className="h-4 w-4" />
        {pendingAction === "password" ? "登录中..." : "登录"}
      </Button>
      {message ? (
        <p className={isError ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
