import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateSopForm, UpdateSopInlineForm } from "@/components/knowledge/create-sop-form";
import { getSopRecords } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function SopsPage() {
  const sops = await getSopRecords();

  return (
    <>
      <PageHeader
        title="SOP 记录"
        description="组织大脑库的一部分。把反复有效的流程沉淀为可复用标准，让经验不只停留在人脑里。"
      />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <CreateSopForm />

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
                    <TableHead>操作</TableHead>
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
                        <UpdateSopInlineForm sop={sop} />
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
