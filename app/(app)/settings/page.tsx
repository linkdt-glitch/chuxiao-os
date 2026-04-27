import { Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentOrganization } from "@/lib/auth";

export default async function SettingsPage() {
  const organization = await getCurrentOrganization();

  return (
    <>
      <PageHeader
        title="Settings 系统设置"
        description="只放底座级设置入口：组织、安全、审批规则、模块设置。最高风险配置预留 Owner 审批。"
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>组织设置</CardTitle>
            <CardDescription>基础信息保存在 organizations.settings。</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="orgName">组织名称</Label>
                <Input id="orgName" defaultValue={organization.name} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" defaultValue={organization.slug} />
              </div>
              <Button type="submit"><Save className="h-4 w-4" />保存</Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>安全设置占位</CardTitle>
            <CardDescription>二次确认、敏感操作审批、API Key 加密、Agent 前台登录限制。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="rounded-md border p-3">删除、禁用、权限变更必须二次确认并进入 audit_logs。</div>
            <div className="rounded-md border p-3">Agent L4 动作必须创建 approval_requests。</div>
            <div className="rounded-md border p-3">Agent L5 动作禁止自动执行，只能由 human 操作者完成。</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>审批规则占位</CardTitle>
            <CardDescription>后续通过 approval_policies 定义模块、风险等级、审批人和步骤。</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            当前版本已经准备 approval_requests、approval_steps、approval_policies 三张表，业务模块可按 risk_level 接入。
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>模块设置入口</CardTitle>
            <CardDescription>organization_modules.settings 为每个模块保留 jsonb 配置。</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            财务、项目、Prompt、知识库、工作流等未来模块无需改造账号、权限、审计和审批体系。
          </CardContent>
        </Card>
      </div>
    </>
  );
}
