import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileTabbar } from "@/components/layout/mobile-tabbar";
import { EnergyProvider } from "@/components/energy/energy-provider";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
import { SciFiEffects } from "@/components/effects/sci-fi-effects";
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

  // Force password change if flagged by admin
  if (!isDemoModeEnabled() && user?.must_change_password) {
    redirect("/auth/change-password");
  }

  return (
    <div className="min-h-screen">
      <SciFiEffects />
      <Sidebar modules={modules} />
      <div className="lg:pl-72">
        <Topbar organization={organization} member={member} user={user} />
        <AnnouncementBanner announcements={organization.settings?.announcements as string[] | undefined} />
        <EnergyProvider>
          <main className="mx-auto w-full max-w-7xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 animate-app-page-in lg:px-8 lg:py-7">
            {children}
          </main>
        </EnergyProvider>
        <MobileTabbar modules={modules} />
      </div>
    </div>
  );
}
