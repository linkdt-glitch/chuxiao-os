import { Inbox } from "lucide-react";

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-lg border border-dashed border-sky-200/80 bg-gradient-to-br from-white/70 via-sky-50/45 to-emerald-50/30 p-8 text-center">
      <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
      <div className="text-sm font-medium">{title}</div>
      {description ? <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}
