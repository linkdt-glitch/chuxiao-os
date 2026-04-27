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
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-white/70 bg-white/72 px-4 shadow-sm backdrop-blur-xl lg:px-8">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{organization.name}</div>
        <div className="text-xs text-muted-foreground">organization_id: {organization.id}</div>
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
