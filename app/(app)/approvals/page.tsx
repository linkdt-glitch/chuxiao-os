import { Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RiskBadge, StatusBadge } from "@/components/ui/status";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getApprovals } from "@/lib/data/queries";
import { formatDate } from "@/lib/utils";

export default async function ApprovalsPage() {
  const approvals = await getApprovals();

  return (
    <>
      <PageHeader
        title="Approvals 审批中心"
        description="高风险动作进入 approval_requests，后续可按 approval_policies 编排多级审批。"
      />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>创建审批</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">标题</Label>
                <Input id="title" placeholder="例如：Agent 高风险动作审批" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="module">关联模块</Label>
                <Input id="module" placeholder="agents" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">说明</Label>
                <Textarea id="desc" placeholder="说明风险、关联对象和预期结果" />
              </div>
              <Button type="submit" className="w-full">
                <Plus className="h-4 w-4" />
                提交审批
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>审批列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>请求者</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>风险</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell>
                      <div className="font-medium">{approval.title}</div>
                      <div className="text-xs text-muted-foreground">{approval.related_record_type ?? "record"}:{approval.related_record_id ?? "-"}</div>
                    </TableCell>
                    <TableCell>{approval.requester_type}</TableCell>
                    <TableCell>{approval.related_module}</TableCell>
                    <TableCell><RiskBadge value={approval.risk_level} /></TableCell>
                    <TableCell><StatusBadge value={approval.status} /></TableCell>
                    <TableCell>{formatDate(approval.created_at)}</TableCell>
                    <TableCell className="space-x-2 text-right">
                      <ConfirmButton label="批准" confirmText="确认批准该审批？" />
                      <ConfirmButton label="驳回" confirmText="确认驳回该审批？" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
