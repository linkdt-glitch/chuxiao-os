"use client";

/**
 * 装饰性 client-only 组件包装器。
 *
 * 为什么单独包一层：
 *   Next.js 15 规定 dynamic({ ssr: false }) 只能用在 client component 里，
 *   server component 用会报 webpack error。
 *
 *   layout.tsx 是 server component（用了 async + Supabase 查询），
 *   所以把懒加载放这个 client wrapper 里：
 *     - SciFiEffects（鼠标光剑残影）
 *     - CompanionCat（电子宠物三花咪咪）
 *
 *   这俩组件不影响业务功能，纯装饰，应该：
 *     1. 不参与 SSR（不增加首屏 HTML 体积）
 *     2. hydration 完成后再异步加载（不阻塞首次可交互时间）
 */

import dynamic from "next/dynamic";

const SciFiEffects = dynamic(
  () => import("@/components/effects/sci-fi-effects").then((m) => ({ default: m.SciFiEffects })),
  { ssr: false }
);

const CompanionCat = dynamic(
  () => import("@/components/pet/companion-cat").then((m) => ({ default: m.CompanionCat })),
  { ssr: false }
);

export function DecorativeEffects() {
  return (
    <>
      <SciFiEffects />
      <CompanionCat />
    </>
  );
}
