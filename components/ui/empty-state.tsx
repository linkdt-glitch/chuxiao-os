import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div
      className="flex min-h-40 flex-col items-center justify-center rounded-lg p-8 text-center"
      style={{
        background: "#fafaf9",
        border: "1px dashed #fed7aa",
      }}
    >
      <div
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(249,115,22,0.18), #ffffff)",
          border: "1px solid rgba(249,115,22,0.30)"
        }}
      >
        <Inbox className="h-5 w-5 text-orange-600" />
      </div>
      <div className="text-sm font-medium text-slate-800">{title}</div>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}
