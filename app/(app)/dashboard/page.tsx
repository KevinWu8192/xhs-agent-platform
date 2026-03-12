// ─────────────────────────────────────────────────────────────
//  Dashboard Page — Server Component
//  获取真实用户信息，展示 Agent 卡片网格 + 最近记录占位
// ─────────────────────────────────────────────────────────────

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { SetupBanner } from '@/components/setup-banner'

// ── Agent 卡片数据（硬编码）────────────────────────────────────
const agents = [
  {
    id: 'radar',
    name: '信息雷达',
    description: '搜索小红书热门内容，分析竞品，发现爆款话题',
    emoji: '📡',
    href: '/agents/radar',
    gradient: 'from-rose-400 to-pink-500',
    tag: '内容研究',
    disabled: false,
  },
  {
    id: 'script',
    name: '脚本口播',
    description: '输入话题，AI 帮你写视频脚本和口播文案',
    emoji: '✍️',
    href: '/agents/script',
    gradient: 'from-pink-400 to-fuchsia-500',
    tag: '创作助手',
    disabled: false,
  },
  {
    id: 'tags',
    name: '标签优化',
    description: '智能推荐标签组合，提升笔记曝光量',
    emoji: '🏷️',
    href: '#',
    gradient: 'from-orange-300 to-rose-400',
    tag: '即将上线',
    disabled: true,
  },
  {
    id: 'insights',
    name: '数据洞察',
    description: '分析账号数据，给出涨粉策略建议',
    emoji: '📈',
    href: '#',
    gradient: 'from-purple-400 to-pink-500',
    tag: '即将上线',
    disabled: true,
  },
]

// ── 今日统计（静态占位）────────────────────────────────────────
const todayStats = [
  { label: '热点追踪', value: '—', unit: '条', emoji: '📡' },
  { label: '生成脚本', value: '—', unit: '份', emoji: '✍️' },
  { label: '粉丝增长', value: '—', unit: '人', emoji: '👤' },
  { label: '内容互动', value: '—', unit: '次', emoji: '❤️' },
]

// ── 获取问候语 ────────────────────────────────────────────────
function getGreeting(hour: number): string {
  if (hour < 6) return '深夜好'
  if (hour < 12) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

function getDateString(): string {
  const now = new Date()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
  return `${month} 月 ${day} 日，${weekDays[now.getDay()]}`
}

// ─────────────────────────────────────────────────────────────
//  Main Page Component (Server Component)
// ─────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 用户显示名：email 前缀
  const displayName = user?.email?.split('@')[0] ?? '用户'

  const hour = new Date().getHours()
  const greeting = getGreeting(hour)
  const dateStr = getDateString()

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── API Key 引导 Banner ────────────────────────────────── */}
      <SetupBanner />

      {/* ── 欢迎语区域 ─────────────────────────────────────────── */}
      <section>
        <div
          className={[
            'relative overflow-hidden',
            'bg-gradient-to-br from-rose-400 via-pink-400 to-primary-500',
            'rounded-3xl p-7 text-white',
            'shadow-card-lg',
          ].join(' ')}
        >
          {/* 装饰性背景圆圈 */}
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white/5" />
          <div className="absolute top-1/2 right-24 w-20 h-20 rounded-full bg-white/5" />

          <div className="relative z-10">
            {/* 日期 */}
            <p className="text-white/70 text-sm mb-2">{dateStr}</p>

            {/* 主问候语 */}
            <h1 className="text-3xl font-bold mb-1">
              {greeting}，{displayName} ✨
            </h1>
            <p className="text-white/80 text-base">今天想做什么？</p>

            {/* 快速操作提示 */}
            <div className="flex items-center gap-3 mt-5">
              <Link
                href="/agents/script"
                className={[
                  'flex items-center gap-2',
                  'bg-white/20 hover:bg-white/30',
                  'border border-white/30',
                  'text-white text-sm font-medium',
                  'px-4 py-2 rounded-full',
                  'transition-all duration-150',
                ].join(' ')}
              >
                <span>✍️</span>
                <span>生成脚本</span>
              </Link>
              <Link
                href="/agents/radar"
                className={[
                  'flex items-center gap-2',
                  'bg-white/20 hover:bg-white/30',
                  'border border-white/30',
                  'text-white text-sm font-medium',
                  'px-4 py-2 rounded-full',
                  'transition-all duration-150',
                ].join(' ')}
              >
                <span>📡</span>
                <span>追踪热点</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── 今日统计 ───────────────────────────────────────────── */}
      <section>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {todayStats.map((stat) => (
            <div
              key={stat.label}
              className={[
                'bg-white rounded-2xl p-4',
                'shadow-card hover:shadow-card-hover',
                'transition-all duration-200 hover:-translate-y-0.5',
              ].join(' ')}
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
      </section>

      {/* ── Agent 卡片网格 ─────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-neutral-800">
              我的 AI 助手
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              选择一个 Agent 开始今天的创作
            </p>
          </div>
        </div>

        {/* 2x2 网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {agents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {/* ── 最近使用记录（M4 占位）──────────────────────────────── */}
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
        </div>

        <div className="bg-white rounded-2xl shadow-card overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center text-3xl mb-4">
              📋
            </div>
            <p className="text-base font-medium text-neutral-700 mb-1">暂无记录</p>
            <p className="text-sm text-neutral-400">
              开始使用 AI 助手后，这里会显示你的使用记录
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  AgentCard — Agent 功能卡片
// ─────────────────────────────────────────────────────────────

interface Agent {
  id: string
  name: string
  description: string
  emoji: string
  href: string
  gradient: string
  tag: string
  disabled: boolean
}

function AgentCard({ agent }: { agent: Agent }) {
  const cardContent = (
    <div
      className={[
        `bg-gradient-to-br ${agent.gradient}`,
        'rounded-2xl p-6 text-white',
        'shadow-card hover:shadow-card-hover',
        'transition-all duration-200',
        agent.disabled ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1 cursor-pointer',
        'relative overflow-hidden group',
      ].join(' ')}
    >
      {/* 装饰性背景圆 */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10 group-hover:scale-125 transition-transform duration-300" />

      {/* Tag */}
      <div className="flex items-center justify-between mb-3 relative z-10">
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
          {agent.tag}
        </span>
        {agent.disabled && (
          <span className="text-xs text-white/60">敬请期待</span>
        )}
      </div>

      {/* Emoji 图标 */}
      <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200 relative z-10">
        {agent.emoji}
      </div>

      {/* 标题 */}
      <h3 className="text-xl font-bold mb-1.5 relative z-10">{agent.name}</h3>

      {/* 描述 */}
      <p className="text-sm text-white/80 leading-relaxed mb-5 line-clamp-2 relative z-10">
        {agent.description}
      </p>

      {/* 开始使用按钮 */}
      <div
        className={[
          'w-full py-2.5 rounded-full relative z-10 text-center',
          'bg-white/20 text-white text-sm font-medium',
          'border border-white/30',
          agent.disabled ? '' : 'hover:bg-white/30 active:bg-white/40 active:scale-[0.98] transition-all duration-150',
        ].join(' ')}
      >
        {agent.disabled ? '即将上线' : '开始使用 →'}
      </div>
    </div>
  )

  if (agent.disabled) {
    return cardContent
  }

  return (
    <Link href={agent.href} className="block">
      {cardContent}
    </Link>
  )
}
