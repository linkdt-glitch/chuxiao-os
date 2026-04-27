"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setMessage(null);

    const email = String(formData.get("email") ?? "");
    const fullName = String(formData.get("full_name") ?? "");
    const organizationName = String(formData.get("organization_name") ?? "");
    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      setMessage("当前未配置 Supabase 环境变量，应用会使用内置 demo 数据运行。");
      setLoading(false);
      return;
    }

    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
        data: {
          full_name: fullName,
          organization_name: organizationName
        }
      }
    });

    setMessage(error ? error.message : "登录链接已发送，请检查邮箱。");
    setLoading(false);
  }

  return (
    <form action={handleSubmit} className="space-y-4">
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
      <Button className="w-full" type="submit" disabled={loading}>
        <Mail className="h-4 w-4" />
        {loading ? "发送中..." : "发送登录链接"}
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
