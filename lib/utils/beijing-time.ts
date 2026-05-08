/**
 * 系统时间统一按 北京 / 香港时间 (UTC+8) 显示。
 *
 * 服务端可能跑在 UTC（Render 默认），如果直接 d.getHours() 拿到的是 UTC 小时，
 * 显示给国内用户就会差 8 小时。这里统一通过 Intl.DateTimeFormat with
 * timeZone: "Asia/Shanghai" 把任意 Date 对象格式化成北京时间，避免依赖服务器
 * 本地时区配置。
 */

const ZONE = "Asia/Shanghai";

type BeijingParts = {
  year: string;
  month: string;
  day: string;
  weekday: string; // "周一" 等
  hour: string;
  minute: string;
  hourNum: number; // 0-23，用来挑问候
};

const partFmt = new Intl.DateTimeFormat("zh-CN", {
  timeZone: ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

/** 把任意 Date 拆成北京时间的各个字段。 */
export function getBeijingParts(d: Date = new Date()): BeijingParts {
  const parts = partFmt.formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour").padStart(2, "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    weekday: get("weekday"),
    hour,
    minute: get("minute"),
    hourNum: parseInt(hour, 10) || 0
  };
}

/** "2025.05.08 · 周四 · 14:32" 这种紧凑展示。 */
export function formatBeijingDateTime(d: Date = new Date()): string {
  const p = getBeijingParts(d);
  return `${p.year}.${p.month}.${p.day} · ${p.weekday} · ${p.hour}:${p.minute}`;
}

/** 只到日：'2025.05.08 · 周四'。 */
export function formatBeijingDate(d: Date = new Date()): string {
  const p = getBeijingParts(d);
  return `${p.year}.${p.month}.${p.day} · ${p.weekday}`;
}

/** 只到分：'14:32'。 */
export function formatBeijingTime(d: Date = new Date()): string {
  const p = getBeijingParts(d);
  return `${p.hour}:${p.minute}`;
}

/** 北京时间的小时数（0-23），用来选问候 / 显示一天中阶段。 */
export function getBeijingHour(d: Date = new Date()): number {
  return getBeijingParts(d).hourNum;
}
