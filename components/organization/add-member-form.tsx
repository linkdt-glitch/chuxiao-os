"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, UserPlus } from "lucide-react";
import { createHumanMemberAction, type CreateHumanMemberState } from "@/app/(app)/organization/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateHumanMemberState = { ok: false, message: "" };

export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(createHumanMemberAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="space-y-4">
      <form
        ref={formRef}
        action={formAction}
        className="grid gap-4 lg:grid-cols-[1fr_1fr_160px_1fr_auto] lg:items-end"
      >
        <Label className="space-y-2">
          <span>成员邮箱</span>
          <Input type="email" name="email" required placeholder="name@company.com" />
        </Label>
        <Label className="space-y-2">
          <span>姓名</span>
          <Input name="display_name" required placeholder="例如：运营负责人" />
        </Label>
        <Label className="space-y-2">
          <span>角色</span>
          <select
            name="role_key"
            defaultValue="member"
            className="h-9 w-full rounded-md border border-white/75 bg-white/76 px-3 text-sm shadow-sm outline-none backdrop-blur-xl transition focus:border-cyan-200 focus:bg-white focus:shadow-[0_0_0_4px_rgba(103,232,249,0.14)]"
          >
            <option value="member">Member 成员</option>
            <option value="manager">Manager 主管</option>
            <option value="admin">Admin 管理员</option>
          </select>
        </Label>
        <Label className="space-y-2">
          <span>初始密码</span>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={12}
              placeholder="至少 12 位，包含字母和数字"
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
        </Label>
        <Button type="submit" className="h-9" disabled={pending}>
          <UserPlus className="h-4 w-4" />
          {pending ? "创建中..." : "创建账号"}
        </Button>
      </form>

      {state.message ? (
        <div
          className={
            state.ok
              ? "rounded-lg border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-sm text-emerald-700"
              : "rounded-lg border border-red-200 bg-red-50/80 px-3 py-2 text-sm text-red-600"
          }
        >
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4" />
          创建后无需修改 Render 白名单，新成员会自动绑定当前组织。
        </div>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4" />
          请把邮箱和初始密码单独发给成员，登录后建议尽快更换密码。
        </div>
      </div>
    </div>
  );
}
