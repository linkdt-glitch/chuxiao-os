import Image from "next/image";
import { Building2, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const errorMessages: Record<string, string> = {
  not_invited: "这个邮箱暂未加入初晓 OS 的准入名单。",
  missing_supabase_env: "生产环境还没有配置 Supabase 环境变量，请先完成部署环境设置。"
};

export default async function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const initialMessage = params?.error ? errorMessages[params.error] ?? params.error : undefined;

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-56 max-w-4xl rounded-full bg-gradient-to-r from-cyan-200/35 via-indigo-200/24 to-rose-200/30 blur-3xl" />
      <Card className="relative w-full max-w-lg overflow-hidden">
        <CardHeader className="items-center text-center">
          <div className="brand-wordmark-frame mb-4 w-full">
            <Image
              src="/brand/kairosmini-logo-compact.jpg"
              alt="Kairosmini"
              width={520}
              height={467}
              priority
              className="mx-auto h-28 w-full object-contain"
            />
          </div>
          <div className="brand-mark-frame mb-2 flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl">
            <Image
              src="/brand/kairosmini-mark-compact.png"
              alt="初晓 OS"
              width={160}
              height={160}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <CardTitle>初晓 OS 系统</CardTitle>
          <CardDescription>Kairosmini · 登录后进入组织工作台。</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm initialMessage={initialMessage} />
          <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              注册后自动初始化组织、角色、模块。
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              组织数据通过 RLS 按 organization_id 隔离。
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
