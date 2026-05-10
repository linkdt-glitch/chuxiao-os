import Image from "next/image";
import { BackButton } from "@/components/layout/back-button";
import { UserMenu, type ImpersonationCandidate } from "@/components/layout/user-menu";
import type { Organization, OrganizationMember, UserProfile } from "@/lib/types/core";

export function Topbar({
  organization,
  member,
  user,
  impersonating = false,
  impersonationCandidates = []
}: {
  organization: Organization;
  member: OrganizationMember;
  user: UserProfile;
  impersonating?: boolean;
  impersonationCandidates?: ImpersonationCandidate[];
}) {
  return (
    <header
      className="sticky top-0 z-10 flex h-14 items-center justify-between px-3 lg:h-16 lg:px-8"
      style={{
        background: "rgba(255,255,255,0.92)",
        borderBottom: "1px solid #e2e8f0",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Left: back button + brand */}
      <div className="flex min-w-0 items-center gap-3">
        <BackButton />
        {/* Mobile logo */}
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg lg:hidden"
          style={{
            background: "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.18), #ffffff)",
            border: "1px solid rgba(249,115,22,0.20)",
          }}
        >
          <Image
            src="/brand/kairosmini-mark.svg"
            alt="初晓 OS"
            width={36}
            height={36}
            priority
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-slate-900">{organization.name}</div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.16em] text-orange-500/85">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            系统在线
          </div>
        </div>
      </div>

      {/* Right: user menu (role chip + name + email + dropdown w/ logout / impersonate) */}
      <UserMenu
        userName={user.full_name ?? user.email ?? "User"}
        userEmail={user.email ?? ""}
        roleKey={member.role?.key ?? "member"}
        impersonating={impersonating}
        impersonationCandidates={impersonationCandidates}
      />
    </header>
  );
}
