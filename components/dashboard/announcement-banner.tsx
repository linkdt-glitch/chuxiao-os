"use client";

const DEFAULT_ANNOUNCEMENTS = [
  "系统正常运行中",
  "今日 AI 调用量正常",
  "欢迎使用初晓 OS 系统",
  "数据安全加密保护中",
  "最新版本已上线"
];

export function AnnouncementBanner({ announcements }: { announcements?: string[] }) {
  const source = announcements?.length ? announcements : DEFAULT_ANNOUNCEMENTS;
  const items = [...source, ...source];

  return (
    <div
      className="relative overflow-hidden border-b border-orange-100/80 bg-gradient-to-r from-orange-50/80 via-white/70 to-rose-50/60 backdrop-blur-sm"
      aria-label="系统公告"
    >
      <div className="absolute left-0 top-0 z-10 flex h-full items-center bg-gradient-to-r from-orange-50/95 to-transparent pl-3 pr-6">
        <span className="flex items-center gap-1.5 text-xs font-medium text-orange-600">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-orange-500" />
          公告
        </span>
      </div>

      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white/60 to-transparent" />

      <div className="flex pl-20 py-2.5">
        <div className="animate-marquee flex shrink-0 whitespace-nowrap">
          {items.map((text, i) => (
            <span key={i} className="mr-12 text-sm text-slate-600">
              <span className="mr-3 text-orange-400">◆</span>
              {text}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
