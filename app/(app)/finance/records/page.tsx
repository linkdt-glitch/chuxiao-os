import Link from "next/link";
import { CheckCircle2, Download, Plus } from "lucide-react";
import { FinanceRecordsTable } from "@/components/finance/finance-records-table";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getFinanceCategories } from "@/lib/finance/categories";
import { getFinanceRecords } from "@/lib/finance/records";
import type { FinanceRecordStatus, FinanceRecordType } from "@/lib/finance/types";

export default async function FinanceRecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const [records, categories] = await Promise.all([
    getFinanceRecords({
      record_type: (params.type ?? "all") as FinanceRecordType | "all",
      status: (params.status ?? "all") as FinanceRecordStatus | "all",
      date_from: params.date_from,
      date_to: params.date_to,
      category_id: params.category_id
    }),
    getFinanceCategories("all")
  ]);

  return (
    <>
      <PageHeader
        title="财务流水"
        description="统一管理收入、支出、报销流水，支持按类型、状态、日期、类目筛选与导出。"
        action={<Button asChild><Link href="/finance/records/new"><Plus className="h-4 w-4" />新增记录</Link></Button>}
      />
      {params.created ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800 shadow-[0_12px_34px_rgba(16,185,129,0.08)]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>财务记录已保存，最新流水已同步。</span>
        </div>
      ) : null}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle>筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-6">
            <select name="type" defaultValue={params.type ?? "all"} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="all">全部类型</option>
              <option value="income">收入</option>
              <option value="expense">支出</option>
              <option value="reimbursement">报销</option>
            </select>
            <select name="status" defaultValue={params.status ?? "all"} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="all">全部状态</option>
              <option value="draft">草稿</option>
              <option value="pending_approval">待审批</option>
              <option value="approved">已批准</option>
              <option value="rejected">已驳回</option>
              <option value="paid">已付款</option>
            </select>
            <Input name="date_from" type="date" defaultValue={params.date_from ?? ""} />
            <Input name="date_to" type="date" defaultValue={params.date_to ?? ""} />
            <select name="category_id" defaultValue={params.category_id ?? ""} className="h-9 rounded-md border bg-background px-3 text-sm">
              <option value="">全部类目</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <Button type="submit" variant="outline">应用筛选</Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>流水列表</CardTitle>
          <Button asChild variant="outline" size="sm"><Link href={`/api/finance/export?type=${params.type ?? "all"}&date_from=${params.date_from ?? ""}&date_to=${params.date_to ?? ""}`}><Download className="h-4 w-4" />导出</Link></Button>
        </CardHeader>
        <CardContent>
          <FinanceRecordsTable records={records} />
        </CardContent>
      </Card>
    </>
  );
}
