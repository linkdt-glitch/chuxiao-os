import { AIBookkeepingForm } from "@/components/finance/ai-bookkeeping-form";
import { PageHeader } from "@/components/layout/page-header";
import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceCategories } from "@/lib/finance/categories";
import { canRecordCompanyIncome } from "@/lib/finance/permissions";

export default async function AIBookkeepingPage({
  searchParams
}: {
  searchParams?: Promise<{ intent?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const isReimbursement = params.intent === "reimbursement";
  const [categories, accounts, canRecordIncome] = await Promise.all([
    getFinanceCategories("all"),
    getFinanceAccounts(),
    canRecordCompanyIncome()
  ]);

  return (
    <>
      <PageHeader
        title={isReimbursement ? "一句话 AI 报销" : "一句话 AI 记账"}
        description={
          isReimbursement
            ? "用一句话描述要报销的费用（金额 / 用途 / 商家），AI 会生成报销草稿，确认后提交审批。"
            : "支持一句话、手机语音和票据拍照识别。AI 只生成草稿，必须人工确认后才会创建财务记录。"
        }
      />
      <AIBookkeepingForm categories={categories} accounts={accounts} canRecordIncome={canRecordIncome} />
    </>
  );
}
