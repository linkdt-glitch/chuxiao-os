import { ExpenseReportForm } from "@/components/expenses/expense-report-form";
import { PageHeader } from "@/components/layout/page-header";
import { getDepartments, getExpenseCategories, getExpenseTemplates } from "@/lib/finance/expenses";

export default async function NewExpenseReportPage() {
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
      <ExpenseReportForm departments={departments} categories={categories} templates={templates} />
    </>
  );
}
