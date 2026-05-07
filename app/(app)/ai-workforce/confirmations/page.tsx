import { approveConfirmationAction, createConfirmationAction, rejectConfirmationAction } from "@/app/(app)/ai-workforce/actions";
import { FeedbackForm } from "@/components/ai-workforce/feedback-form";
import { RiskBadge } from "@/components/ai-workforce/badges";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAgents } from "@/lib/ai-workforce/agents";
import { getConfirmations } from "@/lib/ai-workforce/confirmations";
import { getPrompts } from "@/lib/ai-workforce/prompts";
import { formatDate } from "@/lib/utils";

export default async function ConfirmationsPage() {
  const [confirmations, agents, prompts] = await Promise.all([getConfirmations(), getAgents(), getPrompts()]);

  return (
    <>
      <PageHeader
        title="AI 审批与人工确认"
        description="高风险 AI 动作统一留在智能劳动力中心处理。L3/L4 动作、对外发送、重要数据修改和大量任务创建都必须由人类确认。"
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>创建确认请求</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createConfirmationAction} className="space-y-3">
              <Field label="标题" name="title" placeholder="AI 员工建议创建 3 个任务" />
              <div className="space-y-2">
                <Label htmlFor="agent_id">来源 Agent</Label>
                <select id="agent_id" name="agent_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="">无</option>
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prompt_template_id">关联 Prompt</Label>
                <select id="prompt_template_id" name="prompt_template_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="">无</option>
                  {prompts.map((prompt) => <option key={prompt.id} value={prompt.id}>{prompt.name}</option>)}
                </select>
              </div>
              <Field label="关联模块" name="related_module" placeholder="projects / finance" />
              <Field label="动作类型" name="action_type" placeholder="create_tasks" />
              <div className="space-y-2">
                <Label htmlFor="risk_level">风险等级</Label>
                <select id="risk_level" name="risk_level" defaultValue="medium" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                  <option value="critical">critical</option>
                </select>
              </div>
              <Textarea name="description" placeholder="说明为什么需要人工确认" />
              <Textarea name="input_data" placeholder='{"project":"官网改版"}' />
              <Textarea name="proposed_output" placeholder='{"tasks":["补齐验收标准"]}' />
              <Button type="submit" className="w-full">创建确认请求</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 审批事项</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>事项</TableHead>
                  <TableHead>来源 Agent</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>动作</TableHead>
                  <TableHead>风险</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>建议内容</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmations.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{formatDate(item.created_at)}</div>
                    </TableCell>
                    <TableCell>{item.agent?.name ?? item.agent_id ?? "-"}</TableCell>
                    <TableCell>{item.related_module ?? "-"}</TableCell>
                    <TableCell>{item.action_type}</TableCell>
                    <TableCell><RiskBadge value={item.risk_level} /></TableCell>
                    <TableCell><StatusBadge value={item.status} /></TableCell>
                    <TableCell className="max-w-xs truncate">{JSON.stringify(item.proposed_output)}</TableCell>
                    <TableCell className="text-right">
                      {item.status === "pending" ? (
                        <div className="space-y-2">
                          <form action={approveConfirmationAction} className="inline-flex gap-2">
                            <input type="hidden" name="id" value={item.id} />
                            <Input name="decision_note" placeholder="批准备注" className="w-28" />
                            <ConfirmSubmitButton confirmText="确认批准这个 AI 建议动作？">批准</ConfirmSubmitButton>
                          </form>
                          <form action={rejectConfirmationAction} className="inline-flex gap-2">
                            <input type="hidden" name="id" value={item.id} />
                            <Input name="decision_note" placeholder="驳回原因" className="w-28" />
                            <ConfirmSubmitButton variant="destructive" confirmText="确认驳回这个 AI 建议动作？">驳回</ConfirmSubmitButton>
                          </form>
                        </div>
                      ) : (
                        <FeedbackForm targetType="confirmation_request" targetId={item.id} compact />
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
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
