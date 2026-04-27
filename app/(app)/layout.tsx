import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentMember, getCurrentOrganization, getCurrentUser } from "@/lib/auth";
import { getNavigationModules } from "@/lib/modules";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const [organization, member, user, modules] = await Promise.all([
    getCurrentOrganization(),
    getCurrentMember(),
    getCurrentUser(),
    getNavigationModules()
  ]);

  return (
    <div className="min-h-screen">
      <Sidebar modules={modules} />
      <div className="lg:pl-72">
        <Topbar organization={organization} member={member} user={user} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
