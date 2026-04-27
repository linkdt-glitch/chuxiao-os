import { FinanceRecordForm } from "@/components/finance/finance-record-form";
import { PageHeader } from "@/components/layout/page-header";
import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceCategories } from "@/lib/finance/categories";

export default async function NewFinanceRecordPage() {
  const [categories, accounts] = await Promise.all([getFinanceCategories("all"), getFinanceAccounts()]);

  return (
    <>
      <PageHeader
        title="手动记账"
        description="新增收入、支出或报销记录，可选择保存草稿或直接提交审批。"
      />
      <FinanceRecordForm categories={categories} accounts={accounts} />
    </>
  );
}
