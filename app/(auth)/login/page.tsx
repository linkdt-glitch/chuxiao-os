import Image from "next/image";
import { Building2, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardHeader className="items-center text-center">
          <div className="brand-glow mb-2 flex h-36 w-full max-w-xs items-center justify-center overflow-hidden rounded-lg bg-white/78 p-3">
            <Image
              src="/brand/kairosmini-logo.png"
              alt="Kairosmini"
              width={260}
              height={180}
              priority
              className="h-full w-full object-contain"
            />
          </div>
          <CardTitle>Kairosmini OS</CardTitle>
          <CardDescription>登录 AI Company OS；邮箱登录后进入组织工作台。</CardDescription>
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
