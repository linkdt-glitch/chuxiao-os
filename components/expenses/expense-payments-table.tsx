"use client";

import { useState } from "react";
import { CheckCircle2, WalletCards } from "lucide-react";
import { markExpenseReportsPaidAction } from "@/app/(app)/finance/reimbursements/actions";
import { ExpenseStatusBadge } from "@/components/expenses/expense-shared";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { money, type ExpenseReport } from "@/lib/finance/expense-types";

export function ExpensePaymentsTable({ reports }: { reports: ExpenseReport[] }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const approved = reports.filter((report) => report.status === "approved");
  const total = selectedIds.reduce((sum, id) => sum + (approved.find((report) => report.id === id)?.total_amount ?? 0), 0);

  function toggle(id: string) {
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  if (!approved.length) {
    return <EmptyState title="暂无待打款报销" description="审批通过后的报销会进入这里，支持批量标记打款。" />;
  }

  return (
    <div className="space-y-4">
      <form action={markExpenseReportsPaidAction} className="rounded-lg border border-white/80 bg-white/72 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] backdrop-blur-xl">
        {selectedIds.map((id) => <input key={id} type="hidden" name="id" value={id} />)}
        <div className="grid gap-3 md:grid-cols-[1fr_160px_220px_auto] md:items-end">
          <div>
            <div className="text-sm text-muted-foreground">已选金额</div>
            <div className="mt-1 text-2xl font-semibold text-slate-950">{money(total)}</div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paid_at">打款日期</Label>
            <Input id="paid_at" name="paid_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="payment_reference">流水号 / 备注</Label>
            <Input id="payment_reference" name="payment_reference" placeholder="银行流水号或批次号" />
          </div>
          <Button type="submit" disabled={!selectedIds.length}>
            <WalletCards className="h-4 w-4" />
            批量标记打款
          </Button>
        </div>
      </form>

      <div className="hidden md:block rounded-lg border border-white/80 bg-white/72 p-2 shadow-[0_14px_38px_rgba(15,23,42,0.055)] backdrop-blur-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead>编号</TableHead>
              <TableHead>提交人</TableHead>
              <TableHead>部门</TableHead>
              <TableHead>日期</TableHead>
              <TableHead>说明</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approved.map((report) => (
              <TableRow key={report.id}>
                <TableCell>
                  <input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => toggle(report.id)} className="h-4 w-4" />
                </TableCell>
                <TableCell className="font-medium">{report.report_no}</TableCell>
                <TableCell>{report.submitter?.display_name ?? "-"}</TableCell>
                <TableCell>{report.department?.name ?? "-"}</TableCell>
                <TableCell>{report.occurred_at}</TableCell>
                <TableCell>{report.title}</TableCell>
                <TableCell className="text-right font-semibold">{money(report.total_amount, report.currency)}</TableCell>
                <TableCell><ExpenseStatusBadge status={report.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {approved.map((report) => (
          <div key={report.id} className="rounded-2xl border border-white/80 bg-white/76 p-4 shadow-[0_14px_38px_rgba(15,23,42,0.055)] backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <input type="checkbox" checked={selectedIds.includes(report.id)} onChange={() => toggle(report.id)} className="mt-1 h-4 w-4" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ExpenseStatusBadge status={report.status} />
                  <span className="text-xs text-muted-foreground">{report.report_no}</span>
                </div>
                <div className="mt-2 font-semibold">{report.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{report.submitter?.display_name ?? "-"} · {report.department?.name ?? "-"} · {report.occurred_at}</div>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-lg font-semibold">{money(report.total_amount, report.currency)}</span>
                  {selectedIds.includes(report.id) ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : null}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
