import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { EnergyProvider } from "@/components/energy/energy-provider";
import {
  getCurrentMember,
  getCurrentOrganization,
  getCurrentUser,
  getSessionUser,
  isDemoModeEnabled
} from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { getNavigationModules } from "@/lib/modules";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isDemoModeEnabled()) {
    if (!hasSupabaseEnv()) redirect("/login?error=missing_supabase_env");
    const sessionUser = await getSessionUser();
    if (!sessionUser) redirect("/login");
  }

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
        <EnergyProvider>
          <main className="mx-auto w-full max-w-7xl px-4 py-7 lg:px-8">{children}</main>
        </EnergyProvider>
      </div>
    </div>
  );
}
