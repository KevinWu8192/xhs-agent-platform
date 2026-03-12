# XHS 博主助手平台 — 设计系统规范 v1.0

> 风格定位：小红书粉红活泼风，卡片式布局，圆润现代
> 技术栈：Next.js 14 · Tailwind CSS · shadcn/ui · lucide-react

---

## 1. 色板系统

### 1.1 主色调 — XHS 粉红系

| Token | Hex | Tailwind Class | 用途 |
|-------|-----|----------------|------|
| primary-50  | `#FFF0F2` | `bg-primary-50`  | 页面区块背景、tag 底色 |
| primary-100 | `#FFD6DB` | `bg-primary-100` | hover 背景、浅色 badge |
| primary-200 | `#FFB3BC` | `bg-primary-200` | 分隔线、边框装饰 |
| primary-300 | `#FF8095` | `bg-primary-300` | 次级按钮 hover |
| primary-400 | `#FF4D69` | `bg-primary-400` | 渐变起始色 |
| **primary-500** | `#FF2442` | `bg-primary-500` | **主按钮、主要文字、图标** |
| primary-600 | `#E81F3C` | `bg-primary-600` | 按钮 hover 状态 |
| primary-700 | `#C41832` | `bg-primary-700` | 按钮 active、侧边栏底部 |

### 1.2 辅助色 — 玫瑰 & 粉色

渐变配对建议：

```
Agent 卡片 1: from-rose-400 to-pink-500     → 信息雷达
Agent 卡片 2: from-pink-400 to-rose-500     → 脚本口播
Agent 卡片 3: from-rose-500 to-primary-600  → 选题助手
Agent 卡片 4: from-primary-300 to-rose-400  → 数据分析
```

### 1.3 中性色系

| Token | Hex | 用途 |
|-------|-----|------|
| neutral-0   | `#FFFFFF` | 卡片背景 |
| neutral-50  | `#FAFAFA` | 页面底层背景 |
| neutral-100 | `#F5F5F5` | 输入框背景、禁用状态 |
| neutral-200 | `#E5E5E5` | 分隔线、边框 |
| neutral-400 | `#A3A3A3` | placeholder 文字 |
| neutral-500 | `#737373` | 次要文字 |
| neutral-600 | `#525252` | 辅助文字 |
| neutral-800 | `#262626` | 次标题 |
| neutral-900 | `#171717` | 正文、主标题 |

### 1.4 语义色

| 类型 | Hex | 使用场景 |
|------|-----|----------|
| success `#10B981` | `text-emerald-500` | 操作成功、发布完成 |
| warning `#F59E0B` | `text-amber-500`   | 待处理、即将过期 |
| error `#EF4444`   | `text-red-500`     | 操作失败、错误提示 |
| info `#3B82F6`    | `text-blue-500`    | 提示信息 |

### 1.5 背景色

| 场景 | 颜色 | 说明 |
|------|------|------|
| 页面主背景 | `#FFF8F9` (`bg-[#FFF8F9]`) | 极浅粉白，全局背景 |
| 卡片背景 | `#FFFFFF` (`bg-white`) | 内容卡片 |
| 区块背景 | `#FFF0F2` (`bg-primary-50`) | 高亮区域、侧边栏 |
| 侧边栏 | `from-primary-500 to-primary-700` | 渐变深粉背景 |

---

## 2. 字体系统

### 2.1 字体族

```css
font-family: "Inter", -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif;
```

- **中文优先**：PingFang SC（macOS/iOS）、Microsoft YaHei（Windows）
- **英数优先**：Inter（现代感强，数字排版极佳）

### 2.2 字号层级

| 级别 | Size | Line Height | 使用场景 |
|------|------|-------------|----------|
| `text-5xl` | 32px | 44px | 英雄标题（Landing） |
| `text-4xl` | 28px | 40px | 页面主标题 |
| `text-3xl` | 24px | 36px | 区块标题 |
| `text-2xl` | 20px | 30px | 卡片标题 |
| `text-xl`  | 18px | 28px | 二级标题 |
| `text-lg`  | 16px | 24px | 重要正文 |
| `text-base`| 14px | 22px | **标准正文**（默认） |
| `text-sm`  | 13px | 20px | 辅助文字、标签 |
| `text-xs`  | 12px | 16px | 时间戳、说明文字 |
| `text-2xs` | 10px | 14px | 角标、最小提示 |

### 2.3 字重

```
font-normal (400) → 正文
font-medium (500) → 按钮、标签
font-semibold (600) → 标题
font-bold (700) → 重点强调
```

---

## 3. 圆角规范

**原则：圆润优先，统一使用大圆角**

| Token | 值 | 使用场景 |
|-------|-----|---------|
| `rounded-lg`   | 14px | 小图标背景、tag |
| `rounded-xl`   | 16px | 输入框、小按钮 |
| `rounded-2xl`  | 20px | **标准卡片**（最常用） |
| `rounded-3xl`  | 24px | 大卡片、弹窗 |
| `rounded-4xl`  | 32px | 英雄区块装饰 |
| `rounded-full` | 9999px | 胶囊按钮、头像、badge |

