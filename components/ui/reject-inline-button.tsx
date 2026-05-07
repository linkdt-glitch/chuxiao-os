"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

/**
 * 列表项内的"快速驳回"按钮。
 *
 * 点击 → 弹出 native prompt 让用户输入驳回原因（必填） → 自动提交 form。
 * 比展开 inline 表单或 modal 更紧凑，特别适合 mobile 列表项。
 *
 * 用法：
 *   <RejectInlineButton
 *     action={rejectFinanceRecordAction}
 *     idValue={record.id}
 *     idName="id"
 *   />
 */
export function RejectInlineButton({
  action,
  idValue,
  idName = "id",
  reasonName = "reason",
  reasonPromptTitle = "请输入驳回原因（必填）",
  buttonLabel = "驳回",
  size = "sm"
}: {
  /** server action */
  action: (formData: FormData) => void | Promise<void>;
  idValue: string;
  /** 表单 id 字段名（finance: "id"，approvals: "approval_id"，expense: "id"） */
  idName?: string;
  /** 表单理由字段名（finance: "reason"，expense: "comment"） */
  reasonName?: string;
  reasonPromptTitle?: string;
  buttonLabel?: string;
  size?: "sm" | "md" | "icon";
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const reasonRef = useRef<HTMLInputElement>(null);

  function handleClick() {
    const reason = window.prompt(reasonPromptTitle, "");
    if (!reason || !reason.trim()) return;
    if (reasonRef.current) reasonRef.current.value = reason.trim();
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={action} className="inline">
      <input type="hidden" name={idName} value={idValue} />
      <input ref={reasonRef} type="hidden" name={reasonName} value="" />
      <Button type="button" size={size} variant="destructive" onClick={handleClick}>
        {buttonLabel}
      </Button>
    </form>
  );
}
