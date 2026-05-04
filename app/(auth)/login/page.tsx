import Image from "next/image";
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
      <div className="pointer-events-none absolute inset-x-0 top-10 mx-auto h-56 max-w-4xl rounded-full bg-gradient-to-r from-orange-200/40 via-rose-200/28 to-amber-200/35 blur-3xl" />
      <Card className="relative w-full max-w-lg overflow-hidden">
        <CardHeader className="items-center pb-6 text-center">
          <div className="mb-3 flex flex-col items-center">
            <div className="relative mb-3 flex h-24 w-24 items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-orange-200/40 blur-2xl" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-[28px] border border-white/80 bg-white/54 shadow-[0_18px_46px_rgba(238,97,25,0.18)] backdrop-blur-xl">
                <Image
                  src="/brand/kairosmini-mark.svg"
                  alt="Kairosmini"
                  width={512}
                  height={512}
                  priority
                  className="h-20 w-20 object-contain"
                />
              </div>
            </div>
            <div className="bg-gradient-to-r from-slate-950 via-orange-700 to-red-500 bg-clip-text text-3xl font-semibold tracking-normal text-transparent">
              Kairosmini
            </div>
          </div>
          <CardTitle>初晓 OS 系统</CardTitle>
          <CardDescription>Kairosmini · 登录后进入组织工作台。</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm initialMessage={initialMessage} />
        </CardContent>
      </Card>
    </main>
  );
}
