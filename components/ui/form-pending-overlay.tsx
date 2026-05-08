"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { UploadingAnimation } from "@/components/ui/uploading-animation";

/**
 * 全屏 overlay：表单提交中显示"正在拼命搬运"动画。
 * 必须放在 <form action={...}> 内部（依赖 useFormStatus 的 context）。
 *
 * - server action 极快（< minDuration）时也强制至少显示 minDuration ms
 *   避免一闪而过让用户看不清
 * - server action 慢于 minDuration 时则一直显示到完成
 *
 * 用法：
 *   <form action={myAction}>
 *     <FormPendingOverlay label="正在保存记账..." estimatedSeconds={2} />
 *     ...
 *   </form>
 */
export function FormPendingOverlay({
  label,
  estimatedSeconds,
  minDuration = 1800
}: {
  label?: string;
  estimatedSeconds?: number;
  /** 最小显示时长 (ms)，默认 1800ms。设 0 关闭最小时长 */
  minDuration?: number;
}) {
  const { pending } = useFormStatus();
  const [visible, setVisible] = useState(false);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (pending) {
      startedAtRef.current = Date.now();
      setVisible(true);
    } else if (startedAtRef.current !== null) {
      // pending 已结束，但要保证至少显示 minDuration 才能消失
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, minDuration - elapsed);
      if (remaining === 0) {
        setVisible(false);
        startedAtRef.current = null;
      } else {
        timer = setTimeout(() => {
          setVisible(false);
          startedAtRef.current = null;
        }, remaining);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [pending, minDuration]);

  if (!visible) return null;
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
