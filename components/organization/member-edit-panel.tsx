"use client";

import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Eye, EyeOff, KeyRound, Mail, Pencil, Phone, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateMemberAction } from "@/app/(app)/organization/actions";
import type { OrganizationMember, Role } from "@/lib/types/core";

interface Props {
  member: OrganizationMember;
  roles: Role[];
  isOwner: boolean;
}

export function MemberEditPanel({ member, roles, isOwner }: Props) {
  const [open, setOpen] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState(member.display_name);
  const [email, setEmail] = useState(member.email ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [roleKey, setRoleKey] = useState(member.role?.key ?? "member");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(false);
  const [pending, startTransition] = useTransition();

  // Editable roles: owner cannot be assigned by UI (only 1 owner), filter to non-owner for non-self
  const assignableRoles = roles.filter((r) => r.key !== "owner" && r.key !== "agent");

  function handleSave() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("member_id", member.id);
      fd.set("display_name", name.trim());
      fd.set("email", email.trim());
      fd.set("phone", phone.trim());
      fd.set("role_key", roleKey);
      if (password) fd.set("password", password);
      const result = await updateMemberAction(fd);
      setMessage(result.message);
      setOk(result.ok);
      if (result.ok) {
        setPassword("");
        setOpen(false);
      }
    });
  }

  if (!isOwner) {
    // Non-owner: just display credentials
    return (
      <div className="space-y-1 text-xs">
        {member.email && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0 text-orange-400" />
            <span className="font-mono">{member.email}</span>
          </div>
        )}
        {member.phone && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0 text-orange-400" />
            <span className="font-mono">{member.phone}</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Collapsed display */}
      <div className="space-y-1 text-xs">
        {email && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Mail className="h-3 w-3 shrink-0 text-orange-400" />
            <span className="font-mono">{email}</span>
          </div>
        )}
        {phone && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Phone className="h-3 w-3 shrink-0 text-orange-400" />
            <span className="font-mono">{phone}</span>
          </div>
        )}
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); setMessage(""); }}
          className="mt-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-orange-600 transition hover:bg-orange-50"
        >
          <Pencil className="h-3 w-3" />
          编辑成员
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Edit panel */}
      {open && (
        <div className="mt-3 rounded-xl border border-orange-100 bg-gradient-to-br from-orange-50/60 to-amber-50/40 p-4 shadow-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                <User className="h-3 w-3" /> 姓名
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="显示名称"
                className="h-8 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                <span className="text-xs">角色</span>
              </span>
              <select
                value={roleKey}
                onChange={(e) => setRoleKey(e.target.value)}
                className="h-8 w-full rounded-md border border-white/75 bg-white/76 px-3 text-sm backdrop-blur-xl outline-none focus:border-orange-200 focus:shadow-[0_0_0_3px_rgba(238,97,25,0.12)]"
              >
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.key}>{r.name} — {r.description}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                <Mail className="h-3 w-3" /> 登录邮箱
              </span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@company.com"
                className="h-8 text-sm"
              />
            </label>

            <label className="space-y-1">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                <Phone className="h-3 w-3" /> 手机号
              </span>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="18800000000"
                className="h-8 text-sm"
              />
            </label>

            <label className="space-y-1 sm:col-span-2">
              <span className="flex items-center gap-1 text-xs font-medium text-slate-700">
                <KeyRound className="h-3 w-3" /> 重置密码
                <span className="text-[11px] font-normal text-muted-foreground">（留空则不修改）</span>
              </span>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="新密码，至少 12 位含字母和数字"
                  className="h-8 pr-8 text-sm font-mono"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPw((v) => !v)}
                >
                  {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </label>
          </div>

          {message && (
            <p className={`mt-2 text-xs ${ok ? "text-green-600" : "text-red-500"}`}>{message}</p>
          )}

          <div className="mt-3 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={pending || !name.trim()}
              onClick={handleSave}
              className="h-8 text-xs"
            >
              <Save className="h-3.5 w-3.5" />
              {pending ? "保存中..." : "保存更改"}
            </Button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => {
                setOpen(false);
                setMessage("");
                setName(member.display_name);
                setEmail(member.email ?? "");
                setPhone(member.phone ?? "");
                setRoleKey(member.role?.key ?? "member");
                setPassword("");
              }}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
