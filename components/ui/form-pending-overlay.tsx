"use client";

import { useFormStatus } from "react-dom";
import { UploadingAnimation } from "@/components/ui/uploading-animation";

/**
 * 全屏 overlay：表单提交中显示"正在拼命搬运"动画。
 * 必须放在 <form action={...}> 内部（依赖 useFormStatus 的 context）。
 *
 * 用法：
 *   <form action={myAction}>
 *     <FormPendingOverlay label="正在保存记账..." estimatedSeconds={2} />
 *     ...
 *   </form>
 */
export function FormPendingOverlay({
  label,
  estimatedSeconds
}: {
  label?: string;
  estimatedSeconds?: number;
}) {
  const { pending } = useFormStatus();
  if (!pending) return null;
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
      style={{
        background: "rgba(2,4,12,0.78)",
        backdropFilter: "blur(10px) saturate(1.1)"
      }}
    >
      <div className="w-full max-w-[380px]">
        <UploadingAnimation label={label} estimatedSeconds={estimatedSeconds} />
      </div>
    </div>
  );
}
