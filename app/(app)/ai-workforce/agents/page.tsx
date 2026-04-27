import Link from "next/link";
import { Archive, Eye, Pause, Play, Plus } from "lucide-react";
import { activateAgentAction, archiveAgentAction, pauseAgentAction } from "@/app/(app)/ai-workforce/actions";
import { PermissionLevelBadge, RiskLevelHint } from "@/components/ai-workforce/badges";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getAgents } from "@/lib/ai-workforce/agents";
import { formatDate } from "@/lib/utils";

export default async function WorkforceAgentsPage() {
  const agents = await getAgents();

  return (
    <>
      <PageHeader
        title="Agent 档案"
        description="像管理员工一样管理 AI Agent。每个 Agent 必须有负责人、权限等级、允许模块、状态和运行留痕。"
        action={<Button asChild><Link href="/ai-workforce/agents/new"><Plus className="h-4 w-4" />创建 Agent</Link></Button>}
      />

      <Card>
        <CardContent className="p-0">
          {agents.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>权限等级</TableHead>
                  <TableHead>绑定 Prompt</TableHead>
                  <TableHead>最近运行</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="font-medium">{agent.name}</div>
                      <div className="max-w-sm truncate text-xs text-muted-foreground">{agent.description}</div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(agent.allowed_modules as string[]).map((moduleKey) => <Badge key={moduleKey} variant="outline">{moduleKey}</Badge>)}
                      </div>
                    </TableCell>
                    <TableCell>{agent.owner?.full_name ?? agent.owner_user_id}</TableCell>
                    <TableCell>
                      <PermissionLevelBadge value={agent.permission_level} />
                      <RiskLevelHint level={agent.permission_level} />
                    </TableCell>
                    <TableCell>
                      {agent.bindings?.length ? agent.bindings.map((binding) => (
                        <div key={binding.id} className="text-sm">{binding.prompt?.name ?? binding.prompt_template_id}</div>
                      )) : <span className="text-xs text-muted-foreground">未绑定</span>}
                    </TableCell>
                    <TableCell>{agent.last_run_at ? formatDate(agent.last_run_at) : "-"}</TableCell>
                    <TableCell><StatusBadge value={agent.status} /></TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button asChild variant="outline" size="sm"><Link href={`/ai-workforce/agents/${agent.id}`}><Eye className="h-4 w-4" />查看</Link></Button>
                      {agent.status === "paused" ? (
                        <form action={activateAgentAction} className="inline">
                          <input type="hidden" name="id" value={agent.id} />
                          <ConfirmSubmitButton confirmText="确认启用这个 Agent？"><Play className="h-4 w-4" />启用</ConfirmSubmitButton>
                        </form>
                      ) : (
                        <form action={pauseAgentAction} className="inline">
                          <input type="hidden" name="id" value={agent.id} />
                          <ConfirmSubmitButton confirmText="暂停 Agent 会阻止后续自动动作，确认继续？"><Pause className="h-4 w-4" />暂停</ConfirmSubmitButton>
                        </form>
                      )}
                      <form action={archiveAgentAction} className="inline">
                        <input type="hidden" name="id" value={agent.id} />
                        <ConfirmSubmitButton variant="destructive" confirmText="归档后不再作为可运行 Agent 使用，确认继续？"><Archive className="h-4 w-4" />归档</ConfirmSubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-5">
              <EmptyState title="暂无 Agent" description="创建第一个 AI 员工后，可以绑定 Prompt、记录运行、接入人工确认。" />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
