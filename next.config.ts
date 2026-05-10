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

  // 启用 brotli/gzip 压缩响应（默认就开但显式声明一下）
  compress: true,

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
    ]
  },

  // 静态资源缓存策略 —— logo / 图标长期缓存，HTML 不缓存
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
