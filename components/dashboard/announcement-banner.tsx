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
        background: "#fff7ed",
        borderBottom: "1px solid #fed7aa",
      }}
    >
      {/* Top shimmer line */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(249,115,22,0.45) 50%, transparent 100%)",
          animation: "shimmer-line 4s ease-in-out infinite",
        }}
      />

      {/* Left: live dot only — no text label */}
      <div
        className="absolute left-0 top-0 z-10 flex h-full items-center px-3"
        style={{
          background: "linear-gradient(90deg, #fff7ed 55%, transparent 100%)",
          minWidth: 28,
        }}
      >
        <div
          style={{
            width: 6, height: 6, borderRadius: "50%",
            background: "#4ade80",
            boxShadow: "0 0 8px rgba(74,222,128,1), 0 0 16px rgba(74,222,128,0.6)",
            animation: "neon-dot-pulse 1.8s ease-in-out infinite",
          }}
        />
      </div>

      {/* Right fade */}
      <div
        className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16"
        style={{
          background: "linear-gradient(270deg, #fff7ed 0%, transparent 100%)",
        }}
      />

      {/* Ticker */}
      <div className="flex overflow-hidden" style={{ paddingLeft: 28 }}>
        <div className="animate-marquee flex shrink-0 whitespace-nowrap py-2">
          {items.map((text, i) => (
            <span
              key={i}
              className="inline-flex items-center"
              style={{ marginRight: 48 }}
            >
              {/* Divider dot */}
              <span
                style={{
                  display: "inline-block",
                  width: 3, height: 3,
                  borderRadius: "50%",
                  background: "rgba(249,115,22,0.5)",
                  marginRight: 14,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#92400e",
                  letterSpacing: "0.01em",
                }}
              >
                {text}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
