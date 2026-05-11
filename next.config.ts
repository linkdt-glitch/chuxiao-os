import type { NextConfig } from "next";

// 服务端 Node 进程统一用北京时间，避免 Render 默认 UTC 让所有 new Date()
// 显示给用户时少 8 小时。客户端浏览器自动用用户本地时区。
process.env.TZ = process.env.TZ || "Asia/Shanghai";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.deepseek.com https://api.siliconflow.cn",
      "frame-ancestors 'none'"
    ].join("; ")
  }
];

const nextConfig: NextConfig = {
  typedRoutes: false,

  // ⭐ 关键：关闭 Next.js 内置 compression。
  //
  // 原因：Next.js 的 compression 中间件 + RSC 框架各加一次 Vary: Accept-Encoding，
  // 导致响应头出现两条相同的 Vary（已知 issue #55389，Next.js 内无法修复）。
  // Cloudflare 看到多条 Vary 头时会保守地标 cf-cache-status: DYNAMIC，
  // 任何 Cache Rule 都覆盖不了这一层判断 → 整套 HK PoP 静态资源缓存全部失效。
  //
  // 关掉后 Render 直接发未压缩响应给 Cloudflare，由 Cloudflare HK PoP 用 Brotli
  // 实时压缩 + 缓存（已在 Cloudflare Speed → Settings 启用 Brotli）。
  // 净效果：HK 员工拿到的是 Cloudflare 已压缩 + 已缓存的版本，比 Next.js gzip 更小更快。
  compress: false,

  // React strict 模式 + 启用 strict mode 双重渲染（开发期捕获副作用问题）
  reactStrictMode: true,

  // SWC minify 默认开，无需配置

  experimental: {
    serverActions: {
      bodySizeLimit: "30mb"
    },
    // 对常用大包做按需 import 优化 —— 仅打包实际用到的子模块，
    // 显著减少 client bundle 大小（lucide-react 上千图标只装包用到的）。
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
      "@supabase/ssr",
      "class-variance-authority",
      "tailwind-merge"
    ],
    // ⭐ 客户端路由缓存：HK/SZ 员工首次拉一次 RSC payload 后，短时间内
    // back/forward / Link 预取命中的页面瞬开，不再走完整的 Render → Supabase 往返。
    // 默认 dynamic=0s（每次回源），这里提到 30s —— 短间隔重复点击不再频繁拉服务端。
    // static 是 force-static 的页面，5 分钟够长。
    // 风险：刚刚改完的数据 30s 内点回去看可能是旧的；revalidatePath 触发后立即新鲜。
    staleTimes: {
      dynamic: 30,
      static: 300
    }
  },

  // 静态资源缓存策略 —— logo / 图标长期缓存，HTML 不缓存
  // 注：Vary 头由 Cloudflare Transform Rule「Fix duplicate Vary header」在 CDN 层强制规范，
  //     这里无需也无法修复（Next.js compress 中间件会强行 append Vary）
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders
      },
      {
        // 图片 / 字体 / 静态资源：1 年强缓存（发版时 hashed URL 自然过期）
        source: "/:path*\\.(png|jpg|jpeg|webp|avif|svg|woff|woff2|ttf|otf|ico)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" }
        ]
      }
    ];
  },

  // 图片远程域名白名单（Supabase storage 走签名 URL，需要这个）
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" }
    ],
    // AVIF 优先，WebP 次之，再 fallback 原图 —— 移动端体积可减半
    formats: ["image/avif", "image/webp"]
  }
};

export default nextConfig;
