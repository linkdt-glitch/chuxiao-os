import Link from "next/link";
import { ArrowLeft, Building2, GitBranch, PiggyBank, Plus } from "lucide-react";
import {
  createExpenseApprovalRuleAction,
  upsertDepartmentAction,
  upsertDepartmentBudgetAction
} from "@/app/(app)/finance/reimbursements/actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormSubmitButton } from "@/components/ui/form-submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getCurrentOrganization } from "@/lib/auth";
import { getDepartmentBudgets, getDepartments, getExpenseApprovalRules, getExpenseCategories, money } from "@/lib/finance/expenses";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getHumanMembers() {
  const supabase = await createSupabaseServerClient();
  const organization = await getCurrentOrganization();
  if (!supabase) return [];
  const { data } = await supabase
    .from("organization_members")
    .select("id, display_name, email")
    .eq("organization_id", organization.id)
    .eq("member_type", "human")
    .eq("status", "active")
    .order("display_name");
  return data ?? [];
}

export default async function ExpenseSettingsPage() {
  const [departments, members, categories, budgets, rules] = await Promise.all([
    getDepartments(),
    getHumanMembers(),
    getExpenseCategories(),
    getDepartmentBudgets(),
    getExpenseApprovalRules()
  ]);
  const month = new Date().toISOString().slice(0, 7);

  return (
    <>
      <PageHeader
        title="报销配置"
        description="配置部门、预算、报销类别和审批规则。第一版所有审批权限集中给 Owner/Admin。"
        action={<Button asChild variant="outline"><Link href="/finance/reimbursements"><ArrowLeft className="h-4 w-4" />返回报销审批</Link></Button>}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Building2 className="h-4 w-4" /> 部门配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={upsertDepartmentAction} className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="department_name">部门名称</Label>
                <Input id="department_name" name="name" placeholder="例如：运营部" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department_code">部门编码</Label>
                <Input id="department_code" name="code" placeholder="OPS" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="manager_member_id">负责人</Label>
                <select id="manager_member_id" name="manager_member_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="">暂不指定</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.display_name}</option>)}
                </select>
              </div>
              <FormSubmitButton><Plus className="h-4 w-4" />添加部门</FormSubmitButton>
            </form>
            <div className="space-y-2">
              {departments.map((department) => (
                <div key={department.id} className="rounded-xl border border-slate-200/80 bg-white/70 p-3">
                  <div className="font-medium">{department.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{department.code ?? "未设置编码"}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><PiggyBank className="h-4 w-4" /> 部门月度预算</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={upsertDepartmentBudgetAction} className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="budget_department">部门</Label>
                <select id="budget_department" name="department_id" required className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="">选择部门</option>
                  {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_month">预算月份</Label>
                <Input id="budget_month" name="budget_month" type="month" defaultValue={month} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_category">类别（可选）</Label>
                <select id="budget_category" name="category_id" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="">部门总预算</option>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="budget_amount">金额</Label>
                <Input id="budget_amount" name="amount" type="number" min="0" step="0.001" required />
              </div>
              <FormSubmitButton>保存预算</FormSubmitButton>
            </form>
            <div className="space-y-2">
              {budgets.map((budget) => (
                <div key={budget.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white/70 p-3">
                  <div>
                    <div className="font-medium">{budget.department?.name ?? "未命名部门"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{budget.budget_month.slice(0, 7)} · {budget.category?.name ?? "总预算"}</div>
                  </div>
                  <Badge variant="info">{money(budget.amount, budget.currency)}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GitBranch className="h-4 w-4" /> 审批规则</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createExpenseApprovalRuleAction} className="grid gap-3">
              <div className="space-y-2">
                <Label htmlFor="rule_name">规则名称</Label>
                <Input id="rule_name" name="name" placeholder="例如：高额报销三段审批" required />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="min_amount">最低金额</Label>
                  <Input id="min_amount" name="min_amount" type="number" min="0" step="0.001" defaultValue="0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_amount">最高金额</Label>
                  <Input id="max_amount" name="max_amount" type="number" min="0" step="0.001" placeholder="留空代表不限" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="step_preset">审批链</Label>
                <select id="step_preset" name="step_preset" className="h-9 w-full rounded-md border border-slate-200/80 bg-white/70 px-3 text-sm">
                  <option value="manager">一级审批</option>
                  <option value="finance">一级审批 + 财务复核</option>
                  <option value="full">一级审批 + 财务复核 + Owner 复核</option>
                </select>
              </div>
              <FormSubmitButton>新增规则</FormSubmitButton>
            </form>
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="rounded-xl border border-slate-200/80 bg-white/70 p-3">
                  <div className="font-medium">{rule.name}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {money(rule.min_amount)} - {rule.max_amount ? money(rule.max_amount) : "不限"} · {rule.steps.length} 步
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
