import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center rounded-lg p-8 text-center"
      style={{
        background:
          "linear-gradient(180deg, rgba(8,13,28,0.55) 0%, rgba(4,8,20,0.45) 100%)",
        border: "1px dashed rgba(249,115,22,0.22)",
        boxShadow:
          "inset 0 0 24px rgba(249,115,22,0.04), 0 12px 32px rgba(0,0,0,0.35)"
      }}
    >
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.18), rgba(3,7,18,0.92))",
          boxShadow:
            "0 0 16px rgba(249,115,22,0.18), 0 0 0 1px rgba(249,115,22,0.22)"
        }}
      >
        <Inbox className="h-5 w-5 text-orange-400" />
      </div>
      <div className="text-sm font-medium text-slate-200">{title}</div>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-slate-400">{description}</p>
      ) : null}
    </div>
  );
}
