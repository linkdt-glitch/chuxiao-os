"use client";

const DEFAULT_ANNOUNCEMENTS = [
  "系统正常运行中",
  "今日 AI 调用量正常",
  "欢迎使用初晓 OS 系统",
  "数据安全加密保护中",
  "最新版本已上线",
];

export function AnnouncementBanner({ announcements }: { announcements?: string[] }) {
  const source = announcements?.length ? announcements : DEFAULT_ANNOUNCEMENTS;
  const items = [...source, ...source];

  return (
    <div
      className="relative overflow-hidden"
      aria-label="系统公告"
      style={{
        background: "rgba(2,5,16,0.96)",
        borderBottom: "1px solid rgba(249,115,22,0.14)",
      }}
    >
      {/* Left label */}
      <div
        className="absolute left-0 top-0 z-10 flex h-full items-center pl-3 pr-8"
        style={{
          background:
            "linear-gradient(90deg, rgba(2,5,16,1) 60%, transparent 100%)",
        }}
      >
        <span className="flex items-center gap-1.5 font-mono text-[10px] font-semibold tracking-[0.18em] text-orange-500/75">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-green-400 animate-neon-dot"
          />
          SYS://
        </span>
      </div>

      {/* Right fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16"
        style={{
          background:
            "linear-gradient(270deg, rgba(2,5,16,0.98) 0%, transparent 100%)",
        }}
      />

      {/* Ticker */}
      <div className="flex pl-20 py-[7px]">
        <div className="animate-marquee flex shrink-0 whitespace-nowrap">
          {items.map((text, i) => (
            <span key={i} className="mr-10 font-mono text-[11px] text-orange-400/65">
              <span className="mr-2 text-orange-500/40">›</span>
              {text}
              <span className="ml-10 text-orange-500/18">║</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
