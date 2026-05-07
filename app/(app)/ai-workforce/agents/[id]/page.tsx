import Link from "next/link";
import { notFound } from "next/navigation";
import { bindPromptAction, updateAgentAction } from "@/app/(app)/ai-workforce/actions";
import { FeedbackForm } from "@/components/ai-workforce/feedback-form";
import { PermissionLevelBadge, RiskLevelHint } from "@/components/ai-workforce/badges";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAgentById } from "@/lib/ai-workforce/agents";
import { getPrompts } from "@/lib/ai-workforce/prompts";
import { getMembers, getAISettingsData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [agent, prompts, members, aiSettings] = await Promise.all([
    getAgentById(id),
    getPrompts(),
    getMembers(),
    getAISettingsData()
  ]);
  if (!agent) notFound();
  const humans = members.filter((member) => member.member_type === "human");

  return (
    <>
      <PageHeader
        title={agent.name}
        description="AI 员工详情包含基本信息、负责人、权限等级、允许模块、绑定提示词、运行记录、AI 调用记录和反馈评分。"
        action={<Button asChild variant="outline"><Link href="/ai-workforce/agents">返回列表</Link></Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">负责人</span><span>{agent.owner?.full_name ?? agent.owner_user_id}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">状态</span><StatusBadge value={agent.status} /></div>
              <div className="space-y-1">
                <PermissionLevelBadge value={agent.permission_level} />
                <RiskLevelHint level={agent.permission_level} />
              </div>
              <div className="flex flex-wrap gap-1">
                {(agent.allowed_modules as string[]).map((moduleKey) => <Badge key={moduleKey} variant="outline">{moduleKey}</Badge>)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>绑定提示词</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {agent.bindings?.map((binding) => (
                <div key={binding.id} className="rounded-md border border-slate-200/70 bg-white/60 p-3 text-sm">
                  <div className="font-medium">{binding.prompt?.name ?? binding.prompt_template_id}</div>
                  <div className="text-xs text-muted-foreground">版本 {binding.prompt_version?.version ?? binding.prompt_version_id ?? "当前版本"}</div>
                </div>
              ))}
              <form action={bindPromptAction} className="space-y-2">
                <input type="hidden" name="agent_id" value={agent.id} />
                <select name="prompt_template_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.name}</option>)}
                </select>
                <Button type="submit" size="sm" variant="outline">绑定提示词</Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>编辑 Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateAgentAction} className="grid gap-3 md:grid-cols-2">
                <input type="hidden" name="id" value={agent.id} />
                <Field label="名称" name="name" defaultValue={agent.name} />
                <div className="space-y-2">
                  <Label htmlFor="owner_user_id">负责人</Label>
                  <select id="owner_user_id" name="owner_user_id" defaultValue={agent.owner_user_id} className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                    {humans.map((member) => <option key={member.id} value={member.user_id ?? ""}>{member.display_name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="permission_level">权限等级</Label>
                  <select id="permission_level" name="permission_level" defaultValue={agent.permission_level} className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                    {["L1", "L2", "L3", "L4", "L5"].map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">状态</Label>
                  <select id="status" name="status" defaultValue={agent.status} className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                    <option value="active">active</option>
                    <option value="paused">paused</option>
                    <option value="archived">archived</option>
                  </select>
                </div>
                <Field label="允许模块" name="allowed_modules" defaultValue={(agent.allowed_modules as string[]).join(", ")} />
                <Field label="允许工具" name="allowed_tools" defaultValue={(agent.allowed_tools as string[]).join(", ")} />
                <div className="space-y-2">
                  <Label htmlFor="default_provider_id">默认 Provider</Label>
                  <select id="default_provider_id" name="default_provider_id" defaultValue={agent.default_provider_id ?? ""} className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                    <option value="">使用组织默认 Provider</option>
                    {aiSettings.providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.label}</option>)}
                  </select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">描述</Label>
                  <Textarea id="description" name="description" defaultValue={agent.description} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="config">配置 JSON</Label>
                  <Textarea id="config" name="config" defaultValue={JSON.stringify(agent.config ?? {}, null, 2)} />
                </div>
                <div className="md:col-span-2">
                  <Button type="submit">保存修改</Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>运行记录</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>输入</TableHead>
                    <TableHead>输出</TableHead>
                    <TableHead>反馈</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(agent.runs ?? []).slice(0, 8).map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>{run.run_type}</TableCell>
                      <TableCell><StatusBadge value={run.status} /></TableCell>
                      <TableCell className="max-w-[180px] truncate">{JSON.stringify(run.input)}</TableCell>
                      <TableCell className="max-w-[180px] truncate">{JSON.stringify(run.output)}</TableCell>
                      <TableCell>{run.feedback?.[0]?.rating ?? "-"}</TableCell>
                      <TableCell>{formatDate(run.started_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {agent.runs?.[0] ? <div className="mt-4"><FeedbackForm targetType="agent_run" targetId={agent.runs[0].id} compact /></div> : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} defaultValue={defaultValue} />
    </div>
  );
}
