// ─────────────────────────────────────────────────────────────
//  Radar Agent Page Skeleton — 信息雷达 UI 草图
//  功能：搜索 + 结果列表 + 详情分栏布局
//  布局：顶部搜索框 + 左侧结果列表 (360px) + 右侧详情面板
// ─────────────────────────────────────────────────────────────

// 模拟数据
const MOCK_RESULTS = [
  {
    id: "1",
    title: "秋日穿搭丨显瘦又显高的 5 个关键单品",
    source: "小红书热搜",
    time: "2 小时前",
    heatScore: 98,
    tags: ["穿搭", "秋冬"],
    summary:
      "近期秋冬穿搭话题持续升温，其中「层叠穿法」「奶油色系」「老钱风」三大风格占据主导，博主互动率普遍高出平均水平 40%...",
    isNew: true,
  },
  {
    id: "2",
    title: "慢生活美学：打造一个让自己喜欢的家",
    source: "微博热点",
    time: "3 小时前",
    heatScore: 87,
    tags: ["家居", "生活方式"],
    summary:
      "「慢生活」相关搜索量本周环比上涨 340%，内容集中在家居改造、日式简约、绿植养护等细分领域...",
    isNew: true,
  },
  {
    id: "3",
    title: "入秋第一碗暖胃汤，好喝到哭的番茄牛腩",
    source: "抖音热榜",
    time: "5 小时前",
    heatScore: 76,
    tags: ["美食", "家常菜"],
    summary:
      "秋季饮食内容消费升温，家常炖汤类视频完播率高达 85%，「秋冬暖身食谱」合集形式转化率是单品的 2.3 倍...",
    isNew: false,
  },
  {
    id: "4",
    title: "素人变身！日系清透妆 10 分钟完成",
    source: "小红书热搜",
    time: "6 小时前",
    heatScore: 71,
    tags: ["美妆", "日系"],
    summary:
      "「素颜感妆容」搜索量持续增长，空气感底妆、薄透遮瑕为核心需求，适合展示前后对比的快剪格式效果最佳...",
    isNew: false,
  },
  {
    id: "5",
    title: "iPhone 16 拍照实测：我把相机放家里了",
    source: "微博热点",
    time: "8 小时前",
    heatScore: 65,
    tags: ["数码", "摄影"],
    summary:
      "手机摄影话题月均增速 25%，「手机摄影技巧」「用 XX 拍出相机感」等选题互动率极高，建议结合 vlog 形式延伸...",
    isNew: false,
  },
] as const;

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────

