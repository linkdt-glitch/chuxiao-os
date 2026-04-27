"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { confirmParsedFinanceRecordAction, parseFinanceTextAction, type AIParseState } from "@/app/(app)/finance/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { FinanceAccount, FinanceCategory } from "@/lib/finance/types";

function flat(categories: FinanceCategory[]) {
  return categories.flatMap((item) => [item, ...(item.children ?? [])]);
}

export function AIBookkeepingForm({ categories, accounts }: { categories: FinanceCategory[]; accounts: FinanceAccount[] }) {
  const [parseState, parseAction, parsing] = useActionState<AIParseState, FormData>(parseFinanceTextAction, {});
  const [confirmState, confirmAction, confirming] = useActionState<AIParseState, FormData>(confirmParsedFinanceRecordAction, {});
  const parsed = parseState.parsed;
  const allCategories = flat(categories);
  const category = allCategories.find((item) => item.name === parsed?.category_name);
  const subcategory = allCategories.find((item) => item.name === parsed?.subcategory_name);
  const account = accounts.find((item) => item.name === parsed?.account_name);

  return (
    <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> 一句话记账</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={parseAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="raw_text">自然语言描述</Label>
              <Textarea id="raw_text" name="raw_text" required placeholder="今天支付供应商打样费680元，用于新款产品开发，微信支付，需要报销" className="min-h-40" />
            </div>
            {parseState.error ? <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{parseState.error}</div> : null}
            <Button type="submit" disabled={parsing} className="w-full">{parsing ? "解析中..." : "AI 解析"}</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>解析确认</CardTitle>
        </CardHeader>
        <CardContent>
          {confirmState.success ? <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{confirmState.success}</div> : null}
          {!parsed ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">AI 解析后会在这里显示确认表单。</div>
          ) : (
            <form action={confirmAction} className="grid gap-4 md:grid-cols-2">
              <input type="hidden" name="parse_log_id" value={parseState.parseLogId ?? ""} />
              <div className="md:col-span-2 rounded-md bg-muted p-3 text-sm">
                置信度 {(parsed.confidence * 100).toFixed(0)}%
                {parsed.missing_fields.length ? <span className="ml-2 text-red-600">缺少：{parsed.missing_fields.join(", ")}</span> : null}
              </div>
              <div className="space-y-2">
                <Label>类型</Label>
                <select name="record_type" defaultValue={parsed.record_type} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="income">收入</option>
                  <option value="expense">支出</option>
                  <option value="reimbursement">报销</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>金额</Label>
                <Input name="amount" type="number" step="0.01" required defaultValue={parsed.amount ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>币种</Label>
                <Input name="currency" defaultValue={parsed.currency} />
              </div>
              <div className="space-y-2">
                <Label>日期</Label>
                <Input name="occurred_at" type="date" defaultValue={parsed.occurred_at} />
              </div>
              <div className="space-y-2">
                <Label>类目</Label>
                <select name="category_id" defaultValue={category?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">未分类</option>
                  {allCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>子类目</Label>
                <select name="subcategory_id" defaultValue={subcategory?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">无</option>
                  {allCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>账户</Label>
                <select name="account_id" defaultValue={account?.id ?? ""} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                  <option value="">未选择</option>
                  {accounts.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.currency}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <Label>支付方式</Label>
                <Input name="payment_method" defaultValue={parsed.payment_method ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>供应商 / 客户</Label>
                <Input name="counterparty_name" defaultValue={parsed.counterparty_name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label>项目</Label>
                <Input name="project_name" defaultValue={parsed.project_name ?? ""} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>说明</Label>
                <Textarea name="description" defaultValue={parsed.description} />
              </div>
              <div className="space-y-2">
                <Label>数量</Label>
                <Input name="quantity" type="number" step="0.01" defaultValue={parsed.quantity} />
              </div>
              <div className="space-y-2">
                <Label>备注</Label>
                <Input name="notes" defaultValue={parsed.notes ?? ""} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>票据附件</Label>
                <Input name="receipt_files" type="file" multiple />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="reimbursement_required" defaultChecked={parsed.reimbursement_required} />
                需要报销
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="submit_for_approval" defaultChecked={parsed.need_approval} />
                提交审批
              </label>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" name="intent" value="confirm" disabled={confirming || parsed.missing_fields.length > 0}>{confirming ? "保存中..." : "确认并保存"}</Button>
                <Button type="submit" variant="outline" name="intent" value="draft" disabled={confirming || parsed.missing_fields.length > 0}>保存草稿</Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
