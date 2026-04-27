import Image from "next/image";
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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/70 bg-white/62 px-4 shadow-[0_8px_26px_rgba(15,23,42,0.04)] backdrop-blur-2xl lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-slate-950 shadow-sm lg:hidden">
          <Image src="/brand/kairosmini-mark.png" alt="Kairosmini" width={32} height={32} className="h-full w-full object-cover" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium">{organization.name}</div>
          <div className="text-xs text-muted-foreground">Kairosmini 内部系统</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Badge variant="info">{member.role?.name ?? "Member"}</Badge>
        <div className="hidden text-right sm:block">
          <div className="text-sm font-medium">{user.full_name}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
      </div>
    </header>
  );
}
