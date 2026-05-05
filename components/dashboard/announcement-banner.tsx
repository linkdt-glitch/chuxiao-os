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
        background: "rgba(2,5,16,0.97)",
        borderBottom: "1px solid rgba(249,115,22,0.20)",
        boxShadow: "0 1px 0 rgba(249,115,22,0.06) inset",
      }}
    >
      {/* Scan shimmer line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.5) 50%, transparent 100%)",
          animation: "shimmer-line 3s ease-in-out infinite",
        }}
      />

      {/* Left label */}
      <div
        className="absolute left-0 top-0 z-10 flex h-full items-center pl-3 pr-10"
        style={{
          background: "linear-gradient(90deg, rgba(2,5,16,1) 72%, transparent 100%)",
        }}
      >
        <span className="flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.2em]"
              style={{ color: "rgba(249,115,22,0.9)", textShadow: "0 0 10px rgba(249,115,22,0.6)" }}>
          <span
            className="inline-block h-1.5 w-1.5 rounded-full bg-green-400"
            style={{ boxShadow: "0 0 8px rgba(74,222,128,1)", animation: "neon-dot-pulse 1.5s ease-in-out infinite" }}
          />
          SYS://
        </span>
      </div>

      {/* Right fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-20"
        style={{ background: "linear-gradient(270deg, rgba(2,5,16,0.99) 0%, transparent 100%)" }}
      />

      {/* Ticker */}
      <div className="flex pl-[4.5rem] py-[6px]">
        <div className="animate-marquee flex shrink-0 whitespace-nowrap">
          {items.map((text, i) => (
            <span
              key={i}
              className="mr-10 font-mono text-[12px] font-medium"
              style={{
                color: "rgba(226,232,240,0.92)",
                textShadow: "0 0 12px rgba(249,115,22,0.25)",
              }}
            >
              <span style={{ color: "rgba(249,115,22,0.65)", marginRight: "8px" }}>›</span>
              {text}
              <span style={{ color: "rgba(249,115,22,0.20)", marginLeft: "40px" }}>║</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
