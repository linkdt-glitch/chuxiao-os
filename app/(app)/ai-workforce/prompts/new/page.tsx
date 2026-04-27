import { createPromptAction } from "@/app/(app)/ai-workforce/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getMembers } from "@/lib/data/queries";

export default async function NewPromptPage() {
  const members = await getMembers();
  const humans = members.filter((member) => member.member_type === "human");

  return (
    <>
      <PageHeader
        title="创建 Prompt"
        description="Prompt 是组织 AI 能力资产。创建时自动生成 v1.0 版本，published 状态表示组织正式可用。"
      />
      <Card className="max-w-4xl">
        <CardHeader>
          <CardTitle>Prompt 模板</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createPromptAction} className="grid gap-4 md:grid-cols-2">
            <Field label="名称" name="name" placeholder="财务异常分析 Prompt" />
            <Field label="场景" name="scenario" placeholder="财务月度分析" />
            <Field label="所属模块" name="module" placeholder="finance / projects / ai_workforce" />
            <Field label="标签" name="tags" placeholder="finance, analysis" />
            <div className="space-y-2">
              <Label htmlFor="owner_id">负责人</Label>
              <select id="owner_id" name="owner_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                {humans.map((member) => <option key={member.id} value={member.user_id ?? ""}>{member.display_name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">状态</Label>
              <select id="status" name="status" defaultValue="draft" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                <option value="draft">draft</option>
                <option value="published">published</option>
                <option value="archived">archived</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">描述</Label>
              <Textarea id="description" name="description" placeholder="这个 Prompt 解决什么问题，适合什么输入。" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="input_variables">输入变量</Label>
              <Textarea id="input_variables" name="input_variables" placeholder='period, records 或 [{"name":"period","type":"string"}]' />
            </div>
            <div className="space-y-2">
              <Label htmlFor="output_format">输出格式</Label>
              <Textarea id="output_format" name="output_format" placeholder="结构化摘要、风险、建议动作" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="quality_criteria">质量标准</Label>
              <Textarea id="quality_criteria" name="quality_criteria" placeholder="必须可追溯；不能编造事实；高风险动作只输出建议。" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="content">Prompt 内容</Label>
              <Textarea id="content" name="content" className="min-h-56 font-mono" placeholder="你是 {{role}}。请基于 {{input}} 输出..." />
            </div>
            <div className="md:col-span-2">
              <Button type="submit">创建并生成 v1.0</Button>
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
