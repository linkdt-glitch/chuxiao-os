import Link from "next/link";
import { BookOpen, FileText, FolderOpen, History, Library, Upload } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getKnowledgeData } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

const assetLabels: Record<string, string> = {
  receipt: "票据",
  contract: "合同",
  project_doc: "项目资料",
  prompt_doc: "提示词文档",
  agent_output: "AI 员工输出",
  sop: "SOP",
  review: "复盘",
  other: "其他"
};

export default async function KnowledgePage() {
  const data = await getKnowledgeData();

  return (
    <>
      <PageHeader
        title="组织大脑库"
        description="原知识与记忆底座。沉淀文件、票据、项目资料、Prompt 文档、Agent 输出、SOP、复盘和经验，让组织越用越聪明。核心价值：把信息变成知识，把经验变成组织能力。"
      />

      <div className="grid gap-4 md:grid-cols-6">
        <Metric label="文件总数" value={data.stats.fileCount} icon={Library} />
        <Metric label="本月上传" value={data.stats.uploadedThisMonth} icon={Upload} />
        <Metric label="票据" value={data.stats.receiptCount} icon={FileText} />
        <Metric label="项目资料" value={data.stats.projectDocCount} icon={FolderOpen} />
        <Metric label="SOP" value={data.stats.sopCount} icon={BookOpen} />
        <Metric label="复盘" value={data.stats.reviewCount} icon={History} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>知识资产分类</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.categoryCounts.map((item) => (
              <div key={item.assetType} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <span>{assetLabels[item.assetType] ?? item.assetType}</span>
                <Badge variant={item.count ? "info" : "secondary"}>{item.count}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>最近知识资产</CardTitle>
            <Button asChild variant="outline" size="sm"><Link href="/files">文件中心</Link></Button>
          </CardHeader>
          <CardContent>
            {data.files.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>文件名</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>上传人</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead>创建时间</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.files.slice(0, 8).map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="font-medium">{file.file_name}</div>
                        <div className="text-xs text-muted-foreground">{file.summary ?? file.storage_path}</div>
                      </TableCell>
                      <TableCell>{assetLabels[file.asset_type ?? "other"] ?? "其他"}</TableCell>
                      <TableCell>{file.uploaded_by_type}:{file.uploaded_by ?? "system"}</TableCell>
                      <TableCell className="space-x-1">
                        {(file.tags ?? []).slice(0, 3).map((tag: string) => <Badge key={tag} variant="outline">{tag}</Badge>)}
                      </TableCell>
                      <TableCell>{formatDate(file.created_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState title="暂无知识资产" description="上传文件、沉淀 SOP、记录复盘后，组织大脑库会逐步变厚。" />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <EntryCard title="SOP 记录" description="沉淀可复用的标准流程，先支持人工创建和查看。" href="/knowledge/sops" />
        <EntryCard title="复盘记录" description="记录做得好、问题、经验和下一步行动。" href="/knowledge/reviews" />
        <EntryCard title="AI 知识预留" description="后续接入 AI 总结、知识检索和 RAG，不在本次做复杂向量库。" href="/ai-workforce" />
      </div>
    </>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Library }) {
  return (
    <Card>
      <CardContent className="p-4">
        <Icon className="mb-3 h-4 w-4 text-muted-foreground" />
        <div className="text-2xl font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function EntryCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <p>{description}</p>
        <Button asChild variant="outline" size="sm"><Link href={href}>进入</Link></Button>
      </CardContent>
    </Card>
  );
}
