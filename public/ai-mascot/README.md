# AI 形象图（粒子化用）

`components/ai/particle-doraemon.tsx` 会从这个目录加载图片，
通过 `getImageData()` 把每个非透明像素采样成一颗粒子，
最终渲染成「橙色粒子云形态的 AI 形象」。

## 如何放图

把一张 **PNG 图片** 命名为 `doraemon.png`，扔到这个目录：

```
public/ai-mascot/doraemon.png
```

部署后访问 `/ai-mascot/doraemon.png` 应该能直接看到图。

## 图片要求

| 项目 | 推荐 |
|---|---|
| 格式 | PNG（必须，透明背景） |
| 尺寸 | 512×512 ~ 1024×1024 |
| 背景 | 透明（alpha = 0），否则白底会被采样成粒子 |
| 姿势 | 正面对镜头、整身入镜、留 ~10% 边距 |
| 文件大小 | < 500KB（首屏加载快） |

## 在哪找图

1. https://cleanpng.com/ —— 搜 "doraemon transparent"
2. https://pngegg.com/ —— 同上
3. 任何透明背景 Doraemon PNG（注意版权，仅内部使用）

或者你想换成别的形象（比如自家公司吉祥物），把 `doraemon.png` 替换成
对应的 PNG 即可，无需改代码。如果想换文件名，传 prop：

```tsx
<ParticleDoraemon imageSrc="/ai-mascot/our-mascot.png" />
```

## 没放图会怎样

代码有 fallback —— 用几何形状画出抽象的橙色头身轮廓。能看，
但视觉效果远不如真实图采样的细腻。所以**强烈建议放图**。

## 颜色映射

源图任何颜色都会被自动映射到 4 档橙：

| 源像素 | → | 渲染颜色 |
|---|---|---|
| 蓝色 / 深色（多啦A梦头身蓝）| → | 深橙 `#c2410c` |
| 红色（项圈/鼻子）| → | 金橙 `#fbbf24` |
| 黑色（眼线/瞳孔）| → | 暗橙红 `#9a3412` |
| 白色（脸/肚/手脚）| → | 中橙 `#fb923c` |

所以无论源图本身是什么色，呈现出来都是品牌橙的层次。
