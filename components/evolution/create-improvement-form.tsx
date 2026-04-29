"use client";

import { useActionState } from "react";
import { createImprovementAction, type ActionState } from "@/app/(app)/evolution/actions";
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

export function CreateImprovementForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createImprovementAction, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>创建优化建议</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <Feedback state={state} />
          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input id="title" name="title" placeholder="优化报销审批阈值" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="suggestion_type">类型</Label>
            <select id="suggestion_type" name="suggestion_type" defaultValue="other" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="finance">finance — 财务</option>
              <option value="project">project — 项目</option>
              <option value="agent">agent — AI</option>
              <option value="risk">risk — 风险</option>
              <option value="other">other — 其他</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="related_module">关联模块</Label>
            <Input id="related_module" name="related_module" placeholder="finance / governance / agents" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="impact_level">影响等级</Label>
            <select id="impact_level" name="impact_level" defaultValue="medium" className="h-9 w-full rounded-md border bg-background px-3 text-sm">
              <option value="low">low — 低</option>
              <option value="medium">medium — 中</option>
              <option value="high">high — 高</option>
              <option value="critical">critical — 关键</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">说明</Label>
            <Textarea id="description" name="description" placeholder="为什么建议优化，预期影响是什么" />
          </div>
          <Button className="w-full" type="submit" disabled={pending}>
            {pending ? "保存中..." : "保存建议"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