export default function RadarPageSkeleton() {
  // UI 草图中用第一条作为选中状态
  const selectedId = "1";

  return (
    <div className="flex flex-col h-full space-y-5 animate-fade-in">
      {/* ── 页面标题 ───────────────────────────────────────────── */}
      <PageHeader />

      {/* ── 大号搜索框 ─────────────────────────────────────────── */}
      <SearchBar />

      {/* ── 过滤/筛选条 ────────────────────────────────────────── */}
      <FilterBar />

      {/* ── 主内容区：列表 + 详情 ──────────────────────────────── */}
      <div className="flex gap-5 flex-1 min-h-0">
        {/* 左侧结果列表 */}
        <ResultList results={MOCK_RESULTS} selectedId={selectedId} />

        {/* 右侧详情面板 */}
        <DetailPanel result={MOCK_RESULTS[0]} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PageHeader — 页面标题区
// ─────────────────────────────────────────────────────────────

function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          className={[
            "w-10 h-10 rounded-2xl",
            "bg-gradient-to-br from-rose-400 to-pink-500",
            "flex items-center justify-center text-xl",
            "shadow-glow-sm",
          ].join(" ")}
        >
          📡
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">信息雷达</h1>
          <p className="text-xs text-neutral-500">实时追踪热点，把握内容先机</p>
        </div>
      </div>

      {/* 自动刷新标签 */}
      <div className="flex items-center gap-2 text-xs text-neutral-500 bg-white px-3 py-2 rounded-full shadow-sm">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse-gentle" />
        <span>每 15 分钟自动刷新</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SearchBar — 大号搜索框
// ─────────────────────────────────────────────────────────────

function SearchBar() {
  return (
    <div className="relative">
      {/* 搜索图标 */}
      <div className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 text-xl pointer-events-none">
        🔍
      </div>

      <input
        type="text"
        placeholder="搜索热点话题、关键词... 例如：秋冬穿搭、美食打卡"
        className={[
          "w-full",
          "h-14 pl-14 pr-32",
          "rounded-2xl",
          "bg-white border-2 border-neutral-200",
          "text-neutral-900 text-base placeholder-neutral-400",
          "shadow-card",
          "transition-all duration-200",
          "focus:outline-none focus:border-rose-400 focus:shadow-card-md",
          // 聚焦时粉红光晕
          "focus:ring-4 focus:ring-rose-100",
        ].join(" ")}
        readOnly // 草图阶段
      />

      {/* 搜索按钮 */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
        {/* 清空按钮（有内容时显示） */}
        <button className="text-neutral-300 hover:text-neutral-500 p-1 transition-colors">
          ✕
        </button>

        {/* 搜索提交按钮 */}
        <button
          className={[
            "h-9 px-5 rounded-xl",
            "bg-gradient-to-r from-rose-500 to-pink-500",
            "text-white text-sm font-medium",
            "shadow-sm hover:shadow-glow-sm",
            "transition-all duration-150",
            "active:scale-[0.98]",
          ].join(" ")}
        >
          搜索
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  FilterBar — 筛选条（平台 + 时间 + 热度）
// ─────────────────────────────────────────────────────────────

const PLATFORMS = ["全部平台", "小红书", "微博", "抖音", "B站"] as const;
const TIME_FILTERS = ["最近 24 小时", "最近 3 天", "最近 7 天"] as const;

function FilterBar() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* 平台 Tab */}
      <div className="flex items-center gap-1.5 bg-white rounded-full p-1 shadow-sm">
        {PLATFORMS.map((platform, i) => (
          <button
            key={platform}
            className={[
              "px-3.5 py-1.5 rounded-full text-sm font-medium",
              "transition-all duration-150",
              i === 0
                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm"
                : "text-neutral-500 hover:text-rose-500 hover:bg-rose-50",
            ].join(" ")}
          >
            {platform}
          </button>
        ))}
      </div>

      {/* 时间筛选 */}
      <select
        className={[
          "h-9 px-3 pr-8 rounded-full",
          "bg-white border border-neutral-200 shadow-sm",
          "text-sm text-neutral-600",
          "focus:outline-none focus:border-rose-400",
          "appearance-none cursor-pointer",
        ].join(" ")}
      >
        {TIME_FILTERS.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>

      {/* 结果数量 */}
      <div className="ml-auto text-xs text-neutral-400">
        共找到 <span className="text-rose-500 font-medium">47</span> 条热点
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ResultList — 左侧结果列表
// ─────────────────────────────────────────────────────────────

type ResultItem = (typeof MOCK_RESULTS)[number];

interface ResultListProps {
  results: readonly ResultItem[];
  selectedId: string;
}

function ResultList({ results, selectedId }: ResultListProps) {
  return (
    <div
      className={[
        "w-[360px] shrink-0",
        "bg-white rounded-2xl shadow-card",
        "overflow-hidden",
        "flex flex-col",
      ].join(" ")}
    >
      {/* 列表头部 */}
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between">
        <span className="text-sm font-semibold text-neutral-800">热点列表</span>
        <button className="text-xs text-rose-500 font-medium">刷新</button>
      </div>

      {/* 列表内容（可滚动） */}
      <div className="flex-1 overflow-y-auto divide-y divide-neutral-50">
        {results.map((result) => (
          <ResultListItem
            key={result.id}
            result={result}
            isSelected={result.id === selectedId}
          />
        ))}

        {/* 加载骨架屏（底部预留） */}
        <SkeletonListItem />
        <SkeletonListItem />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  ResultListItem — 单个结果列表项
// ─────────────────────────────────────────────────────────────

interface ResultListItemProps {
  result: ResultItem;
  isSelected: boolean;
}

function ResultListItem({ result, isSelected }: ResultListItemProps) {
  return (
    <div
      className={[
        "px-4 py-3.5 cursor-pointer",
        "transition-all duration-150",
        isSelected
          ? "bg-rose-50 border-l-2 border-rose-500"
          : "hover:bg-neutral-50 border-l-2 border-transparent",
      ].join(" ")}
    >
      {/* 标题行 */}
      <div className="flex items-start gap-2 mb-2">
        {/* 新标签 */}
        {result.isNew && (
          <span className="shrink-0 mt-0.5 inline-flex items-center px-1.5 py-0.5 rounded text-2xs font-bold bg-rose-500 text-white">
            新
          </span>
        )}
        <h3
          className={[
            "text-sm font-medium leading-snug line-clamp-2",
            isSelected ? "text-rose-600" : "text-neutral-800",
          ].join(" ")}
        >
          {result.title}
        </h3>
      </div>

      {/* 元信息：来源 + 时间 + 热度 */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* 来源 */}
        <span className="text-xs text-neutral-400">{result.source}</span>
        <span className="text-neutral-200">·</span>
        {/* 时间 */}
        <span className="text-xs text-neutral-400">{result.time}</span>
        {/* 热度 */}
        <div className="ml-auto flex items-center gap-1">
          <HeatBar score={result.heatScore} />
        </div>
      </div>

      {/* Tags */}
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {result.tags.map((tag) => (
          <span
            key={tag}
            className="px-2 py-0.5 rounded-full text-2xs bg-rose-50 text-rose-500 font-medium"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  HeatBar — 热度指示条
// ─────────────────────────────────────────────────────────────

function HeatBar({ score }: { score: number }) {
  const color =
    score >= 90
      ? "bg-rose-500"
      : score >= 70
      ? "bg-orange-400"
      : "bg-amber-400";

  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-neutral-400">热度</span>
      <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-medium text-neutral-600">{score}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SkeletonListItem — 列表骨架屏
// ─────────────────────────────────────────────────────────────

function SkeletonListItem() {
  return (
    <div className="px-4 py-3.5">
      <div className="skeleton rounded h-4 w-full mb-2" />
      <div className="skeleton rounded h-3 w-2/3 mb-2" />
      <div className="flex gap-1.5">
        <div className="skeleton rounded-full h-4 w-12" />
        <div className="skeleton rounded-full h-4 w-10" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  DetailPanel — 右侧详情面板
// ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  result: ResultItem;
}

function DetailPanel({ result }: DetailPanelProps) {
  return (
    <div
      className={[
        "flex-1 min-w-0",
        "bg-white rounded-2xl shadow-card",
        "overflow-hidden flex flex-col",
      ].join(" ")}
    >
      {/* 详情头部 */}
      <div className="px-6 py-5 border-b border-neutral-100">
        {/* 来源 + 时间 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs bg-rose-50 text-rose-500 font-medium px-2.5 py-1 rounded-full">
            {result.source}
          </span>
          <span className="text-xs text-neutral-400">{result.time}</span>
          <HeatBar score={result.heatScore} />
        </div>

        {/* 标题 */}
        <h2 className="text-xl font-bold text-neutral-900 leading-snug mb-3">
          {result.title}
        </h2>

        {/* Tags */}
        <div className="flex gap-2 flex-wrap">
          {result.tags.map((tag) => (
            <span
              key={tag}
              className="px-3 py-1 rounded-full text-sm bg-rose-50 text-rose-500 font-medium"
            >
              #{tag}
            </span>
          ))}
        </div>
      </div>

      {/* 详情正文 */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* AI 分析摘要 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-neutral-800">✨ AI 趋势分析</span>
          </div>
          <div className="bg-rose-50 rounded-xl p-4 text-sm text-neutral-700 leading-relaxed">
            {result.summary}
          </div>
        </div>

        {/* 创作建议 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-neutral-800">💡 创作建议</span>
          </div>
          <div className="space-y-2">
            {[
              "前 3 秒加入强视觉对比，抓住用户注意力",
              "结合个人真实经历，增强内容可信度",
              "在标题中加入数字，如「5 个技巧」「7 天变化」",
            ].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-neutral-600">
                <span className="shrink-0 w-5 h-5 rounded-full bg-rose-100 text-rose-500 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <span>{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 关联热词 */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-semibold text-neutral-800">🔗 关联热词</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {["秋冬穿搭", "显瘦穿法", "层叠穿搭", "奶油色系", "老钱风", "ins 风格"].map(
              (kw) => (
                <button
                  key={kw}
                  className="px-3 py-1.5 rounded-full text-sm bg-neutral-100 text-neutral-600 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                >
                  {kw}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* 操作按钮区 */}
      <div className="px-6 py-4 border-t border-neutral-100">
        <div className="flex items-center gap-3">
          <button
            className={[
              "flex-1 py-2.5 rounded-full",
              "bg-gradient-to-r from-rose-500 to-pink-500",
              "text-white text-sm font-medium",
              "shadow-sm hover:shadow-glow-sm",
              "transition-all duration-150 active:scale-[0.98]",
            ].join(" ")}
          >
            🎬 用此热点生成脚本
          </button>
          <button
            className={[
              "py-2.5 px-4 rounded-full",
              "bg-neutral-100 hover:bg-rose-50",
              "text-neutral-600 hover:text-rose-500 text-sm font-medium",
              "transition-all duration-150",
            ].join(" ")}
          >
            收藏
          </button>
          <button
            className={[
              "py-2.5 px-4 rounded-full",
              "bg-neutral-100 hover:bg-rose-50",
              "text-neutral-600 hover:text-rose-500 text-sm font-medium",
              "transition-all duration-150",
            ].join(" ")}
          >
            分享
          </button>
        </div>
      </div>
    </div>
  );
}
