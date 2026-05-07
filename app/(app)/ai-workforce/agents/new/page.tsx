import { createAgentAction } from "@/app/(app)/ai-workforce/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMembers } from "@/lib/data/queries";
import { getAISettingsData } from "@/lib/data/queries";

export default async function NewWorkforceAgentPage() {
  const [members, aiSettings] = await Promise.all([getMembers(), getAISettingsData()]);
  const humans = members.filter((member) => member.member_type === "human");

  return (
    <>
      <PageHeader
        title="创建 Agent"
        description="配置 AI 员工的负责人、权限等级、允许模块、允许工具和默认 Provider。L3/L4 动作必须进入人工确认或审批。"
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>基础档案</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createAgentAction} className="grid gap-4 md:grid-cols-2">
            <Field label="名称" name="name" placeholder="财务分析 Agent" />
            <div className="space-y-2">
              <Label htmlFor="owner_user_id">负责人</Label>
              <select id="owner_user_id" name="owner_user_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                {humans.map((member) => (
                  <option key={member.id} value={member.user_id ?? ""}>{member.display_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="permission_level">权限等级</Label>
              <select id="permission_level" name="permission_level" defaultValue="L1" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                <option value="L1">L1：只读与建议</option>
                <option value="L2">L2：内容生成</option>
                <option value="L3">L3：内部动作</option>
                <option value="L4">L4：高风险动作</option>
                <option value="L5">L5：禁止自动执行</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <select id="status" name="status" defaultValue="active" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                <option value="active">active</option>
                <option value="paused">paused</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <Field label="允许模块" name="allowed_modules" placeholder="finance, projects, ai_workforce" />
            <Field label="允许工具" name="allowed_tools" placeholder="summarize, draft_report" />
            <div className="space-y-2">
              <Label htmlFor="default_provider_id">默认 Provider</Label>
              <select id="default_provider_id" name="default_provider_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                <option value="">使用组织默认 Provider</option>
                {aiSettings.providers.map((provider) => (
                  <option key={provider.id} value={provider.id}>{provider.label} · {provider.model_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="config">配置 JSON</Label>
              <Textarea id="config" name="config" defaultValue={'{"require_human_confirm":true}'} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">描述</Label>
              <Textarea id="description" name="description" placeholder="AI 员工职责、边界和风险说明" />
            </div>
            <div className="flex gap-3 md:col-span-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/ai-workforce/agents">取消</Link>
              </Button>
              <Button type="submit">创建 Agent</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

function Field({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} />
    </div>
  );
}
