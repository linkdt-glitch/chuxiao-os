"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestLoginLink, type LoginActionState } from "@/app/(auth)/login/actions";

const initialState: LoginActionState = {};

export function LoginForm({ initialMessage }: { initialMessage?: string }) {
  const [state, formAction, pending] = useActionState(requestLoginLink, initialState);
  const message = state.error ?? state.message ?? initialMessage;

  return (
    <form action={formAction} className="space-y-4">
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
        <p className={state.error ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
