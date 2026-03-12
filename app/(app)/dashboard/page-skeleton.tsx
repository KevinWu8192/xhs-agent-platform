// ─────────────────────────────────────────────────────────────
//  Dashboard Page Skeleton — UI 草图
//  功能：首页仪表板，展示 Agent 入口 + 最近使用记录
//  风格：粉红渐变卡片网格，温暖欢迎语
// ─────────────────────────────────────────────────────────────

// 模拟数据（实际使用时替换为 API 数据）
const MOCK_USER_NAME = "小红";

const AGENT_CARDS = [
  {
    id: "radar",
    emoji: "📡",
    title: "信息雷达",
    description: "实时追踪小红书热点话题，抓住每一个流量风口",
    href: "/agents/radar",
    gradient: "from-rose-400 to-pink-500",
    stats: "今日新增 12 条热点",
  },
  {
    id: "script",
    emoji: "🎬",
    title: "脚本口播",
    description: "AI 一键生成爆款脚本，让你的视频更有感染力",
    href: "/agents/script",
    gradient: "from-pink-400 to-rose-500",
    stats: "已生成 86 份脚本",
  },
  {
    id: "topics",
    emoji: "💡",
    title: "选题助手",
    description: "基于你的账号风格，智能推荐高互动选题方向",
    href: "/agents/topics",
    gradient: "from-rose-500 to-red-500",
    stats: "本周推荐 24 个选题",
  },
  {
    id: "analytics",
    emoji: "📊",
    title: "数据分析",
    description: "深度解析账号数据，找到你的内容增长密码",
    href: "/agents/analytics",
    gradient: "from-primary-300 to-rose-400",
    stats: "涨粉趋势 +18%",
  },
] as const;

const RECENT_ACTIVITIES = [
  {
    id: "1",
    agentEmoji: "🎬",
    agentName: "脚本口播",
    action: "生成了《秋日穿搭指南》脚本",
    time: "10 分钟前",
    type: "script",
  },
  {
    id: "2",
    agentEmoji: "📡",
    agentName: "信息雷达",
    action: "发现热点：「慢生活」话题搜索量暴涨 340%",
    time: "32 分钟前",
    type: "radar",
  },
  {
    id: "3",
    agentEmoji: "💡",
    agentName: "选题助手",
    action: "推荐选题：「宿舍改造」下周预测热度 ★★★★★",
    time: "1 小时前",
    type: "topics",
  },
  {
    id: "4",
    agentEmoji: "📊",
    agentName: "数据分析",
    action: "周报：本周涨粉 1,234，互动率提升 23%",
    time: "昨天 20:00",
    type: "analytics",
  },
  {
    id: "5",
    agentEmoji: "🎬",
    agentName: "脚本口播",
    action: "生成了《日系妆容 5 分钟速成》脚本",
    time: "昨天 15:30",
    type: "script",
  },
] as const;

// 今日统计数据
const TODAY_STATS = [
  { label: "热点追踪", value: "12", unit: "条", emoji: "📡" },
  { label: "生成脚本", value: "3", unit: "份", emoji: "🎬" },
  { label: "粉丝增长", value: "+48", unit: "人", emoji: "👤" },
  { label: "内容互动", value: "2.4k", unit: "次", emoji: "❤️" },
] as const;

// ─────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────

