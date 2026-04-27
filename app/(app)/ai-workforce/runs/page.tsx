import { createAgentRunAction } from "@/app/(app)/ai-workforce/actions";
import { FeedbackForm } from "@/components/ai-workforce/feedback-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getAgents } from "@/lib/ai-workforce/agents";
import { getAgentRuns } from "@/lib/ai-workforce/runs";
import { formatDate } from "@/lib/utils";

export default async function RunsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [runs, agents] = await Promise.all([
    getAgentRuns({ agent_id: params.agent_id, status: params.status ?? "all" }),
    getAgents()
  ]);

  return (
    <>
      <PageHeader
        title="Agent 运行记录"
        description="记录 Agent 运行类型、所属模块、状态、输入摘要、输出摘要、错误信息、AI 调用和反馈评分。"
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>记录一次运行</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createAgentRunAction} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="agent_id">Agent</Label>
                <select id="agent_id" name="agent_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
                </select>
              </div>
              <Field label="运行类型" name="run_type" placeholder="manual / task_assist / finance_analysis" />
              <Field label="所属模块" name="related_module" placeholder="finance / projects" />
              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <select id="status" name="status" defaultValue="success" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="success">success</option>
                  <option value="failed">failed</option>
                  <option value="pending_confirmation">pending_confirmation</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </div>
              <Textarea name="input" placeholder='{"summary":"用户请求"}' />
              <Textarea name="output" placeholder='{"summary":"Agent 输出"}' />
              <Textarea name="error_message" placeholder="错误信息，可选" />
              <Button type="submit" className="w-full">写入运行记录</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>运行列表</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="mb-4 grid gap-2 md:grid-cols-3">
              <select name="agent_id" defaultValue={params.agent_id ?? ""} className="h-9 rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                <option value="">全部 Agent</option>
                {agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}
              </select>
              <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                <option value="all">全部状态</option>
                <option value="success">success</option>
                <option value="failed">failed</option>
                <option value="pending_confirmation">pending_confirmation</option>
                <option value="cancelled">cancelled</option>
              </select>
              <Button type="submit" variant="outline">筛选</Button>
            </form>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>输入摘要</TableHead>
                  <TableHead>输出摘要</TableHead>
                  <TableHead>错误</TableHead>
                  <TableHead>反馈</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell>{run.agent?.name ?? run.agent_id}</TableCell>
                    <TableCell>{run.run_type}</TableCell>
                    <TableCell>{run.related_module ?? "-"}</TableCell>
                    <TableCell><StatusBadge value={run.status} /></TableCell>
                    <TableCell className="max-w-[160px] truncate">{JSON.stringify(run.input)}</TableCell>
                    <TableCell className="max-w-[160px] truncate">{JSON.stringify(run.output)}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{run.error_message ?? "-"}</TableCell>
                    <TableCell>
                      <div className="mb-2">{run.feedback?.[0]?.rating ?? "-"}</div>
                      <FeedbackForm targetType="agent_run" targetId={run.id} compact />
                    </TableCell>
                    <TableCell>{formatDate(run.started_at)}</TableCell>
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
