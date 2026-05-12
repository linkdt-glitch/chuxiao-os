import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { ImpersonationBanner } from "@/components/layout/impersonation-banner";
import { MobileTabbar } from "@/components/layout/mobile-tabbar";
import { EnergyProvider } from "@/components/energy/energy-provider";
import { AnnouncementBanner } from "@/components/dashboard/announcement-banner";
// 装饰组件（粒子鼠标 + 电子宠物猫）走 client-only 懒加载 ——
// 包在 DecorativeEffects 里，因为 next/dynamic({ ssr:false }) 不能直接
// 用在 server component 里（Next.js 15 限制）。
import { DecorativeEffects } from "@/components/effects/decorative-effects";
import {
  getCurrentMember,
  getCurrentOrganization,
  getCurrentUser,
  getSessionUser,
  isDemoModeEnabled
} from "@/lib/auth";
import { getImpersonationState } from "@/lib/auth/impersonation";
import { hasSupabaseEnv } from "@/lib/supabase/server";
import { getNavigationModules } from "@/lib/modules";
import { getMembers } from "@/lib/data/queries";
import type { ImpersonationCandidate } from "@/components/layout/user-menu";

const ROLE_LABEL_CN: Record<string, string> = {
  owner: "创始人",
  admin: "管理员",
  manager: "负责人",
  member: "成员",
  agent: "AI 员工"
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isDemoModeEnabled()) {
    if (!hasSupabaseEnv()) redirect("/login?error=missing_supabase_env");
    const sessionUser = await getSessionUser();
    if (!sessionUser) redirect("/login");
  }

  const [organization, member, user, modules, impersonation] = await Promise.all([
    getCurrentOrganization(),
    getCurrentMember(),
    getCurrentUser(),
    getNavigationModules(),
    getImpersonationState()
  ]);

  // Force password change if flagged by admin.
  // Page lives at app/(auth)/change-password/page.tsx — `(auth)` is a route
  // group, so the actual URL is `/change-password`, NOT `/auth/change-password`.
  // 查看模式下跳过此检查，避免创始人被强制改成员的密码。
  if (!isDemoModeEnabled() && !impersonation.active && user?.must_change_password) {
    redirect("/change-password");
  }

  // 创始人 → 拉取成员列表，用于 user-menu 的"以成员身份查看"。
  // 非创始人或者已经在查看模式 → 不查询，省一次 RPC。
  let impersonationCandidates: ImpersonationCandidate[] = [];
  const isOwner = member?.role?.key === "owner";
  if (isOwner && !impersonation.active) {
    try {
      const members = await getMembers();
      impersonationCandidates = members
        .filter((m) => m.user_id && m.user_id !== user.id && m.status === "active")
        .map((m) => ({
          user_id: m.user_id as string,
          display_name: m.display_name ?? "成员",
          role_key: m.role?.key ?? "member"
        }));
    } catch (error) {
      console.warn("[layout] load impersonation candidates failed:", error);
    }
  }

  return (
    <div className="min-h-screen">
      <Sidebar modules={modules} isOwner={isOwner} />
      <div className="lg:pl-72">
        <Topbar
          organization={organization}
          member={member}
          user={user}
          impersonating={impersonation.active}
          impersonationCandidates={impersonationCandidates}
        />
        {impersonation.active ? (
          <ImpersonationBanner
            realName={impersonation.realName}
            realEmail={impersonation.realEmail}
            currentName={user.full_name ?? user.email ?? "成员"}
            currentRoleLabel={ROLE_LABEL_CN[member?.role?.key ?? "member"] ?? "成员"}
          />
        ) : null}
        <AnnouncementBanner announcements={organization.settings?.announcements as string[] | undefined} />
        <EnergyProvider>
          <main className="mx-auto w-full max-w-[1440px] px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 animate-app-page-in lg:px-6 lg:py-7">
            {children}
          </main>
        </EnergyProvider>
        <MobileTabbar modules={modules} />
      </div>
      {/* 装饰组件（鼠标光剑残影 + 三花曼基康咪咪）—— client-only 懒加载，
          不阻塞 SSR / 不增加首屏 HTML 体积 */}
      <DecorativeEffects />
    </div>
  );
}
