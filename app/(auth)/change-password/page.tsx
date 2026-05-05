"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { KeyRound, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError("新密码至少需要 12 位。");
      return;
    }
    if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
      setError("密码需同时包含字母和数字。");
      return;
    }
    if (password !== confirm) {
      setError("两次输入的密码不一致。");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "密码修改失败，请重试。");
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace("/dashboard"), 1500);
    } catch {
      setError("网络错误，请重试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-56 max-w-4xl rounded-full bg-gradient-to-r from-orange-200/40 via-rose-200/28 to-amber-200/35 blur-3xl" />

      <div className="relative w-full max-w-md">
        <Card className="overflow-hidden">
          <CardHeader className="items-center pb-5 text-center">
            <div className="mb-3 flex flex-col items-center">
              <div className="relative mb-3 flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-orange-200/40 blur-2xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-[20px] border border-white/80 bg-white/54 shadow-[0_14px_36px_rgba(238,97,25,0.18)] backdrop-blur-xl">
                  <Image
                    src="/brand/kairosmini-mark.svg"
                    alt="Kairosmini"
                    width={512}
                    height={512}
                    priority
                    className="h-[58px] w-[58px] object-contain"
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-orange-600">
              <KeyRound className="h-4 w-4" />
              <CardTitle className="text-lg">修改登录密码</CardTitle>
            </div>
            <CardDescription className="mt-1">
              管理员已为您设置了初始密码，请在首次登录后立即修改。
            </CardDescription>
          </CardHeader>

          <CardContent>
            {success ? (
              <div className="flex flex-col items-center gap-3 py-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-green-700">密码修改成功！正在跳转…</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="password">新密码</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="至少 12 位，含字母和数字"
                      required
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">至少 12 位，必须同时包含字母和数字</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm">确认新密码</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="再次输入新密码"
                      required
                      autoComplete="new-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600"
                >
                  {loading ? "正在修改…" : "确认修改密码"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
