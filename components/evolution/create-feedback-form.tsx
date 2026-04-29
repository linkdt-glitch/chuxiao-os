"use client";

import { useActionState } from "react";
import { createFeedbackAction, type ActionState } from "@/app/(app)/evolution/actions";
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

export function CreateFeedbackForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createFeedbackAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建反馈</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <Feedback state={state} />
          <div className="space-y-2">
            <Label htmlFor="target_type">对象类型</Label>
            <select id="target_type" name="target_type" defaultValue="other" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="task">task — 任务</option>
              <option value="agent_output">agent_output — AI 输出</option>
              <option value="prompt_run">prompt_run — Prompt 运行</option>
              <option value="other">other — 其他</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback_type">反馈类型</Label>
            <select id="feedback_type" name="feedback_type" defaultValue="other" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="useful">useful — 有用</option>
              <option value="edited">edited — 已修改</option>
              <option value="rejected">rejected — 已拒绝</option>
              <option value="other">other — 其他</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="module">关联模块</Label>
            <Input id="module" name="module" placeholder="finance / agents / approvals" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rating">评分（1-5）</Label>
            <Input id="rating" name="rating" type="number" min="1" max="5" placeholder="1-5" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">内容</Label>
            <Textarea id="content" name="content" placeholder="这次输出哪里有用、哪里需要改进" />
          </div>
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "保存中..." : "保存反馈"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