export default function DashboardPageSkeleton() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── 欢迎语区域 ─────────────────────────────────────────── */}
      <section>
        <GreetingSection userName={MOCK_USER_NAME} />
      </section>

      {/* ── 今日统计 ───────────────────────────────────────────── */}
      <section>
        <TodayStats />
      </section>

      {/* ── Agent 卡片网格 ─────────────────────────────────────── */}
      <section>
        {/* 区块标题 */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">
              我的 AI 助手
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              选择一个 Agent 开始今天的创作
            </p>
          </div>
          <button className="text-sm text-rose-500 font-medium hover:text-rose-600 transition-colors">
            查看全部 →
          </button>
        </div>

        {/* 2x2 网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {AGENT_CARDS.map((agent) => (
            <AgentCardItem key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {/* ── 最近使用记录 ───────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">
              最近使用
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              你的 AI 助手最近帮你做了这些
            </p>
          </div>
          <button className="text-sm text-rose-500 font-medium hover:text-rose-600 transition-colors">
            全部记录 →
          </button>
        </div>

        <RecentActivityList activities={RECENT_ACTIVITIES} />
      </section>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  GreetingSection — 欢迎语
// ─────────────────────────────────────────────────────────────

function GreetingSection({ userName }: { userName: string }) {
  // 根据时段显示不同问候语（UI 草图中写死，实际用 new Date().getHours()）
  const greeting = "下午好";
  const dateStr = "3 月 12 日，星期四";

  return (
    <div
      className={[
        "relative overflow-hidden",
        "bg-gradient-to-br from-rose-400 via-pink-400 to-primary-500",
        "rounded-3xl p-7 text-white",
        "shadow-card-lg",
      ].join(" ")}
    >
      {/* 装饰性背景圆圈 */}
      <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
      <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/8" />
      <div className="absolute top-1/2 right-24 w-20 h-20 rounded-full bg-white/6" />

      <div className="relative z-10">
        {/* 日期 */}
        <p className="text-white/70 text-sm mb-2">{dateStr}</p>

        {/* 主问候语 */}
        <h1 className="text-3xl font-bold mb-1">
          {greeting}，{userName} ✨
        </h1>
        <p className="text-white/80 text-base">今天想做什么？</p>

        {/* 快速操作提示 */}
        <div className="flex items-center gap-3 mt-5">
          <button
            className={[
              "flex items-center gap-2",
              "bg-white/20 hover:bg-white/30",
              "border border-white/30",
              "text-white text-sm font-medium",
              "px-4 py-2 rounded-full",
              "transition-all duration-150",
            ].join(" ")}
          >
            <span>🎬</span>
            <span>生成脚本</span>
          </button>
          <button
            className={[
              "flex items-center gap-2",
              "bg-white/20 hover:bg-white/30",
              "border border-white/30",
              "text-white text-sm font-medium",
              "px-4 py-2 rounded-full",
              "transition-all duration-150",
            ].join(" ")}
          >
            <span>📡</span>
            <span>追踪热点</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  TodayStats — 今日统计小卡片
// ─────────────────────────────────────────────────────────────

function TodayStats() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {TODAY_STATS.map((stat) => (
        <div
          key={stat.label}
          className={[
            "bg-white rounded-2xl p-4",
            "shadow-card hover:shadow-card-hover",
            "transition-all duration-200 hover:-translate-y-0.5",
          ].join(" ")}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-neutral-500 text-xs">{stat.label}</span>
            <span className="text-xl" aria-hidden="true">
              {stat.emoji}
            </span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-neutral-900">
              {stat.value}
            </span>
            <span className="text-sm text-neutral-400">{stat.unit}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  AgentCardItem — Agent 功能卡片
// ─────────────────────────────────────────────────────────────

interface AgentCardItemProps {
  agent: (typeof AGENT_CARDS)[number];
}

function AgentCardItem({ agent }: AgentCardItemProps) {
  return (
    <div
      className={[
        `bg-gradient-to-br ${agent.gradient}`,
        "rounded-2xl p-6 text-white",
        "shadow-card hover:shadow-card-hover",
        "transition-all duration-200 hover:-translate-y-1",
        "cursor-pointer group",
        "relative overflow-hidden",
      ].join(" ")}
    >
      {/* 装饰性背景圆 */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-300" />

      {/* Emoji 图标 */}
      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200 relative z-10">
        {agent.emoji}
      </div>

      {/* 标题 */}
      <h3 className="text-xl font-bold mb-1.5 relative z-10">{agent.title}</h3>

      {/* 描述 */}
      <p className="text-sm text-white/80 leading-relaxed mb-1 line-clamp-2 relative z-10">
        {agent.description}
      </p>

      {/* 统计数字 */}
      <p className="text-xs text-white/60 mb-5 relative z-10">{agent.stats}</p>

      {/* 开始使用按钮 */}
      <button
        className={[
          "w-full py-2.5 rounded-full relative z-10",
          "bg-white/20 hover:bg-white/30 active:bg-white/40",
          "text-white text-sm font-medium",
          "border border-white/30",
          "transition-all duration-150",
          "active:scale-[0.98]",
        ].join(" ")}
      >
        开始使用
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  RecentActivityList — 最近使用记录
// ─────────────────────────────────────────────────────────────

type Activity = (typeof RECENT_ACTIVITIES)[number];

function RecentActivityList({ activities }: { activities: readonly Activity[] }) {
  return (
    <div className="bg-white rounded-2xl shadow-card overflow-hidden">
      <ul className="divide-y divide-neutral-50">
        {activities.map((activity, index) => (
          <li
            key={activity.id}
            className={[
              "flex items-center gap-4 px-6 py-4",
              "hover:bg-rose-50/50 transition-colors duration-150 cursor-pointer",
            ].join(" ")}
          >
            {/* Agent 图标 */}
            <div
              className={[
                "w-10 h-10 rounded-xl shrink-0",
                "bg-rose-50 flex items-center justify-center",
                "text-xl",
              ].join(" ")}
            >
              {activity.agentEmoji}
            </div>

            {/* 内容 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-medium text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full">
                  {activity.agentName}
                </span>
              </div>
              <p className="text-sm text-neutral-700 truncate">{activity.action}</p>
            </div>

            {/* 时间 + 箭头 */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-neutral-400 hidden sm:block">
                {activity.time}
              </span>
              <span className="text-neutral-300 text-sm">›</span>
            </div>
          </li>
        ))}
      </ul>

      {/* 查看更多 */}
      <div className="px-6 py-3 border-t border-neutral-50 text-center">
        <button className="text-sm text-rose-500 font-medium hover:text-rose-600 transition-colors">
          查看更多记录
        </button>
      </div>
    </div>
  );
}
