import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreateReviewForm, UpdateReviewInlineForm } from "@/components/knowledge/create-review-form";
import { getReviewRecords } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function ReviewsPage() {
  const reviews = await getReviewRecords();

  return (
    <>
      <PageHeader
        title="复盘记录"
        description="组织大脑库的一部分。记录项目、任务、审批、Agent、Prompt 和经营复盘，让经验可追溯、可复用。"
      />
      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <CreateReviewForm />

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
                        <UpdateReviewInlineForm review={review} />
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
