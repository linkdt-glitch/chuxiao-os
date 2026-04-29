import Image from "next/image";
import { BackButton } from "@/components/layout/back-button";
import { Badge } from "@/components/ui/badge";
import type { Organization, OrganizationMember, UserProfile } from "@/lib/types/core";

export function Topbar({
  organization,
  member,
  user
}: {
  organization: Organization;
  member: OrganizationMember;
  user: UserProfile;
}) {
  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-white/70 bg-white/72 px-3 shadow-[0_8px_26px_rgba(15,23,42,0.04)] backdrop-blur-2xl lg:h-16 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <BackButton />
        <div className="brand-mark-frame flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg lg:hidden">
          <Image src="/brand/kairosmini-mark.svg" alt="初晓 OS" width={512} height={512} className="h-full w-full object-contain p-0.5" />
        </div>
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-semibold text-slate-950">{organization.name}</div>
          <div className="truncate text-[11px] text-muted-foreground sm:text-xs">初晓 OS 系统</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="info" className="hidden sm:inline-flex">{member.role?.name ?? "Member"}</Badge>
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium">{user.full_name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
      </div>
    </header>
  );
}
