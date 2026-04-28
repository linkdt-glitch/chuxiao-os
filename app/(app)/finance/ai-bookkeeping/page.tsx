import { AIBookkeepingForm } from "@/components/finance/ai-bookkeeping-form";
import { PageHeader } from "@/components/layout/page-header";
import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceCategories } from "@/lib/finance/categories";

export default async function AIBookkeepingPage() {
  const [categories, accounts] = await Promise.all([getFinanceCategories("all"), getFinanceAccounts()]);

  return (
    <>
      <PageHeader
        title="快速 AI 记账"
        description="支持一句话、手机语音和票据拍照识别。AI 只生成草稿，必须人工确认后才会创建财务记录。"
      />
      <AIBookkeepingForm categories={categories} accounts={accounts} />
    </>
  );
}
