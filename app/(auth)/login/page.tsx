import Image from "next/image";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// ⭐ /login 是公司大部分员工每天第一个看到的页面。强制静态化：
//   - 没有 searchParams 服务端读取（挪到 LoginForm 客户端用 useSearchParams 读）
//   - 没有 cookies / headers / 数据库查询
//   - isDemoModeEnabled 走 NEXT_PUBLIC_* 在 build 时内联
//
// 效果：Render 不再走 Next.js SSR 流程，直接当静态 HTML serve。
// HK/SZ 员工 TTFB 从 ~200ms 降到 ~30-50ms（仅 TLS + HK PoP 到 Render 静态发回）。
export const dynamic = "force-static";

// 演示模式判断：NEXT_PUBLIC_ENABLE_DEMO_MODE 在 build 时被 Next.js 内联成字面量，
// 所以在 server component 里直接读没问题，不会让页面变 dynamic。
const isDemo = process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === "true";

const demoAccounts = [
  { name: "创始人", identifier: "founder@qiming.ai", phone: "18800000001", role: "Owner", color: "text-orange-700 bg-orange-50 border-orange-200" },
  { name: "管理员", identifier: "admin@qiming.ai", phone: "18800000002", role: "Admin", color: "text-red-700 bg-red-50 border-red-200" },
  { name: "运营负责人", identifier: "ops@qiming.ai", phone: "18800000003", role: "Manager", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { name: "普通成员", identifier: "member@qiming.ai", phone: "18800000004", role: "Member", color: "text-slate-600 bg-slate-50 border-slate-200" }
];

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-56 max-w-4xl rounded-full bg-gradient-to-r from-orange-200/40 via-rose-200/28 to-amber-200/35 blur-3xl" />

      <div className="relative w-full max-w-lg space-y-4">
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
              <div
                className="bg-gradient-to-r from-amber-200 via-orange-300 to-amber-200 bg-clip-text text-2xl font-semibold tracking-wide text-transparent"
                style={{ filter: "drop-shadow(0 0 14px rgba(251,191,36,0.45))" }}
              >
                Kairosmini
              </div>
            </div>
            <CardTitle>初晓 OS 系统</CardTitle>
            <CardDescription>使用邮箱或手机号 + 密码登录工作台</CardDescription>
          </CardHeader>
          <CardContent>
            {/* LoginForm 内部用 useSearchParams 读 ?error / ?notice，自己显示提示 */}
            <LoginForm />
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
