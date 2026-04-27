import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getSopRecords } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { createSopAction, updateSopAction } from "../../evolution/actions";

export default async function SopsPage() {
  const sops = await getSopRecords();

  return (
    <>
      <PageHeader
        title="SOP 记录"
        description="组织大脑库的一部分。把反复有效的流程沉淀为可复用标准，让经验不只停留在人脑里。"
      />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>创建 SOP</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createSopAction} className="space-y-4">
              <Field name="title" label="标题" placeholder="月度财务复盘流程" />
              <Field name="scenario" label="适用场景" placeholder="月末经营分析" />
              <Field name="related_module" label="关联模块" placeholder="finance / projects / agents" />
              <Field name="version" label="版本" placeholder="1.0" defaultValue="1.0" />
              <Field name="status" label="状态" placeholder="draft / active / archived" defaultValue="draft" />
              <div className="space-y-2">
                <Label htmlFor="description">说明</Label>
                <Textarea id="description" name="description" placeholder="这个 SOP 解决什么问题" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="steps">步骤</Label>
                <Textarea id="steps" name="steps" placeholder={"一行一个步骤\n1. 收集数据\n2. 检查异常\n3. 输出结论"} />
              </div>
              <Button className="w-full" type="submit">保存 SOP</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SOP 列表</CardTitle>
          </CardHeader>
          <CardContent>
            {sops.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>场景</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead>版本</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>编辑</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sops.map((sop) => (
                    <TableRow key={sop.id}>
                      <TableCell>
                        <div className="font-medium">{sop.title}</div>
                        <div className="text-xs text-muted-foreground">{sop.description ?? "-"}</div>
                      </TableCell>
                      <TableCell>{sop.scenario ?? "-"}</TableCell>
                      <TableCell>{sop.related_module ? <Badge variant="outline">{sop.related_module}</Badge> : "-"}</TableCell>
                      <TableCell>{sop.version}</TableCell>
                      <TableCell><StatusBadge value={sop.status} /></TableCell>
                      <TableCell>
                        <form action={updateSopAction} className="flex gap-2">
                          <input type="hidden" name="id" value={sop.id} />
                          <input type="hidden" name="title" value={sop.title} />
                          <input type="hidden" name="scenario" value={sop.scenario ?? ""} />
                          <input type="hidden" name="related_module" value={sop.related_module ?? ""} />
                          <input type="hidden" name="version" value={sop.version} />
                          <select name="status" defaultValue={sop.status} className="h-8 rounded-md border bg-background px-2 text-xs">
                            {["draft", "active", "archived"].map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <Button size="sm" variant="outline">保存</Button>
                        </form>
                      </TableCell>
                      <TableCell>{formatDate(sop.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无 SOP" description="创建第一个 SOP，把一次有效流程沉淀为组织能力。" />
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({ name, label, placeholder, defaultValue }: { name: string; label: string; placeholder?: string; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  );
}
