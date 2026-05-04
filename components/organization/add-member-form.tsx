"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, KeyRound, Mail, Phone, UserPlus } from "lucide-react";
import { createHumanMemberAction, type CreateHumanMemberState } from "@/app/(app)/organization/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: CreateHumanMemberState = { ok: false, message: "" };

const selectCls =
  "h-9 w-full rounded-md border border-white/75 bg-white/76 px-3 text-sm shadow-sm backdrop-blur-xl outline-none transition focus:border-orange-200 focus:bg-white focus:shadow-[0_0_0_4px_rgba(238,97,25,0.12)]";

export function AddMemberForm() {
  const [state, formAction, pending] = useActionState(createHumanMemberAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <div className="space-y-4">
      <form ref={formRef} action={formAction} className="grid gap-4 lg:grid-cols-3 lg:items-end">
        <Label className="space-y-2">
          <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-orange-500" />登录邮箱</span>
          <Input type="email" name="email" required placeholder="name@company.com" />
        </Label>

        <Label className="space-y-2">
          <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-orange-500" />手机号 <span className="text-xs font-normal text-muted-foreground">（可选）</span></span>
          <Input type="tel" name="phone" placeholder="18800000000" pattern="1[3-9]\d{9}" />
        </Label>

        <Label className="space-y-2">
          <span>姓名 / 昵称</span>
          <Input name="display_name" required placeholder="例如：运营负责人" />
        </Label>

        <Label className="space-y-2">
          <span>角色</span>
          <select name="role_key" defaultValue="member" className={selectCls}>
            <option value="admin">Admin — 管理员</option>
            <option value="manager">Manager — 主管</option>
            <option value="member">Member — 成员</option>
          </select>
        </Label>

        <Label className="space-y-2">
          <span className="flex items-center gap-1.5"><KeyRound className="h-3.5 w-3.5 text-orange-500" />初始密码</span>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              name="password"
              required
              minLength={12}
              placeholder="至少 12 位，含字母和数字"
              className="pr-10 font-mono"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Label>

        <div className="flex items-end">
          <Button type="submit" className="h-9 w-full" disabled={pending}>
            <UserPlus className="h-4 w-4" />
            {pending ? "创建中..." : "创建账号"}
          </Button>
        </div>
      </form>

      {state.message ? (
        <div className={
          state.ok
            ? "rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-700"
            : "rounded-lg border border-red-200 bg-red-50/80 px-4 py-3 text-sm text-red-600"
        }>
          {state.message}
        </div>
      ) : null}

      <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 shrink-0" />
          创建后新成员自动绑定当前组织，无需修改 Render 白名单。
        </div>
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 shrink-0" />
          请将邮箱/手机号和初始密码单独发给成员，登录后建议尽快修改。
        </div>
      </div>
    </div>
  );
}
