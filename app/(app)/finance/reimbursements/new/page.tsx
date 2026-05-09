import { AlertTriangle } from "lucide-react";
import { ExpenseReportForm } from "@/components/expenses/expense-report-form";
import { PageHeader } from "@/components/layout/page-header";
import { getDepartments, getExpenseCategories, getExpenseTemplates } from "@/lib/finance/expenses";

export default async function NewExpenseReportPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const errorMessage = params?.error?.trim();
  const [departments, categories, templates] = await Promise.all([
    getDepartments(),
    getExpenseCategories(),
    getExpenseTemplates()
  ]);

  return (
    <>
      <PageHeader
        title="新建报销"
        description="上传票据、填写用途和金额；系统会自动标记缺票据、超标准、疑似重复等异常。"
      />
      {errorMessage ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <div>
            <div className="font-medium">报销创建失败</div>
            <div className="mt-0.5 text-rose-700/90">{errorMessage}</div>
          </div>
        </div>
      ) : null}
      <ExpenseReportForm departments={departments} categories={categories} templates={templates} />
    </>
  );
}