---

## 4. 阴影规范

卡片阴影使用品牌粉红色调，更有活力：

```css
/* 静止状态 */
shadow-card: 0 1px 4px 0 rgba(255,36,66,0.06), 0 2px 8px 0 rgba(0,0,0,0.04)

/* hover 状态 */
shadow-card-hover: 0 6px 24px 0 rgba(255,36,66,0.14), 0 12px 40px 0 rgba(0,0,0,0.10)

/* 按钮光晕 */
shadow-glow-sm: 0 0 10px rgba(255,36,66,0.20)
```

Tailwind 快速用法：
```html
<div class="shadow-card hover:shadow-card-hover transition-shadow duration-200">
```

---

## 5. 组件规范

### 5.1 Button 按钮

#### 尺寸

| 尺寸 | Class | 高度 | 内边距 | 字号 | 圆角 |
|------|-------|------|--------|------|------|
| sm   | `btn-sm`  | 32px | `px-3 py-1.5` | text-sm | rounded-full |
| **md** | `btn-md` | 40px | `px-4 py-2.5` | text-base | rounded-full |
| lg   | `btn-lg`  | 48px | `px-6 py-3`   | text-lg   | rounded-full |

#### 变体

```html
<!-- 主按钮 (Primary) -->
<button class="btn-primary">开始使用</button>

<!-- 次级按钮 (Secondary) — 浅粉底 + 品牌色文字 -->
<button class="btn-secondary">查看详情</button>

<!-- 幽灵按钮 (Ghost) — 透明底 -->
<button class="btn-ghost">取消</button>

<!-- 危险操作 -->
<button class="bg-red-500 hover:bg-red-600 text-white ...">删除</button>
```

#### 状态
- **默认**: 正常显示
- **hover**: 背景加深 + 阴影增强
- **active**: 背景更深 + 轻微缩小 `scale-[0.98]`
- **disabled**: `opacity-50 cursor-not-allowed`
- **loading**: 前置 spinner icon

### 5.2 Card 卡片

```html
<!-- 标准卡片 -->
<div class="bg-white rounded-2xl shadow-card hover:shadow-card-hover
            transition-shadow duration-200 p-6">
  <!-- 内容 -->
</div>

<!-- Agent 渐变卡片 -->
<div class="bg-gradient-to-br from-rose-400 to-pink-500
            rounded-2xl p-6 text-white">
  <!-- 内容 -->
</div>
```

#### 内边距规范
- 小卡片 (compact): `p-4`
- 标准卡片: `p-6`
- 大卡片: `p-8`

### 5.3 Input 输入框

#### 尺寸

| 尺寸 | 高度 | 内边距 | 圆角 |
|------|------|--------|------|
| sm   | 36px | `px-3 py-2`   | `rounded-lg` |
| **md** | 44px | `px-4 py-3`   | `rounded-xl` |
| lg   | 52px | `px-5 py-3.5` | `rounded-2xl` |

#### 状态

```html
<!-- 默认 -->
<input class="input-base" />

<!-- 聚焦 — 粉红边框 + 光晕 -->
<input class="input-base focus:ring-2 focus:ring-primary-300 focus:border-primary-400" />

<!-- 错误 -->
<input class="input-base border-red-400 focus:ring-red-200" />

<!-- 禁用 -->
<input class="input-base opacity-50 cursor-not-allowed bg-neutral-100" disabled />
```

### 5.4 Badge / Tag

```html
<!-- 品牌粉 -->
<span class="badge-rose">生活类</span>

<!-- 中性 -->
<span class="badge-neutral">草稿</span>

<!-- 成功 -->
<span class="badge bg-emerald-50 text-emerald-600">已发布</span>
```

---

## 6. 页面布局规范

### 6.1 整体布局

```
┌─────────────────────────────────────────────┐
│  Sidebar (240px)  │  Main Content Area       │
│  (固定左侧)        │  (flex-1, 滚动)          │
│                   │  ┌─────────────────────┐ │
│  Logo             │  │ Page Header (64px)  │ │
│  ──────           │  ├─────────────────────┤ │
│  Nav Items        │  │                     │ │
│                   │  │   Content           │ │
│  ──────           │  │   (padding: 24px)   │ │
│  User Avatar      │  │                     │ │
└───────────────────┴──┴─────────────────────┘─┘
```

### 6.2 内容区间距

```
页面内边距:    p-6 (24px)
区块间距:      mb-8 (32px)
卡片间距:      gap-4 (16px) 或 gap-6 (24px)
内联元素间距:  gap-2 (8px) 或 gap-3 (12px)
```

### 6.3 栅格系统

