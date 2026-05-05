export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {/* Neon accent bar */}
        <div
          className="mb-3 h-px w-14 rounded-full"
          style={{
            background: "linear-gradient(90deg, #f97316, #ef4444, transparent)",
            boxShadow: "0 0 12px rgba(249,115,22,0.7), 0 0 28px rgba(249,115,22,0.35)",
          }}
        />
        <h1
          className="bg-gradient-to-r from-orange-400 via-amber-300 to-orange-300 bg-clip-text text-xl font-semibold tracking-normal text-transparent sm:text-2xl"
          style={{ filter: "drop-shadow(0 0 10px rgba(249,115,22,0.28))" }}
        >
          {title}
        </h1>
        <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
      </div>
      {action ? (
        <div className="flex shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>
      ) : null}
    </div>
  );
}
