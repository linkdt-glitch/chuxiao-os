import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-sky-200/80 bg-gradient-to-br from-white/76 via-sky-50/52 to-indigo-50/34 p-8 text-center shadow-[0_16px_40px_rgba(14,165,233,0.045)]">
      <div className="mb-3 rounded-xl border border-white/80 bg-white/70 p-2 shadow-sm">
        <Inbox className="h-6 w-6 text-cyan-700" />
      </div>
      <div className="text-sm font-medium">{title}</div>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
