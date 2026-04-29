import Link from "next/link";
import { CreateFeedbackForm } from "@/components/evolution/create-feedback-form";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getEvolutionData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function EvolutionPage() {
  const data = await getEvolutionData();

  return (
    <>
      <PageHeader
        title="成长飞轮引擎"
        description="通过反馈、复盘、SOP 和优化建议，让组织持续进化。核心价值：让每一次执行都成为下一次做得更好的数据。"
      />

      <div className="mb-6 grid gap-4 md:grid-cols-5">
        {["发现问题", "总结经验", "优化流程", "升级能力", "再次执行"].map((step, index) => (
          <Card key={step}>
            <CardContent className="p-4">
              <Badge variant="info">0{index + 1}</Badge>
              <div className="mt-3 text-sm font-medium">{step}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <CreateFeedbackForm />

        <div className="grid gap-4">
          <SummaryCard title="反馈记录" value={data.stats.feedbackCount} href="#feedback" />
          <SummaryCard title="复盘记录" value={data.stats.reviewCount} href="/knowledge/reviews" />
          <SummaryCard title="SOP 记录" value={data.stats.sopCount} href="/knowledge/sops" />
          <SummaryCard title="优化建议" value={data.stats.openImprovements} href="/evolution/improvements" />
        </div>
      </div>

      <Card id="feedback" className="mt-6">
        <CardHeader>
          <CardTitle>反馈记录</CardTitle>
        </CardHeader>
        <CardContent>
          {data.feedback.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>对象</TableHead>
                  <TableHead>类型</TableHead>
                  <TableHead>评分</TableHead>
                  <TableHead>内容</TableHead>
                  <TableHead>时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.feedback.slice(0, 8).map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.target_type}</TableCell>
                    <TableCell>{item.feedback_type}</TableCell>
                    <TableCell>{item.rating ?? "-"}</TableCell>
                    <TableCell className="max-w-md truncate">{item.content ?? "-"}</TableCell>
                    <TableCell>{formatDate(item.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState title="暂无反馈记录" description="先从人工反馈开始，未来可连接 Agent 输出、Prompt 运行和业务事件。" />
          )}
        </CardContent>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>复盘记录</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/knowledge/reviews">管理</Link></Button>
          </CardHeader>
          <CardContent>
            {data.reviews.length ? data.reviews.slice(0, 4).map((review) => (
              <div key={review.id} className="border-b py-3 last:border-0">
                <div className="font-medium">{review.title}</div>
                <div className="text-xs text-muted-foreground">{review.review_type}</div>
              </div>
            )) : <EmptyState title="暂无复盘" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>SOP 记录</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/knowledge/sops">管理</Link></Button>
          </CardHeader>
          <CardContent>
            {data.sops.length ? data.sops.slice(0, 4).map((sop) => (
              <div key={sop.id} className="flex items-center justify-between border-b py-3 last:border-0">
                <span className="font-medium">{sop.title}</span>
                <StatusBadge value={sop.status} />
              </div>
            )) : <EmptyState title="暂无 SOP" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>优化建议</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/evolution/improvements">管理</Link></Button>
          </CardHeader>
          <CardContent>
            {data.improvements.length ? data.improvements.slice(0, 4).map((item) => (
              <div key={item.id} className="space-y-2 border-b py-3 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{item.title}</span>
                  <RiskBadge value={item.impact_level} />
                </div>
                <StatusBadge value={item.status} />
              </div>
            )) : <EmptyState title="暂无优化建议" description="系统会在积累反馈、复盘、SOP 和事件后逐步生成建议。" />}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function SummaryCard({ title, value, href }: { title: string; value: number; href: string }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <div className="text-2xl font-semibold">{value}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
        <Button asChild variant="outline" size="sm"><Link href={href}>查看</Link></Button>
      </CardContent>
    </Card>
  );
}
