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
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-3 h-1 w-14 rounded-full bg-gradient-to-r from-cyan-400 via-sky-500 to-indigo-400 shadow-[0_0_20px_rgba(14,165,233,0.28)]" />
        <h1 className="bg-gradient-to-r from-slate-950 via-cyan-800 to-indigo-500 bg-clip-text text-xl font-semibold tracking-normal text-transparent sm:text-2xl">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? <div className="flex shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</div> : null}
    </div>
  );
}
