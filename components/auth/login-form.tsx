"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WelcomeOverlay } from "@/components/auth/welcome-overlay";

// URL searchParams → 中文友好消息映射。
// 之前在 server component 里做，导致整个 /login 页被强制 dynamic 渲染，
// 每次都要 Render 服务端 SSR。挪到 client 这一层后 /login 可以静态化，
// HK/SZ 员工拿到的就是 Render 直接 serve 的静态 HTML，几乎零服务端延迟。
const ERROR_MESSAGES: Record<string, string> = {
  not_invited: "这个账号暂未加入初晓 OS 的准入名单。",
  missing_supabase_env: "生产环境还没有配置 Supabase 环境变量，请先完成部署环境设置。"
};

const NOTICE_MESSAGES: Record<string, string> = {
  switched: "已退出当前账号，请用另一个账号登录。"
};

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const searchParams = useSearchParams();
  // 从 URL 取 error / notice 参数，转成中文消息
  const errorParam = searchParams?.get("error");
  const noticeParam = searchParams?.get("notice");
  const urlMessage = errorParam
    ? (ERROR_MESSAGES[errorParam] ?? errorParam)
    : noticeParam
      ? (NOTICE_MESSAGES[noticeParam] ?? null)
      : null;

  const [message, setMessage] = useState(initialMessage ?? urlMessage ?? "");
  const [isError, setIsError] = useState(Boolean(initialMessage || errorParam));

  // searchParams 变化时（比如登录失败回跳带新的 error）同步显示
  useEffect(() => {
    if (urlMessage) {
      setMessage(urlMessage);
      setIsError(Boolean(errorParam));
    }
  }, [urlMessage, errorParam]);
  const [pendingAction, setPendingAction] = useState<"password" | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [welcomeRedirectTo, setWelcomeRedirectTo] = useState<string | null>(null);

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
      // Trigger welcome overlay; redirect happens after animation completes.
      setWelcomeRedirectTo(payload.redirectTo);
    }
  }

  return (
    <>
      {welcomeRedirectTo ? (
        <WelcomeOverlay
          onComplete={() => {
            window.location.href = welcomeRedirectTo;
          }}
        />
      ) : null}
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
    </>
  );
}
