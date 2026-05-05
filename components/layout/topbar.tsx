import Image from "next/image";
import { BackButton } from "@/components/layout/back-button";
import type { Organization, OrganizationMember, UserProfile } from "@/lib/types/core";

export function Topbar({
  organization,
  member,
  user,
}: {
  organization: Organization;
  member: OrganizationMember;
  user: UserProfile;
}) {
  return (
    <header
      className="sticky top-0 z-10 flex h-14 items-center justify-between px-3 lg:h-16 lg:px-8"
      style={{
        background: "rgba(2,6,17,0.90)",
        borderBottom: "1px solid rgba(249,115,22,0.15)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45), 0 1px 0 rgba(249,115,22,0.07) inset",
        backdropFilter: "blur(28px) saturate(1.2)",
      }}
    >
      {/* Left: back button + brand */}
      <div className="flex min-w-0 items-center gap-3">
        <BackButton />
        {/* Mobile logo */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg lg:hidden"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.22), rgba(3,7,18,0.96))",
            boxShadow: "0 0 14px rgba(249,115,22,0.28), 0 0 0 1px rgba(249,115,22,0.18)",
          }}
        >
          <Image
            src="/brand/kairosmini-mark.svg"
            alt="初晓 OS"
            width={512}
            height={512}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-slate-100">{organization.name}</div>
          <div className="font-mono text-[10px] tracking-[0.16em] text-orange-500/45">SYS://ONLINE</div>
        </div>
      </div>

      {/* Right: role chip + user info */}
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-3">
          {/* HUD role chip */}
          <div
            className="rounded px-2 py-0.5 font-mono text-[11px] font-semibold text-orange-400 tracking-wider"
            style={{
              background: "rgba(249,115,22,0.10)",
              border: "1px solid rgba(249,115,22,0.26)",
              boxShadow: "0 0 10px rgba(249,115,22,0.12)",
            }}
          >
            {(member.role?.key ?? "member").toUpperCase()}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-200">{user.full_name}</div>
            <div className="font-mono text-[10px] text-slate-500">{user.email}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
