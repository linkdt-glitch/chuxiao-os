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
    <div className="mb-6 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {/* 暖橙细线 accent — 仍是品牌色，但浅底用更克制的实色不带 glow */}
        <div
          className="mb-3 h-[3px] w-12 rounded-full"
          style={{ background: "linear-gradient(90deg, #f97316, #fbbf24)" }}
        />
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-slate-900 sm:text-[30px]">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-slate-600">
          {description}
        </p>
      </div>
      {action ? (
        <div className="flex shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>
      ) : null}
    </div>
  );
}
