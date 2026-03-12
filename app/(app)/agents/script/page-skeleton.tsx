// ─────────────────────────────────────────────────────────────
//  Script Agent Page Skeleton — 脚本口播 UI 草图
//  功能：话题输入 → 风格选择 → 生成脚本 → 复制输出
//  布局：左侧配置区 + 右侧预览输出区（宽屏双栏）
// ─────────────────────────────────────────────────────────────

// 内容风格选项
const STYLE_OPTIONS = [
  {
    id: "lifestyle",
    label: "生活类",
    emoji: "🌿",
    desc: "温暖真实，记录日常",
    gradient: "from-emerald-400 to-teal-500",
  },
  {
    id: "beauty",
    label: "美妆",
    emoji: "💄",
    desc: "种草拔草，专业干货",
    gradient: "from-rose-400 to-pink-500",
  },
  {
    id: "food",
    label: "美食",
    emoji: "🍜",
    desc: "探店食谱，烟火人间",
    gradient: "from-amber-400 to-orange-500",
  },
  {
    id: "tech",
    label: "数码",
    emoji: "📱",
    desc: "开箱测评，极客范儿",
    gradient: "from-blue-400 to-indigo-500",
  },
] as const;

// 脚本长度选项
const DURATION_OPTIONS = [
  { id: "30s", label: "30 秒", desc: "~150字" },
  { id: "60s", label: "1 分钟", desc: "~300字" },
  { id: "3min", label: "3 分钟", desc: "~900字" },
  { id: "5min", label: "5 分钟", desc: "~1500字" },
] as const;

// 语气风格
const TONE_OPTIONS = [
  { id: "casual", label: "轻松亲切" },
  { id: "professional", label: "专业权威" },
  { id: "energetic", label: "活力激情" },
  { id: "storytelling", label: "故事叙述" },
] as const;

// 模拟生成的脚本内容（段落形式）
const MOCK_SCRIPT_SEGMENTS = [
  {
    id: "hook",
    label: "开场钩子",
    emoji: "🎯",
    content:
      "姐妹们！你有没有遇到过这种情况——化了好久的妆，出门拍照发现完全不对？我之前也超级崩溃，直到我发现了这个改变我日常妆容的秘密武器...",
    duration: "0:00 - 0:05",
  },
  {
    id: "intro",
    label: "自我介绍/背景",
    emoji: "👋",
    content:
      "大家好，我是小红，专注分享日系清透妆容已经 3 年了。今天要跟大家聊的，是我尝试了 20+ 种底妆之后，找到的最适合亚洲肤色的底妆公式！",
    duration: "0:05 - 0:15",
  },
  {
    id: "main1",
    label: "核心内容 1",
    emoji: "✨",
    content:
      "第一步，也是最关键的一步：皮肤打底。很多人觉得做好护肤就够了，但其实妆前乳的选择会直接决定你的妆容是「浮粉」还是「贴合」。我现在用的是这款含有玻尿酸成分的妆前乳，上完以后皮肤会有一层薄薄的保护膜...",
    duration: "0:15 - 0:30",
  },
  {
    id: "main2",
    label: "核心内容 2",
    emoji: "💡",
    content:
      "第二步是我的独家心得：分区上妆法。T区油 U区干的混合肌姐妹一定要试试！用粉底液的时候，T区薄涂，只用手指轻拍；U区稍厚，用粉扑按压。这样既能控油又不会导致卡粉...",
    duration: "0:30 - 0:45",
  },
  {
    id: "cta",
    label: "行动号召",
    emoji: "🔔",
    content:
      "好啦！今天的底妆教程就分享到这里，喜欢的话记得点赞收藏，我会持续更新更多好用的美妆干货！有任何问题都可以在评论区问我，我会尽量一一回复的！拜拜～",
    duration: "0:55 - 1:00",
  },
] as const;

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────

