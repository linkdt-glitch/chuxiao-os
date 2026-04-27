import { Building2, ShieldCheck } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>登录 AI Company OS</CardTitle>
          <CardDescription>邮箱登录；注册后会创建默认组织并绑定 Owner。</CardDescription>
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
