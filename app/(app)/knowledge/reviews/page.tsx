import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getReviewRecords } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";
import { createReviewAction, updateReviewAction } from "../../evolution/actions";

export default async function ReviewsPage() {
  const reviews = await getReviewRecords();

  return (
    <>
      <PageHeader
        title="复盘记录"
        description="组织大脑库的一部分。记录项目、任务、审批、Agent、Prompt 和经营复盘，让经验可追溯、可复用。"
      />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>创建复盘</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={createReviewAction} className="space-y-4">
              <Field name="title" label="标题" placeholder="Q2 经营复盘" />
              <Field name="review_type" label="类型" placeholder="project / agent / finance / operation" defaultValue="operation" />
              <Field name="related_module" label="关联模块" placeholder="finance / agents / approvals" />
              <Area name="summary" label="总结" />
              <Area name="what_worked" label="做得好" />
              <Area name="what_failed" label="问题" />
              <Area name="lessons_learned" label="经验" />
              <Area name="next_actions" label="下一步行动" />
              <Button className="w-full" type="submit">保存复盘</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>复盘列表</CardTitle>
          </CardHeader>
          <CardContent>
            {reviews.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>标题</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>模块</TableHead>
                    <TableHead>经验</TableHead>
                    <TableHead>编辑摘要</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell>
                        <div className="font-medium">{review.title}</div>
                        <div className="text-xs text-muted-foreground">{review.summary ?? "-"}</div>
                      </TableCell>
                      <TableCell>{review.review_type}</TableCell>
                      <TableCell>{review.related_module ? <Badge variant="outline">{review.related_module}</Badge> : "-"}</TableCell>
                      <TableCell className="max-w-xs truncate">{review.lessons_learned ?? "-"}</TableCell>
                      <TableCell>
                        <form action={updateReviewAction} className="flex min-w-64 gap-2">
                          <input type="hidden" name="id" value={review.id} />
                          <input type="hidden" name="title" value={review.title} />
                          <input type="hidden" name="lessons_learned" value={review.lessons_learned ?? ""} />
                          <input type="hidden" name="next_actions" value={review.next_actions ?? ""} />
                          <Input name="summary" defaultValue={review.summary ?? ""} className="h-8" />
                          <Button size="sm" variant="outline">保存</Button>
                        </form>
                      </TableCell>
                      <TableCell>{formatDate(review.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无复盘" description="完成一次项目、审批、Agent 或经营动作后，可以从这里沉淀经验。" />
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

function Area({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} />
    </div>
  );
}
