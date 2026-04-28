export function PageHeader({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-3 h-1 w-14 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-400 shadow-[0_0_20px_rgba(14,165,233,0.28)]" />
        <h1 className="bg-gradient-to-r from-slate-950 via-cyan-800 to-indigo-500 bg-clip-text text-2xl font-semibold tracking-normal text-transparent">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
