/**
 * 初晓 OS Service Worker —— 静态资源浏览器侧缓存
 *
 * 目标：HK/SZ 员工首次加载后，所有 JS / CSS / 字体 / 图片直接从浏览器本地拿，
 * 完全跳过网络（即使穿越 GFW 或者 Cloudflare 缓存失效都不影响）。
 *
 * 设计原则（安全第一）：
 *   1. 只拦截「确认静态」的请求路径，绝不动 HTML / API / Server Action
 *   2. cache-first 策略：本地有就直接返回，没有才下载
 *   3. 部署新版本时 sw.js 改 CACHE_VERSION，旧缓存自动清理
 *   4. 任何异常都退回到 fetch(request)，绝不阻塞业务
 *
 * 永远不拦截：
 *   - HTML 页面（除 /login / / 这类公开页面）
 *   - /api/* / /_next/data/* / RSC payload
 *   - Server Action 的 POST 请求
 *   - 带 Authorization / Cookie 的非 GET
 */

// 版本号：每次有新部署应该 bump。可以让 build 时自动注入，这里用日期串当默认。
// 实际部署可以通过 next.config.ts 在 build 时把这一行替换成真实 commit hash。
const CACHE_VERSION = "chuxiao-static-v2";

// 匹配「值得缓存」的静态资源路径
function isStaticAsset(url) {
  const path = url.pathname;
  if (path.startsWith("/_next/static/")) return true;
  if (path.startsWith("/brand/")) return true;
  if (path === "/favicon.ico") return true;
  // 文件后缀法兜底
  return /\.(css|js|svg|png|jpg|jpeg|webp|avif|woff|woff2|ttf|otf|ico)$/i.test(path);
}

self.addEventListener("install", (event) => {
  // 不预 cache 任何东西 —— 让 Next.js 自己挑哪些资源被请求，到时候惰性 cache 进来
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 清理旧版本的 cache（部署新版后自动失效）
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith("chuxiao-static-") && name !== CACHE_VERSION)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // 只处理 GET，所有变更（POST / PUT / DELETE）一律绕过 SW
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return; // 解析失败就让浏览器自己处理
  }

  // 跨域请求（Supabase / AI 接口等）不拦截
  if (url.origin !== self.location.origin) return;

  // 不是静态资源就放行（HTML / API / RSC 等都直走网络）
  if (!isStaticAsset(url)) return;

  event.respondWith(
    (async () => {
      try {
        const cache = await caches.open(CACHE_VERSION);
        const cached = await cache.match(request);
        if (cached) {
          // 命中本地缓存：直接返回，0ms 网络
          return cached;
        }
        // 没命中 → 网络拉一次，成功后异步写入缓存（下次就秒开）
        const response = await fetch(request);
        if (response && response.ok && response.status === 200) {
          // 克隆一份放进缓存（Response body 只能消费一次）
          cache.put(request, response.clone()).catch(() => {});
        }
        return response;
      } catch (error) {
        // 网络挂了 + 缓存也没有 → 让浏览器报错
        return fetch(request);
      }
    })()
  );
});
