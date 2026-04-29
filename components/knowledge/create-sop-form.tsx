"use client";

import { useActionState } from "react";
import { createSopAction, updateSopAction, type ActionState } from "@/app/(app)/evolution/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({ name, label, placeholder, defaultValue }: { name: string; label: string; placeholder?: string; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div className={`rounded-md border p-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
      {state.message}
    </div>
  );
}

export function CreateSopForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createSopAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建 SOP</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <Feedback state={state} />
          <Field name="title" label="标题" placeholder="月度财务复盘流程" />
          <Field name="scenario" label="适用场景" placeholder="月末经营分析" />
          <Field name="related_module" label="关联模块" placeholder="finance / projects / agents" />
          <Field name="version" label="版本" defaultValue="1.0" />
          <div className="space-y-2">
            <Label htmlFor="status">状态</Label>
            <select id="status" name="status" defaultValue="draft" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="draft">draft — 草稿</option>
              <option value="active">active — 已发布</option>
              <option value="archived">archived — 归档</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">说明</Label>
            <Textarea id="description" name="description" placeholder="这个 SOP 解决什么问题" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="steps">步骤（每行一步）</Label>
            <Textarea id="steps" name="steps" rows={5} placeholder={"1. 收集数据\n2. 检查异常\n3. 输出结论"} className="min-h-32" />
          </div>
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "保存中..." : "保存 SOP"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function UpdateSopInlineForm({ sop }: { sop: { id: string; title: string; scenario: string | null; related_module: string | null; version: string; status: string } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateSopAction, {});

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={sop.id} />
      <input type="hidden" name="title" value={sop.title} />
      <input type="hidden" name="scenario" value={sop.scenario ?? ""} />
      <input type="hidden" name="related_module" value={sop.related_module ?? ""} />
      <input type="hidden" name="version" value={sop.version} />
      <select name="status" defaultValue={sop.status} className="h-8 rounded-md border bg-background px-2 text-xs">
        {["draft", "active", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Button size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : state.ok ? "✓" : "保存"}
      </Button>
    </form>
  );
}