export default function ScriptPageSkeleton() {
  // 草图阶段：选中状态写死
  const selectedStyle = "beauty";
  const selectedDuration = "60s";
  const selectedTone = "casual";
  const hasScript = true; // 控制是否显示输出区

  return (
    <div className="animate-fade-in">
      {/* ── 页面标题 ───────────────────────────────────────────── */}
      <ScriptPageHeader />

      {/* ── 双栏布局：左侧配置 + 右侧输出 ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-6 mt-6">
        {/* 左侧：配置面板 */}
        <ConfigPanel
          selectedStyle={selectedStyle}
          selectedDuration={selectedDuration}
          selectedTone={selectedTone}
        />

        {/* 右侧：脚本输出区 */}
        <OutputPanel hasScript={hasScript} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ScriptPageHeader — 页面标题
// ─────────────────────────────────────────────────────────────

function ScriptPageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={[
            "w-10 h-10 rounded-2xl",
            "bg-gradient-to-br from-pink-400 to-rose-500",
            "flex items-center justify-center text-xl",
            "shadow-glow-sm",
          ].join(" ")}
        >
          🎬
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">脚本口播</h1>
          <p className="text-xs text-neutral-500">
            AI 一键生成爆款脚本，让你的视频更有感染力
          </p>
        </div>
      </div>

      {/* 历史记录按钮 */}
      <button
        className={[
          "flex items-center gap-2",
          "h-9 px-4 rounded-full",
          "bg-white border border-neutral-200 shadow-sm",
          "text-sm text-neutral-600 hover:text-rose-500 hover:border-rose-300",
          "transition-all duration-150",
        ].join(" ")}
      >
        <span className="text-base">📋</span>
        <span>历史脚本</span>
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ConfigPanel — 左侧配置面板
// ─────────────────────────────────────────────────────────────

interface ConfigPanelProps {
  selectedStyle: string;
  selectedDuration: string;
  selectedTone: string;
}

function ConfigPanel({
  selectedStyle,
  selectedDuration,
  selectedTone,
}: ConfigPanelProps) {
  return (
    <div className="space-y-5">
      {/* ── 话题输入 ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-card p-5">
        <label className="block text-sm font-semibold text-neutral-800 mb-3">
          📝 话题 / 关键词
          <span className="ml-1 text-xs font-normal text-neutral-400">
            （必填）
          </span>
        </label>

        {/* 主输入框 */}
        <textarea
          placeholder="输入你要创作的话题，例如：&#10;「秋冬日系清透妆容教程」&#10;「拿铁咖啡在家复刻」"
          className={[
            "w-full h-28 px-4 py-3 rounded-xl resize-none",
            "bg-neutral-50 border-2 border-neutral-200",
            "text-neutral-900 text-sm placeholder-neutral-400",
            "transition-all duration-200",
            "focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50",
            "focus:bg-white",
          ].join(" ")}
          readOnly // 草图阶段
        />

        {/* 字数统计 */}
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-neutral-400">
            描述越详细，生成效果越好
          </p>
          <span className="text-xs text-neutral-400">0 / 200</span>
        </div>

        {/* 热点话题快速填入 */}
        <div className="mt-3">
          <p className="text-xs text-neutral-500 mb-2">今日热点话题：</p>
          <div className="flex flex-wrap gap-1.5">
            {["秋冬穿搭", "在家咖啡", "日系妆容", "宿舍改造", "慢生活"].map(
              (topic) => (
                <button
                  key={topic}
                  className="px-2.5 py-1 rounded-full text-xs bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                >
                  + {topic}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {/* ── 内容风格选择 ─────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-card p-5">
        <label className="block text-sm font-semibold text-neutral-800 mb-3">
          🎨 内容风格
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          {STYLE_OPTIONS.map((style) => (
            <StyleOptionCard
              key={style.id}
              style={style}
              isSelected={style.id === selectedStyle}
            />
          ))}
        </div>
      </section>

      {/* ── 脚本时长 ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-card p-5">
        <label className="block text-sm font-semibold text-neutral-800 mb-3">
          ⏱️ 脚本时长
        </label>

        <div className="grid grid-cols-4 gap-2">
          {DURATION_OPTIONS.map((dur) => (
            <button
              key={dur.id}
              className={[
                "py-2.5 rounded-xl text-center",
                "transition-all duration-150",
                dur.id === selectedDuration
                  ? "bg-rose-500 text-white shadow-glow-sm"
                  : "bg-neutral-100 text-neutral-600 hover:bg-rose-50 hover:text-rose-500",
              ].join(" ")}
            >
              <div className="text-sm font-semibold">{dur.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{dur.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* ── 语气风格 ─────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl shadow-card p-5">
        <label className="block text-sm font-semibold text-neutral-800 mb-3">
          🎤 语气风格
        </label>

        <div className="grid grid-cols-2 gap-2">
          {TONE_OPTIONS.map((tone) => (
            <button
              key={tone.id}
              className={[
                "py-2.5 px-3 rounded-xl text-sm font-medium",
                "transition-all duration-150",
                tone.id === selectedTone
                  ? "bg-rose-50 text-rose-600 border-2 border-rose-300"
                  : "bg-neutral-50 text-neutral-600 border-2 border-transparent hover:border-neutral-200",
              ].join(" ")}
            >
              {tone.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── 生成按钮 ─────────────────────────────────────────── */}
      <GenerateButton />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  StyleOptionCard — 风格选择卡片
// ─────────────────────────────────────────────────────────────

interface StyleOption {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  gradient: string;
}

interface StyleOptionCardProps {
  style: StyleOption;
  isSelected: boolean;
}

function StyleOptionCard({ style, isSelected }: StyleOptionCardProps) {
  return (
    <button
      className={[
        "relative p-3.5 rounded-xl text-left",
        "transition-all duration-150",
        "border-2",
        isSelected
          ? `border-rose-400 bg-rose-50`
          : "border-transparent bg-neutral-50 hover:border-neutral-200",
      ].join(" ")}
    >
      {/* 选中指示 */}
      {isSelected && (
        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
          <span className="text-white text-2xs font-bold">✓</span>
        </div>
      )}

      {/* Emoji */}
      <div
        className={[
          "w-9 h-9 rounded-xl mb-2",
          `bg-gradient-to-br ${style.gradient}`,
          "flex items-center justify-center text-lg",
        ].join(" ")}
      >
        {style.emoji}
      </div>

      <div className="text-sm font-semibold text-neutral-800">{style.label}</div>
      <div className="text-xs text-neutral-500 mt-0.5">{style.desc}</div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  GenerateButton — 生成脚本大按钮
// ─────────────────────────────────────────────────────────────

function GenerateButton() {
  return (
    <button
      className={[
        "w-full h-14 rounded-2xl",
        "bg-gradient-to-r from-rose-500 to-pink-500",
        "hover:from-rose-600 hover:to-pink-600",
        "text-white text-base font-bold",
        "shadow-card hover:shadow-glow",
        "transition-all duration-200",
        "active:scale-[0.98]",
        "flex items-center justify-center gap-2.5",
      ].join(" ")}
    >
      <span className="text-xl">✨</span>
      <span>生成脚本</span>
      {/* 预估时间 */}
      <span className="text-sm font-normal text-white/70 ml-1">约 5 秒</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  OutputPanel — 右侧脚本输出区
// ─────────────────────────────────────────────────────────────

interface OutputPanelProps {
  hasScript: boolean;
}

function OutputPanel({ hasScript }: OutputPanelProps) {
  return (
    <div
      className={[
        "bg-white rounded-2xl shadow-card",
        "flex flex-col",
        "overflow-hidden",
        "min-h-[600px]",
      ].join(" ")}
    >
      {hasScript ? (
        <ScriptOutput />
      ) : (
        <ScriptEmptyState />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ScriptOutput — 脚本输出内容
// ─────────────────────────────────────────────────────────────

function ScriptOutput() {
  return (
    <>
      {/* 输出区头部 */}
      <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-neutral-800">
            生成结果
          </h3>
          {/* 元信息 */}
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-600 font-medium">
              ✓ 生成完成
            </span>
            <span className="text-xs text-neutral-400">美妆风格 · 1 分钟</span>
          </div>
        </div>

        {/* 重新生成 */}
        <button className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-rose-500 transition-colors">
          <span>🔄</span>
          <span>重新生成</span>
        </button>
      </div>

      {/* 脚本正文区（可滚动） */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {MOCK_SCRIPT_SEGMENTS.map((segment) => (
          <ScriptSegment key={segment.id} segment={segment} />
        ))}
      </div>

      {/* 底部复制操作区 */}
      <div className="px-6 py-4 border-t border-neutral-100">
        <CopyActions />
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────
//  ScriptSegment — 单个脚本段落
// ─────────────────────────────────────────────────────────────

type Segment = (typeof MOCK_SCRIPT_SEGMENTS)[number];

function ScriptSegment({ segment }: { segment: Segment }) {
  return (
    <div
      className={[
        "group relative",
        "rounded-xl p-4",
        "bg-neutral-50 hover:bg-rose-50/40",
        "border border-neutral-100 hover:border-rose-200",
        "transition-all duration-150",
      ].join(" ")}
    >
      {/* 段落标签 + 时间戳 */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-base">{segment.emoji}</span>
          <span className="text-xs font-semibold text-neutral-600">
            {segment.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">
            {segment.duration}
          </span>
          {/* 分段复制按钮（hover 时出现） */}
          <button
            className={[
              "opacity-0 group-hover:opacity-100",
              "text-xs text-rose-500 font-medium",
              "bg-rose-50 hover:bg-rose-100",
              "px-2.5 py-1 rounded-full",
              "transition-all duration-150",
            ].join(" ")}
          >
            复制
          </button>
        </div>
      </div>

      {/* 段落文本 */}
      <p className="text-sm text-neutral-700 leading-relaxed">{segment.content}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CopyActions — 复制按钮组
// ─────────────────────────────────────────────────────────────

function CopyActions() {
  return (
    <div className="flex items-center gap-3">
      {/* 复制全文 — 主操作 */}
      <button
        className={[
          "flex-1 flex items-center justify-center gap-2",
          "h-11 rounded-full",
          "bg-gradient-to-r from-rose-500 to-pink-500",
          "text-white text-sm font-medium",
          "shadow-sm hover:shadow-glow-sm",
          "transition-all duration-150 active:scale-[0.98]",
        ].join(" ")}
      >
        <span>📋</span>
        <span>复制全文</span>
      </button>

      {/* 分段复制 — 次级操作 */}
      <button
        className={[
          "flex items-center justify-center gap-2",
          "h-11 px-5 rounded-full",
          "bg-rose-50 hover:bg-rose-100",
          "text-rose-500 text-sm font-medium border border-rose-200",
          "transition-all duration-150",
        ].join(" ")}
      >
        <span>✂️</span>
        <span>分段复制</span>
      </button>

      {/* 导出/保存 */}
      <button
        className={[
          "w-11 h-11 rounded-full shrink-0",
          "bg-neutral-100 hover:bg-rose-50",
          "text-neutral-500 hover:text-rose-500 text-lg",
          "flex items-center justify-center",
          "transition-all duration-150",
        ].join(" ")}
        title="保存到草稿"
      >
        💾
      </button>

      {/* 分享 */}
      <button
        className={[
          "w-11 h-11 rounded-full shrink-0",
          "bg-neutral-100 hover:bg-rose-50",
          "text-neutral-500 hover:text-rose-500 text-lg",
          "flex items-center justify-center",
          "transition-all duration-150",
        ].join(" ")}
        title="分享脚本"
      >
        📤
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ScriptEmptyState — 空状态（未生成脚本时）
// ─────────────────────────────────────────────────────────────

function ScriptEmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
      {/* 装饰插图区域 */}
      <div
        className={[
          "w-24 h-24 rounded-3xl mb-6",
          "bg-gradient-to-br from-rose-100 to-pink-100",
          "flex items-center justify-center text-5xl",
        ].join(" ")}
      >
        🎬
      </div>

      <h3 className="text-lg font-semibold text-neutral-800 mb-2">
        还没有生成脚本
      </h3>
      <p className="text-sm text-neutral-500 max-w-xs leading-relaxed mb-6">
        在左侧填写话题和选择风格，点击「生成脚本」按钮，AI 将为你创作专属口播稿
      </p>

      {/* 生成示例 */}
      <div className="text-left w-full max-w-sm space-y-2">
        <p className="text-xs text-neutral-400 text-center mb-3">可以试试这些热门话题：</p>
        {["秋冬日系清透妆容教程", "咖啡在家复刻 5 个诀窍", "宿舍改造前后对比"].map(
          (example) => (
            <button
              key={example}
              className={[
                "w-full text-left px-4 py-3 rounded-xl",
                "bg-rose-50 hover:bg-rose-100",
                "text-sm text-rose-600 font-medium",
                "border border-rose-200 hover:border-rose-300",
                "transition-all duration-150",
                "flex items-center gap-2",
              ].join(" ")}
            >
              <span>✨</span>
              <span>{example}</span>
            </button>
          )
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  GeneratingState — 生成中的加载状态（骨架屏）
//  可在 hasScript=false + isGenerating=true 时使用
// ─────────────────────────────────────────────────────────────

export function ScriptGeneratingState() {
  return (
    <div className="flex-1 px-6 py-5 space-y-4">
      {/* 进度提示 */}
      <div className="flex items-center gap-3 mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200">
        <div className="w-5 h-5 border-2 border-rose-400 border-t-transparent rounded-full animate-spin shrink-0" />
        <p className="text-sm text-rose-600 font-medium">AI 正在创作你的专属脚本...</p>
      </div>

      {/* 骨架屏段落 */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="rounded-xl p-4 bg-neutral-50">
          {/* 标签骨架 */}
          <div className="flex items-center gap-2 mb-3">
            <div className="skeleton rounded-full w-5 h-5" />
            <div className="skeleton rounded h-3 w-20" />
          </div>
          {/* 内容骨架 */}
          <div className="space-y-2">
            <div className="skeleton-rose rounded h-3 w-full" />
            <div className="skeleton-rose rounded h-3 w-5/6" />
            <div className="skeleton-rose rounded h-3 w-4/5" />
            {i < 3 && <div className="skeleton-rose rounded h-3 w-3/4" />}
          </div>
        </div>
      ))}
    </div>
  );
}
