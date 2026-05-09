import Link from "next/link";
import { AlertTriangle, CheckCircle2, Download, Plus, RotateCcw, Search, WalletCards } from "lucide-react";
import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { PageHeader } from "@/components/layout/page-header";
import { NoticeCelebration } from "@/components/ui/notice-celebration";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFinanceCategories } from "@/lib/finance/categories";
import { canApproveFinance } from "@/lib/finance/permissions";
import { getFinanceRecords } from "@/lib/finance/records";
import type { FinanceRecordStatus, FinanceRecordType } from "@/lib/finance/types";

function money(value: number) {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
    maximumFractionDigits: 3
  }).format(value);
}

export default async function FinanceRecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [records, categories, canApprove] = await Promise.all([
    getFinanceRecords({
      record_type: (params.type ?? "all") as FinanceRecordType | "all",
      status: (params.status ?? "all") as FinanceRecordStatus | "all",
      date_from: params.date_from,
      date_to: params.date_to,
      category_id: params.category_id
    }),
    getFinanceCategories("all"),
    canApproveFinance()
  ]);
  const booked = records.filter((record) => ["approved", "paid"].includes(record.status));
  const income = booked.filter((record) => record.record_type === "income").reduce((sum, record) => sum + Number(record.amount), 0);
  const expense = booked.filter((record) => ["expense", "reimbursement"].includes(record.record_type)).reduce((sum, record) => sum + Number(record.amount), 0);
  const pending = records.filter((record) => record.status === "pending_approval").length;
  const pendingRecords = records.filter((record) => record.status === "pending_approval");
  const unclassified = records.filter((record) => !record.category_id).length;

  return (
    <>
      <PageHeader
        title="财务流水"
        description="统一管理收入、支出、报销流水，支持按类型、状态、日期、类目筛选与导出。"
        action={
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline"><Link href={`/api/finance/export?type=${params.type ?? "all"}&date_from=${params.date_from ?? ""}&date_to=${params.date_to ?? ""}`}><Download className="h-4 w-4" />导出当前筛选</Link></Button>
            <Button asChild><Link href="/finance/records/new"><Plus className="h-4 w-4" />新增记录</Link></Button>
          </div>
        }
      />
      <NoticeCelebration
        notice={params.notice}
        created={params.created}
        title="恭喜！"
        message={params.notice ?? (params.created ? "财务记录已经保存成功" : undefined)}
      />
      {params.error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <div className="font-medium">操作失败</div>
            <div className="mt-0.5 text-rose-700/90">{params.error}</div>
          </div>
        </div>
      ) : null}
      {params.notice ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{params.notice}</span>
        </div>
      ) : null}
      {params.created ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>财务记录已保存，最新流水已同步。</span>
        </div>
      ) : null}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between gap-4 p-4">
            <div>
              <div className="text-sm text-muted-foreground">筛选结果</div>
              <div className="mt-1 text-2xl font-semibold">{records.length}</div>
            </div>
            <WalletCards className="h-5 w-5 text-sky-700" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">已确认收入</div>
            <div className="mt-1 text-xl font-semibold text-emerald-700">{money(income)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">已确认支出</div>
            <div className="mt-1 text-xl font-semibold text-red-700">{money(expense)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center justify-between gap-3 p-4">
            <div>
              <div className="text-sm text-muted-foreground">待处理</div>
              <div className="mt-1 flex flex-wrap gap-2">
                <Badge variant={pending ? "warning" : "success"}>{pending} 待审批</Badge>
                <Badge variant={unclassified ? "info" : "secondary"}>{unclassified} 未分类</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>筛选流水</CardTitle>
          <Button asChild variant="ghost" size="sm"><Link href="/finance/records"><RotateCcw className="h-4 w-4" />重置</Link></Button>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <select name="type" defaultValue={params.type ?? "all"} className="h-11 rounded-xl border border-slate-200/80 bg-white/75 px-3 text-base shadow-sm sm:text-sm xl:h-10">
              <option value="all">全部类型</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
              <option value="reimbursement">报销</option>
            </select>
            <select name="status" defaultValue={params.status ?? "all"} className="h-11 rounded-xl border border-slate-200/80 bg-white/75 px-3 text-base shadow-sm sm:text-sm xl:h-10">
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="pending_approval">待审批</option>
              <option value="approved">已批准</option>
              <option value="rejected">已驳回</option>
              <option value="paid">已付款</option>
            </select>
            <Input name="date_from" type="date" defaultValue={params.date_from ?? ""} className="h-11 rounded-xl bg-white/75 text-base sm:text-sm xl:h-10" />
            <Input name="date_to" type="date" defaultValue={params.date_to ?? ""} className="h-11 rounded-xl bg-white/75 text-base sm:text-sm xl:h-10" />
            <select name="category_id" defaultValue={params.category_id ?? ""} className="h-11 rounded-xl border border-slate-200/80 bg-white/75 px-3 text-base shadow-sm sm:text-sm xl:h-10">
              <option value="">全部类目</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <Button type="submit" variant="outline" className="h-11 xl:h-10"><Search className="h-4 w-4" />应用筛选</Button>
          </form>
        </CardContent>
      </Card>
      {pendingRecords.length && canApprove ? (
        <Card className="mb-4 border-amber-200/80 bg-amber-50/30">
          <CardHeader>
            <CardTitle>财务审批</CardTitle>
          </CardHeader>
          <CardContent>
            <FinanceRecordsTable
              records={pendingRecords}
              showActions
              highlightId={params.highlight}
              emptyTitle="暂无待审批财务记录"
              emptyDescription="需要审批的支出、报销和付款会留在财务中心处理。"
            />
          </CardContent>
        </Card>
      ) : null}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>流水列表</CardTitle>
          <Button asChild variant="outline" size="sm"><Link href={`/api/finance/export?type=${params.type ?? "all"}&date_from=${params.date_from ?? ""}&date_to=${params.date_to ?? ""}`}><Download className="h-4 w-4" />导出</Link></Button>
        </CardHeader>
        <CardContent>
          <FinanceRecordsTable records={records} highlightId={params.highlight} />
        </CardContent>
      </Card>
    </>
  );
}
