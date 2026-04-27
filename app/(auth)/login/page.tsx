import Image from "next/image";
import { Building2, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader className="items-center text-center">
          <div className="brand-glow mb-2 flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-slate-950/95">
            <Image
              src="/brand/chuxiao-mark.png"
              alt="初晓 OS"
              width={96}
              height={96}
              priority
              className="h-full w-full object-cover"
            />
          </div>
          <CardTitle>初晓 OS 系统</CardTitle>
          <CardDescription>登录初晓 OS；邮箱登录后进入组织工作台。</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
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
