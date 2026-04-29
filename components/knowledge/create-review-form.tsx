"use client";

import { useActionState } from "react";
import { createReviewAction, updateReviewAction, type ActionState } from "@/app/(app)/evolution/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Feedback({ state }: { state: ActionState }) {
  if (!state.message) return null;
  return (
    <div className={`rounded-md border p-3 text-sm ${state.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
      {state.message}
    </div>
  );
}

function Field({ name, label, placeholder, defaultValue }: { name: string; label: string; placeholder?: string; defaultValue?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  );
}

function Area({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} placeholder={placeholder} />
    </div>
  );
}

export function CreateReviewForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createReviewAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建复盘</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <Feedback state={state} />
          <Field name="title" label="标题" placeholder="Q2 经营复盘" />
          <div className="space-y-2">
            <Label htmlFor="review_type">类型</Label>
            <select id="review_type" name="review_type" defaultValue="operation" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="project">project — 项目复盘</option>
              <option value="agent">agent — AI 复盘</option>
              <option value="finance">finance — 财务复盘</option>
              <option value="operation">operation — 经营复盘</option>
              <option value="other">other — 其他</option>
            </select>
          </div>
          <Field name="related_module" label="关联模块" placeholder="finance / agents / approvals" />
          <Area name="summary" label="总结" placeholder="本次复盘的核心结论" />
          <Area name="what_worked" label="做得好的" placeholder="哪些做法有效" />
          <Area name="what_failed" label="问题与不足" placeholder="哪些地方出了问题" />
          <Area name="lessons_learned" label="经验教训" placeholder="沉淀下来的关键经验" />
          <Area name="next_actions" label="下一步行动" placeholder="具体的改进行动项" />
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "保存中..." : "保存复盘"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function UpdateReviewInlineForm({ review }: { review: { id: string; title: string; summary: string | null; lessons_learned: string | null; next_actions: string | null } }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(updateReviewAction, {});

  return (
    <form action={action} className="flex min-w-64 items-center gap-2">
      <input type="hidden" name="id" value={review.id} />
      <input type="hidden" name="title" value={review.title} />
      <input type="hidden" name="lessons_learned" value={review.lessons_learned ?? ""} />
      <input type="hidden" name="next_actions" value={review.next_actions ?? ""} />
      <Input name="summary" defaultValue={review.summary ?? ""} className="h-8" placeholder="摘要" />
      <Button size="sm" variant="outline" disabled={pending}>
        {pending ? "..." : state.ok ? "✓" : "保存"}
      </Button>
    </form>
  );
}