```html
<!-- 2列等宽 -->
<div class="grid grid-cols-2 gap-4">

<!-- 2列等宽（Agent 卡片网格） -->
<div class="grid grid-cols-1 md:grid-cols-2 gap-6">

<!-- 3列 -->
<div class="grid grid-cols-3 gap-4">

<!-- 左侧列表 + 右侧详情（信息雷达页） -->
<div class="grid grid-cols-[360px_1fr] gap-6">

<!-- 响应式 -->
<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
```

### 6.4 响应断点

| 断点 | 宽度 | 说明 |
|------|------|------|
| (默认) | < 640px  | 移动端（单列） |
| sm    | ≥ 640px  | 小平板 |
| md    | ≥ 768px  | 平板 |
| lg    | ≥ 1024px | 桌面（主要设计目标） |
| xl    | ≥ 1280px | 大屏桌面 |
| 2xl   | ≥ 1400px | 超宽屏（容器最大宽度） |

---

## 7. 图标规范

### 7.1 图标库选择：lucide-react

**选择理由：**
- 线条风格简洁，与小红书活泼风高度契合
- 完整的 React/TypeScript 支持
- 体积小，支持 tree-shaking
- 与 shadcn/ui 默认图标库一致，零配置

### 7.2 使用规范

```tsx
import { Search, Sparkles, Radio, FileText, BarChart3 } from "lucide-react";

// 标准尺寸
<Search size={16} />   // 小图标（按钮内、输入框）
<Search size={20} />   // 中图标（导航、卡片）
<Search size={24} />   // 大图标（页面标题旁）

// 颜色继承
<Search className="text-primary-500" size={20} />
<Search className="text-neutral-400" size={16} />
```

### 7.3 Agent 图标 (Emoji)

各 Agent 使用 Emoji 作为卡片图标（大号展示），替代图标库：

| Agent | Emoji | 说明 |
|-------|-------|------|
| 信息雷达 | 📡 | 信息探测感 |
| 脚本口播 | 🎬 | 内容创作感 |
| 选题助手 | 💡 | 灵感启发感 |
| 数据分析 | 📊 | 数据可视化感 |

---

## 8. 动效规范

### 8.1 过渡时长

```
fast: 150ms   → 按钮 hover、颜色切换
base: 250ms   → 卡片 hover、折叠展开
slow: 400ms   → 页面过渡、弹窗出现
```

### 8.2 缓动函数

```
ease-smooth: cubic-bezier(0.4, 0, 0.2, 1)    → 通用过渡
ease-bounce: cubic-bezier(0.34, 1.56, 0.64, 1) → 弹性出现（模态框、提示）
```

### 8.3 常用动效

```html
<!-- 卡片 hover 上浮 -->
<div class="hover:-translate-y-0.5 transition-transform duration-200">

<!-- 按钮点击缩放 -->
<button class="active:scale-[0.98] transition-transform">

<!-- 淡入动画 -->
<div class="animate-fade-in">

<!-- 骨架屏闪烁 -->
<div class="skeleton rounded-xl h-4 w-32">
```

---

## 9. 页面结构规范

### 9.1 Dashboard 页

```
┌────────────────────────────────────┐
│ 欢迎语区域 (greeting)              │
│ "你好，小红，今天想做什么？"         │
├────────────────────────────────────┤
│ Agent 卡片网格 (2列)               │
│  ┌──────────┐  ┌──────────┐       │
│  │ 信息雷达 │  │ 脚本口播 │       │
│  └──────────┘  └──────────┘       │
│  ┌──────────┐  ┌──────────┐       │
│  │ 选题助手 │  │ 数据分析 │       │
│  └──────────┘  └──────────┘       │
├────────────────────────────────────┤
│ 最近使用 (recent activity)         │
│  时间线样式，显示最近 5 条操作记录  │
└────────────────────────────────────┘
```

### 9.2 信息雷达页

```
┌────────────────────────────────────┐
│ 大号搜索框（占满顶部）               │
├──────────────┬─────────────────────┤
│ 结果列表     │ 详情面板             │
│ (360px 固定) │ (flex-1)            │
│ ─ 列表项 1  │ 标题                │
│ ─ 列表项 2  │ 来源 / 时间         │
│ ─ 列表项 3  │ 正文内容            │
│ ...          │ 操作按钮            │
└──────────────┴─────────────────────┘
```

### 9.3 脚本口播页

```
┌────────────────────────────────────┐
│ 话题输入框                          │
├────────────────────────────────────┤
│ 风格选择 (Tab 形式)                │
│  生活类 | 美妆 | 美食 | 数码       │
├────────────────────────────────────┤
│ 生成脚本 按钮 (全宽，大号)          │
├────────────────────────────────────┤
│ 输出区域                            │
│  ┌──────────────────────────────┐  │
│  │ 生成的脚本内容...             │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│  [复制全文]  [分段复制]            │
└────────────────────────────────────┘
```
