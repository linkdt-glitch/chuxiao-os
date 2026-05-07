import Link from "next/link";
import { Archive, Eye, Plus, Rocket, TestTube2 } from "lucide-react";
import { archivePromptAction, publishPromptAction } from "@/app/(app)/ai-workforce/actions";
import { ConfirmSubmitButton } from "@/components/finance/confirm-submit-button";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getPrompts } from "@/lib/ai-workforce/prompts";
import { formatDate } from "@/lib/utils";

export default async function PromptsPage() {
  const prompts = await getPrompts();

  return (
    <>
      <PageHeader
        title="提示词库"
        description="把高质量 Prompt 沉淀为组织资产。Prompt 包含场景、模块、变量、输出格式、质量标准、版本、负责人和状态。"
        action={<Button asChild><Link href="/ai-workforce/prompts/new"><Plus className="h-4 w-4" />创建提示词</Link></Button>}
      />
      <Card>
        <CardContent className="p-0">
          {prompts.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>场景</TableHead>
                  <TableHead>所属模块</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>版本</TableHead>
                  <TableHead>负责人</TableHead>
                  <TableHead>最近更新</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prompts.map((prompt) => (
                  <TableRow key={prompt.id}>
                    <TableCell>
                      <div className="font-medium">{prompt.name}</div>
                      <div className="max-w-sm truncate text-xs text-muted-foreground">{prompt.description}</div>
                    </TableCell>
                    <TableCell>{prompt.scenario}</TableCell>
                    <TableCell>{prompt.module}</TableCell>
                    <TableCell><StatusBadge value={prompt.status} /></TableCell>
                    <TableCell>{prompt.current_version}</TableCell>
                    <TableCell>{prompt.owner?.full_name ?? prompt.owner_id ?? "-"}</TableCell>
                    <TableCell>{formatDate(prompt.updated_at)}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <Button asChild variant="outline" size="sm"><Link href={`/ai-workforce/prompts/${prompt.id}`}><Eye className="h-4 w-4" />查看</Link></Button>
                      <Button asChild variant="outline" size="sm"><Link href={`/ai-workforce/prompts/${prompt.id}#test`}><TestTube2 className="h-4 w-4" />测试</Link></Button>
                      <form action={publishPromptAction} className="inline">
                        <input type="hidden" name="id" value={prompt.id} />
                        <ConfirmSubmitButton confirmText="发布后会成为组织正式 Prompt，确认继续？"><Rocket className="h-4 w-4" />发布</ConfirmSubmitButton>
                      </form>
                      <form action={archivePromptAction} className="inline">
                        <input type="hidden" name="id" value={prompt.id} />
                        <ConfirmSubmitButton variant="destructive" confirmText="归档后不再作为正式 Prompt 使用，确认继续？"><Archive className="h-4 w-4" />归档</ConfirmSubmitButton>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="p-5">
              <EmptyState title="暂无提示词" description="创建提示词 时会自动生成 v1.0 版本。" />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
