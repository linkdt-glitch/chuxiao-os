import { AlertTriangle } from "lucide-react";
import { FinanceRecordForm } from "@/components/finance/finance-record-form";
import { PageHeader } from "@/components/layout/page-header";
import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceCategories } from "@/lib/finance/categories";
import { canRecordCompanyExpense } from "@/lib/finance/permissions";

export default async function NewFinanceRecordPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params?.error?.trim();
  // 并行：类目、账户、权限
  const [categories, accounts, canRecordExpense] = await Promise.all([
    getFinanceCategories("all"),
    getFinanceAccounts(),
    canRecordCompanyExpense()
  ]);

  return (
    <>
      <PageHeader
        title="手动记账"
        description={
          canRecordExpense
            ? "新增收入、支出或报销记录，可选择保存草稿或直接提交审批。"
            : "记录收入或申请报销。公司支出由创始人 / 管理员直接登记，你这里走「报销」流程。"
        }
      />
      {errorMessage ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <div className="font-medium">保存失败</div>
            <div className="mt-0.5 text-rose-700/90">{errorMessage}</div>
          </div>
        </div>
      ) : null}
      <FinanceRecordForm categories={categories} accounts={accounts} canRecordExpense={canRecordExpense} />
    </>
  );
}
