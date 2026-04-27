import { AIBookkeepingForm } from "@/components/finance/ai-bookkeeping-form";
import { PageHeader } from "@/components/layout/page-header";
import { getFinanceAccounts } from "@/lib/finance/accounts";
import { getFinanceCategories } from "@/lib/finance/categories";

export default async function AIBookkeepingPage() {
  const [categories, accounts] = await Promise.all([getFinanceCategories("all"), getFinanceAccounts()]);

  return (
    <>
      <PageHeader
        title="一句话 AI 记账"
        description="AI 只负责解析，必须人工确认后才会创建财务记录。缺少金额、类型或日期等关键字段时需要先补充。"
      />
      <AIBookkeepingForm categories={categories} accounts={accounts} />
    </>
  );
}
