import Link from "next/link";
import { notFound } from "next/navigation";
import { createPromptVersionAction, testPromptAction, updatePromptAction } from "@/app/(app)/ai-workforce/actions";
import { FeedbackForm } from "@/components/ai-workforce/feedback-form";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getPromptById } from "@/lib/ai-workforce/prompts";
import { getMembers } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function PromptDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [prompt, members] = await Promise.all([getPromptById(id), getMembers()]);
  if (!prompt) notFound();
  const currentVersion = prompt.versions?.find((version) => version.version === prompt.current_version) ?? prompt.versions?.[0];
  const humans = members.filter((member) => member.member_type === "human");

  return (
    <>
      <PageHeader
        title={prompt.name}
        description="Prompt 详情展示当前版本、内容、输入变量、输出格式、版本历史、绑定 Agent、测试入口和反馈评分。"
        action={<Button asChild variant="outline"><Link href="/ai-workforce/prompts">返回模板库</Link></Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>当前版本 {prompt.current_version}</CardTitle>
              <StatusBadge value={prompt.status} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 text-sm md:grid-cols-3">
                <div><div className="text-muted-foreground">场景</div><div>{prompt.scenario}</div></div>
                <div><div className="text-muted-foreground">所属模块</div><div>{prompt.module}</div></div>
                <div><div className="text-muted-foreground">负责人</div><div>{prompt.owner?.full_name ?? prompt.owner_id ?? "-"}</div></div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">Prompt 内容</div>
                <pre className="max-h-96 overflow-auto rounded-md border border-slate-200/70 bg-white/70 p-4 text-xs">{currentVersion?.content ?? ""}</pre>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium">输入变量</div>
                  <pre className="rounded-md border border-slate-200/70 bg-white/70 p-3 text-xs">{JSON.stringify(prompt.input_variables, null, 2)}</pre>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">输出格式</div>
                  <div className="rounded-md border border-slate-200/70 bg-white/70 p-3 text-sm">{prompt.output_format || "-"}</div>
                </div>
              </div>
              <div>
                <div className="mb-2 text-sm font-medium">质量标准</div>
                <div className="rounded-md border border-slate-200/70 bg-white/70 p-3 text-sm">{prompt.quality_criteria || "-"}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>版本历史</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>版本</TableHead>
                    <TableHead>变更说明</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(prompt.versions ?? []).map((version) => (
                    <TableRow key={version.id}>
                      <TableCell>{version.version}</TableCell>
                      <TableCell>{version.change_note ?? "-"}</TableCell>
                      <TableCell>{formatDate(version.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card id="test">
            <CardHeader>
              <CardTitle>Prompt 测试</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={testPromptAction} className="grid gap-3 md:grid-cols-[1fr_160px]">
                <input type="hidden" name="prompt_template_id" value={prompt.id} />
                <select name="prompt_version_id" defaultValue={currentVersion?.id ?? ""} className="h-9 rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  {(prompt.versions ?? []).map((version) => <option key={version.id} value={version.id}>版本 {version.version}</option>)}
                </select>
                <Input name="rating" type="number" min="1" max="5" placeholder="测试评分" />
                <Textarea name="test_input" className="md:col-span-2" placeholder='{"period":"2026-04","records":[]}' />
                <Textarea name="notes" className="md:col-span-2" placeholder="测试备注" />
                <Button type="submit" className="md:col-span-2">调用 AI Provider 测试</Button>
              </form>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>输出</TableHead>
                    <TableHead>评分</TableHead>
                    <TableHead>时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(prompt.test_runs ?? []).slice(0, 5).map((test) => (
                    <TableRow key={test.id}>
                      <TableCell className="max-w-lg truncate">{test.test_output}</TableCell>
                      <TableCell>{test.rating ?? "-"}</TableCell>
                      <TableCell>{formatDate(test.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {prompt.test_runs?.[0] ? <FeedbackForm targetType="prompt_test_run" targetId={prompt.test_runs[0].id} compact /> : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>编辑模板</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updatePromptAction} className="space-y-3">
                <input type="hidden" name="id" value={prompt.id} />
                <Field label="名称" name="name" defaultValue={prompt.name} />
                <Field label="场景" name="scenario" defaultValue={prompt.scenario} />
                <Field label="所属模块" name="module" defaultValue={prompt.module} />
                <Field label="标签" name="tags" defaultValue={prompt.tags.join(", ")} />
                <div className="space-y-2">
                  <Label htmlFor="owner_id">负责人</Label>
                  <select id="owner_id" name="owner_id" defaultValue={prompt.owner_id ?? ""} className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                    {humans.map((member) => <option key={member.id} value={member.user_id ?? ""}>{member.display_name}</option>)}
                  </select>
                </div>
                <Textarea name="description" defaultValue={prompt.description} />
                <Textarea name="input_variables" defaultValue={JSON.stringify(prompt.input_variables, null, 2)} />
                <Textarea name="output_format" defaultValue={prompt.output_format} />
                <Textarea name="quality_criteria" defaultValue={prompt.quality_criteria} />
                <Button type="submit" size="sm">保存模板</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>创建新版本</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={createPromptVersionAction} className="space-y-3">
                <input type="hidden" name="prompt_template_id" value={prompt.id} />
                <Input name="version" placeholder="1.1" />
                <Textarea name="change_note" placeholder="变更说明" />
                <Textarea name="content" className="min-h-40 font-mono" defaultValue={currentVersion?.content ?? ""} />
                <Button type="submit" size="sm" variant="outline">生成版本</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>绑定 Agent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {(prompt.bindings ?? []).map((binding) => (
                <div key={binding.id} className="rounded-md border border-slate-200/70 bg-white/60 p-3">{binding.agent?.name ?? binding.agent_id}</div>
              ))}
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
