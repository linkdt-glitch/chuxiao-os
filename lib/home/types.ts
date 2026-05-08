/**
 * 公司首页内容（使命 / 愿景 / 价值观 / 近期目标 / 公告）。
 * 全部存到 organizations.settings.home，无需 DB migration。
 */

export type HomeValue = {
  title: string;
  description?: string;
};

export type HomeGoal = {
  title: string;
  description?: string;
  /** YYYY-MM-DD */
  target_date?: string;
  /** 0-100 */
  progress?: number;
};

export type HomeContent = {
  mission?: string;
  vision?: string;
  values: HomeValue[];
  goals: HomeGoal[];
  announcements: string[];
};

export const DEFAULT_HOME_CONTENT: HomeContent = {
  mission: "用 AI 让每一个普通团队都能像顶级公司一样高效协作。",
  vision: "成为 AI 原生公司的操作系统标准。",
  values: [
    { title: "客户至上", description: "把 100% 的注意力放到用户的真实问题上。" },
    { title: "极致专注", description: "做对的事，做透。" },
    { title: "快速迭代", description: "每周都看得到进步。" },
    { title: "简单透明", description: "数据透明、决策透明、待人透明。" },
    { title: "拥抱 AI", description: "让 AI 把我们变成 10 倍的自己。" }
  ],
  goals: [],
  announcements: []
};
