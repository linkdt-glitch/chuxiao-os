import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isDemoModeEnabled } from "@/lib/auth";

const errorMessages: Record<string, string> = {
  not_invited: "这个账号暂未加入初晓 OS 的准入名单。",
  missing_supabase_env: "生产环境还没有配置 Supabase 环境变量，请先完成部署环境设置。"
};

const noticeMessages: Record<string, string> = {
  switched: "已退出当前账号，请用另一个账号登录。"
};

const demoAccounts = [
  { name: "创始人", identifier: "founder@qiming.ai", phone: "18800000001", role: "Owner", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { name: "管理员", identifier: "admin@qiming.ai", phone: "18800000002", role: "Admin", color: "text-red-700 bg-red-50 border-red-200" },
  { name: "运营负责人", identifier: "ops@qiming.ai", phone: "18800000003", role: "Manager", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { name: "普通成员", identifier: "member@qiming.ai", phone: "18800000004", role: "Member", color: "text-slate-600 bg-slate-50 border-slate-200" }
];

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; notice?: string }>;
}) {
  const params = await searchParams;
  const initialMessage = params?.error ? errorMessages[params.error] ?? params.error : undefined;
  const noticeMessage = params?.notice ? noticeMessages[params.notice] : undefined;
  const isDemo = isDemoModeEnabled();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-56 max-w-4xl rounded-full bg-gradient-to-r from-orange-200/40 via-rose-200/28 to-amber-200/35 blur-3xl" />

      <div className="relative w-full max-w-lg space-y-4">
        {noticeMessage ? (
          <div
            className="flex items-center gap-2 rounded-lg p-3 text-sm text-emerald-300"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.32)",
              boxShadow: "0 0 16px rgba(16,185,129,0.10)"
            }}
          >
            <span
              className="inline-block h-2 w-2 rounded-full bg-emerald-400"
              style={{ boxShadow: "0 0 8px rgba(74,222,128,0.85)" }}
            />
            {noticeMessage}
          </div>
        ) : null}
        <Card className="overflow-hidden">
          <CardHeader className="items-center pb-5 text-center">
            <div className="mb-3 flex flex-col items-center">
              <div className="relative mb-3 flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-orange-200/40 blur-2xl" />
                <div className="relative flex h-20 w-20 items-center justify-center rounded-[24px] border border-white/80 bg-white/54 shadow-[0_18px_46px_rgba(238,97,25,0.18)] backdrop-blur-xl">
                  <Image
                    src="/brand/kairosmini-mark.svg"
                    alt="Kairosmini"
                    width={512}
                    height={512}
                    priority
                    className="h-[72px] w-[72px] object-contain"
                  />
                </div>
              </div>
              <div className="bg-gradient-to-r from-slate-950 via-orange-700 to-red-500 bg-clip-text text-2xl font-semibold tracking-normal text-transparent">
                Kairosmini
              </div>
            </div>
            <CardTitle>初晓 OS 系统</CardTitle>
            <CardDescription>使用邮箱或手机号 + 密码登录工作台</CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm initialMessage={initialMessage} />
          </CardContent>
        </Card>

        {/* Demo mode hint */}
        {isDemo && (
          <Card className="overflow-hidden">
            <CardContent className="pt-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-medium text-orange-600">演示模式</span>
                <span className="text-xs text-muted-foreground">以下账号均可登录，密码统一：<code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-800">Qiming@2026</code></span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {demoAccounts.map((acc) => (
                  <div key={acc.identifier} className={`rounded-lg border p-2.5 ${acc.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{acc.name}</span>
                      <span className="rounded-full border px-1.5 py-px text-[10px] font-medium">{acc.role}</span>
                    </div>
                    <div className="mt-1 font-mono text-[11px] opacity-80">{acc.identifier}</div>
                    <div className="font-mono text-[11px] opacity-60">{acc.phone}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}
