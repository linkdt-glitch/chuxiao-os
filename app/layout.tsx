import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "初晓 OS 系统",
  description: "AI native company operating system foundation",
  icons: {
    icon: "/brand/kairosmini-mark.svg",
    apple: "/brand/kairosmini-mark-white.png"
  }
};

/**
 * 从 NEXT_PUBLIC_SUPABASE_URL 拆 origin —— 只用 origin 做 preconnect，避免拼路径。
 * 失败时返回 null，preconnect 标签直接不渲染（不会让首屏炸掉）。
 */
function supabaseOrigin(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = supabaseOrigin();
  return (
    <html lang="zh-CN">
      <head>
        {/* ⭐ 首屏 TTFB 优化：提前和这些第三方建立 TCP + TLS 通道
            （HK/SZ 员工首次访问可省 1-2 个 RTT，每个 ~50-150ms）

            - Supabase: 几乎每个页面都要查数据库 + 鉴权
            - DeepSeek / SiliconFlow: AI 对话 / 解析的入口域名，提前握手
            - 字体 / 图标 走 self，无需额外 preconnect
        */}
        {supabase ? (
          <>
            <link rel="preconnect" href={supabase} crossOrigin="anonymous" />
            <link rel="dns-prefetch" href={supabase} />
          </>
        ) : null}
        <link rel="preconnect" href="https://api.deepseek.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.siliconflow.cn" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        {/* ⭐ Service Worker：员工首次加载后，所有 JS / CSS / 字体 / 图片
            从浏览器本地缓存返回，0ms 网络。
            对深圳员工特别重要 —— 即使跨境网络抖动 / GFW 干扰，
            重复访问也是丝滑的（除了首次和需要 HTML 的页面）。

            注册策略：
              - 异步注册，不阻塞页面渲染
              - 失败静默（老浏览器 / 隐身模式等不支持）
              - 注册脚本本身只有 1 行，不会让 HTML 变大
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', () => { navigator.serviceWorker.register('/sw.js').catch(() => {}); }); }`
          }}
        />
      </body>
    </html>
  );
}
