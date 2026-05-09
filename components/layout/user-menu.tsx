"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Eye, LogOut, Repeat, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import {
  exitImpersonationAction,
  impersonateMemberAction,
  logoutAction,
  switchAccountAction
} from "@/app/(app)/actions";

// 角色 key → 中文显示名（chip 短文案）
const ROLE_LABEL_CN: Record<string, string> = {
  owner: "创始人",
  admin: "管理员",
  manager: "负责人",
  member: "成员",
  agent: "AI 员工"
};

export type ImpersonationCandidate = {
  user_id: string;
  display_name: string;
  role_key: string;
};

export function UserMenu({
  userName,
  userEmail,
  roleKey,
  /** 是否正在"查看模式"中（true 时显示退出按钮，隐藏切换菜单） */
  impersonating = false,
  /** 当 caller 是 owner 时传入：可切换的成员清单（不含 owner 自己） */
  impersonationCandidates = []
}: {
  userName: string;
  userEmail: string;
  roleKey: string;
  impersonating?: boolean;
  impersonationCandidates?: ImpersonationCandidate[];
}) {
  const [open, setOpen] = useState(false);
  const role = ROLE_LABEL_CN[roleKey ?? "member"] ?? (roleKey ?? "成员");
  const showImpersonateSubmenu =
    !impersonating && roleKey === "owner" && impersonationCandidates.length > 0;

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md transition-colors focus-visible:outline-none"
        >
          {/* Desktop: role chip + name + email + chevron */}
          <span
            className="hidden rounded px-2 py-0.5 text-[11px] font-semibold tracking-wide text-orange-400 sm:inline"
            style={{
              background: "rgba(249,115,22,0.10)",
              border: "1px solid rgba(249,115,22,0.26)",
              boxShadow: "0 0 10px rgba(249,115,22,0.12)"
            }}
          >
            {role}
          </span>
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-semibold text-slate-900">{userName}</span>
            <span className="block font-mono text-[10px] text-slate-500">{userEmail}</span>
          </span>
          <ChevronDown
            className="hidden h-4 w-4 text-slate-500 transition-transform sm:block"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />

          {/* Mobile: round avatar with user icon */}
          <span
            className="grid h-9 w-9 place-items-center rounded-full sm:hidden"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.18), #ffffff)",
              border: "1px solid rgba(249,115,22,0.30)"
            }}
            aria-label="账户菜单"
          >
            <UserIcon className="h-4 w-4 text-orange-600" />
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[60] min-w-[240px] overflow-hidden rounded-lg p-1.5 outline-none"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow: "0 1px 2px rgba(15,23,42,0.06), 0 12px 32px -8px rgba(15,23,42,0.18)"
          }}
        >
          {/* Header (mobile shows user info inside menu since trigger is just an avatar) */}
          <div
            className="mb-1 px-3 py-2 sm:hidden"
            style={{ borderBottom: "1px solid #e2e8f0" }}
          >
            <div className="text-sm font-medium text-slate-900">{userName}</div>
            <div className="font-mono text-[10px] text-slate-500">{userEmail}</div>
            <div className="mt-1.5">
              <span
                className="inline-block rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide text-orange-700"
                style={{
                  background: "#fff7ed",
                  border: "1px solid #fed7aa"
                }}
              >
                {role}
              </span>
            </div>
          </div>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-700 outline-none transition-colors hover:bg-orange-50 focus:bg-orange-50"
            >
              <Settings className="h-4 w-4 text-slate-500" />
              系统设置
            </Link>
          </DropdownMenu.Item>

          {/* 创始人专属：以成员身份查看（impersonate） */}
          {showImpersonateSubmenu ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />
              <DropdownMenu.Sub>
                <DropdownMenu.SubTrigger className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-amber-700 outline-none transition-colors data-[highlighted]:bg-amber-50">
                  <Eye className="h-4 w-4 text-amber-600" />
                  以成员身份查看
                  <span className="ml-auto text-xs text-amber-500">›</span>
                </DropdownMenu.SubTrigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.SubContent
                    sideOffset={6}
                    alignOffset={-4}
                    className="z-[70] min-w-[240px] max-h-[320px] overflow-y-auto rounded-lg p-1.5 outline-none"
                    style={{
                      background: "#ffffff",
                      border: "1px solid #fed7aa",
                      boxShadow: "0 1px 2px rgba(15,23,42,0.06), 0 12px 32px -8px rgba(15,23,42,0.18)"
                    }}
                  >
                    <div className="px-3 py-1.5 font-mono text-[10px] tracking-[0.18em] text-amber-700">
                      选择要切换的成员
                    </div>
                    {impersonationCandidates.map((candidate) => {
                      const candidateRole =
                        ROLE_LABEL_CN[candidate.role_key] ?? candidate.role_key;
                      return (
                        <DropdownMenu.Item
                          key={candidate.user_id}
                          onSelect={(event) => {
                            event.preventDefault();
                            const formData = new FormData();
                            formData.set("user_id", candidate.user_id);
                            void impersonateMemberAction(formData);
                          }}
                          className="flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2 text-sm text-slate-700 outline-none transition-colors data-[highlighted]:bg-amber-50"
                        >
                          <span className="truncate">{candidate.display_name}</span>
                          <span className="shrink-0 rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] text-amber-700">
                            {candidateRole}
                          </span>
                        </DropdownMenu.Item>
                      );
                    })}
                  </DropdownMenu.SubContent>
                </DropdownMenu.Portal>
              </DropdownMenu.Sub>
            </>
          ) : null}

          {/* 已经在查看模式 → 显示退出按钮 */}
          {impersonating ? (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-amber-100" />
              <DropdownMenu.Item
                onSelect={(e) => {
                  e.preventDefault();
                  void exitImpersonationAction();
                }}
                className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-amber-700 outline-none transition-colors data-[highlighted]:bg-amber-50"
              >
                <Eye className="h-4 w-4 text-amber-600" />
                退出查看模式
              </DropdownMenu.Item>
            </>
          ) : null}

          <DropdownMenu.Separator className="my-1 h-px bg-slate-200" />

          {/* Switch account — onSelect fires the server action directly,
              no <form> nesting (radix Item swallowed the form submit). */}
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              void switchAccountAction();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-orange-700 outline-none transition-colors data-[highlighted]:bg-orange-50"
          >
            <Repeat className="h-4 w-4 text-orange-600" />
            切换账号
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              void logoutAction();
            }}
            className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-600 outline-none transition-colors data-[highlighted]:bg-red-50"
          >
            <LogOut className="h-4 w-4 text-red-500" />
            退出登录
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
