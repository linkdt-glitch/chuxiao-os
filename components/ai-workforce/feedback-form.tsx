import { createFeedbackAction } from "@/app/(app)/ai-workforce/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function FeedbackForm({
  targetType,
  targetId,
  compact = false
}: {
  targetType: "agent_run" | "prompt_test_run" | "confirmation_request" | "ai_invocation";
  targetId: string;
  compact?: boolean;
}) {
  return (
    <form action={createFeedbackAction} className={compact ? "grid gap-2 md:grid-cols-[90px_1fr_auto]" : "space-y-3"}>
      <input type="hidden" name="target_type" value={targetType} />
      <input type="hidden" name="target_id" value={targetId} />
      <div className={compact ? "" : "space-y-2"}>
        {!compact ? <Label htmlFor={`${targetId}-rating`}>评分</Label> : null}
        <Input id={`${targetId}-rating`} name="rating" type="number" min="1" max="5" placeholder="1-5" />
      </div>
      <div className={compact ? "" : "space-y-2"}>
        {!compact ? <Label htmlFor={`${targetId}-content`}>反馈</Label> : null}
        <Textarea id={`${targetId}-content`} name="content" placeholder="有用、正确、采纳情况或修改意见" className={compact ? "min-h-9" : ""} />
      </div>
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <label className="inline-flex items-center gap-1"><input type="checkbox" name="is_useful" />有用</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" name="is_correct" />正确</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" name="is_adopted" />采纳</label>
        <label className="inline-flex items-center gap-1"><input type="checkbox" name="is_adopted_after_edit" />修改后采纳</label>
        <Button type="submit" size="sm" variant="outline">提交反馈</Button>
      </div>
    </form>
  );
}
