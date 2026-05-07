"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, Settings, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { logoutAction } from "@/app/(app)/actions";

export function UserMenu({
  userName,
  userEmail,
  roleKey
}: {
  userName: string;
  userEmail: string;
  roleKey: string;
}) {
  const [open, setOpen] = useState(false);
  const role = (roleKey ?? "member").toUpperCase();

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md transition-colors focus-visible:outline-none"
        >
          {/* Desktop: role chip + name + email + chevron */}
          <span
            className="hidden rounded px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wider text-orange-400 sm:inline"
            style={{
              background: "rgba(249,115,22,0.10)",
              border: "1px solid rgba(249,115,22,0.26)",
              boxShadow: "0 0 10px rgba(249,115,22,0.12)"
            }}
          >
            {role}
          </span>
          <span className="hidden text-right sm:block">
            <span className="block text-sm font-medium text-slate-200">{userName}</span>
            <span className="block font-mono text-[10px] text-slate-500">{userEmail}</span>
          </span>
          <ChevronDown
            className="hidden h-4 w-4 text-slate-400 transition-transform sm:block"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          />

          {/* Mobile: round avatar with user icon */}
          <span
            className="grid h-9 w-9 place-items-center rounded-full sm:hidden"
            style={{
              background:
                "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.22), rgba(3,7,18,0.96))",
              boxShadow:
                "0 0 12px rgba(249,115,22,0.20), 0 0 0 1px rgba(249,115,22,0.32)"
            }}
            aria-label="账户菜单"
          >
            <UserIcon className="h-4 w-4 text-orange-300" />
          </span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-[60] min-w-[220px] overflow-hidden rounded-lg p-1.5 outline-none"
          style={{
            background: "rgba(4,8,20,0.98)",
            border: "1px solid rgba(249,115,22,0.32)",
            boxShadow:
              "0 24px 50px rgba(0,0,0,0.55), 0 0 0 1px rgba(249,115,22,0.08) inset, 0 0 24px rgba(249,115,22,0.10)",
            backdropFilter: "blur(14px)"
          }}
        >
          {/* Header (mobile shows user info inside menu since trigger is just an avatar) */}
          <div
            className="mb-1 px-3 py-2 sm:hidden"
            style={{ borderBottom: "1px solid rgba(249,115,22,0.10)" }}
          >
            <div className="text-sm font-medium text-slate-200">{userName}</div>
            <div className="font-mono text-[10px] text-slate-500">{userEmail}</div>
            <div className="mt-1.5">
              <span
                className="inline-block rounded px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-orange-400"
                style={{
                  background: "rgba(249,115,22,0.10)",
                  border: "1px solid rgba(249,115,22,0.26)"
                }}
              >
                {role}
              </span>
            </div>
          </div>

          <DropdownMenu.Item asChild>
            <Link
              href="/settings"
              className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-200 outline-none transition-colors hover:bg-orange-500/[0.08] focus:bg-orange-500/[0.10]"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              系统设置
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Separator
            className="my-1 h-px"
            style={{ background: "rgba(249,115,22,0.10)" }}
          />

          <DropdownMenu.Item asChild>
            {/* Server action triggered through a hidden form. The DropdownMenu.Item
                handles keyboard / click; we route the activation to a submit. */}
            <form action={logoutAction} className="m-0">
              <button
                type="submit"
                className="flex w-full cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 outline-none transition-colors hover:bg-red-500/[0.10] focus:bg-red-500/[0.12]"
              >
                <LogOut className="h-4 w-4 text-red-400" />
                退出登录
              </button>
            </form>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
