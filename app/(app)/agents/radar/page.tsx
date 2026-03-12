'use client'

// ─────────────────────────────────────────────────────────────
//  Radar Agent Page — 信息雷达
//  搜索框 + 结果列表 + 详情面板
//  M4 将接入真实 API，当前展示空状态 UI
// ─────────────────────────────────────────────────────────────

import { useState } from 'react'

const PLATFORMS = ['全部平台', '小红书', '微博', '抖音', 'B站'] as const
const TIME_FILTERS = ['最近 24 小时', '最近 3 天', '最近 7 天'] as const

export default function RadarPage() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [activePlatform, setActivePlatform] = useState('全部平台')

  function handleSearch() {
    if (!query.trim()) return
    setIsLoading(true)
    // M4: 接入真实 API
    setTimeout(() => setIsLoading(false), 2000)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="flex flex-col h-full space-y-5 animate-fade-in">
      {/* ── 页面标题 ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={[
              'w-10 h-10 rounded-2xl',
              'bg-gradient-to-br from-rose-400 to-pink-500',
              'flex items-center justify-center text-xl',
              'shadow-glow-sm',
            ].join(' ')}
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

      {/* ── 大号搜索框 ─────────────────────────────────────────── */}
      <div className="relative">
        {/* 搜索图标 */}
        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 text-xl pointer-events-none">
          🔍
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索热点话题、关键词... 例如：秋冬穿搭、美食打卡"
          className={[
            'w-full',
            'h-14 pl-14 pr-32',
            'rounded-2xl',
            'bg-white border-2 border-neutral-200',
            'text-neutral-900 text-base placeholder-neutral-400',
            'shadow-card',
            'transition-all duration-200',
            'focus:outline-none focus:border-rose-400 focus:shadow-card-md',
            'focus:ring-4 focus:ring-rose-100',
          ].join(' ')}
        />

        {/* 搜索按钮区 */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-neutral-300 hover:text-neutral-500 p-1 transition-colors"
            >
              ✕
            </button>
          )}

          <button
            onClick={handleSearch}
            disabled={isLoading || !query.trim()}
            className={[
              'h-9 px-5 rounded-xl',
              'bg-gradient-to-r from-rose-500 to-pink-500',
              'text-white text-sm font-medium',
              'shadow-sm hover:shadow-glow-sm',
              'transition-all duration-150',
              'active:scale-[0.98]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              'flex items-center gap-2',
            ].join(' ')}
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>搜索中</span>
              </>
            ) : (
              <span>搜索</span>
            )}
          </button>
        </div>
      </div>

      {/* ── 过滤/筛选条 ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 平台 Tab */}
        <div className="flex items-center gap-1.5 bg-white rounded-full p-1 shadow-sm">
          {PLATFORMS.map((platform) => (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform)}
              className={[
                'px-3.5 py-1.5 rounded-full text-sm font-medium',
                'transition-all duration-150',
                activePlatform === platform
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-sm'
                  : 'text-neutral-500 hover:text-rose-500 hover:bg-rose-50',
              ].join(' ')}
            >
              {platform}
            </button>
          ))}
        </div>

        {/* 时间筛选 */}
        <select
          className={[
            'h-9 px-3 pr-8 rounded-full',
            'bg-white border border-neutral-200 shadow-sm',
            'text-sm text-neutral-600',
            'focus:outline-none focus:border-rose-400',
            'appearance-none cursor-pointer',
          ].join(' ')}
        >
          {TIME_FILTERS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* ── 主内容区：空状态 ────────────────────────────────────── */}
      <div className="flex-1 bg-white rounded-2xl shadow-card overflow-hidden">
        <EmptyState isLoading={isLoading} hasQuery={!!query} />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  EmptyState — 空状态展示
// ─────────────────────────────────────────────────────────────

interface EmptyStateProps {
  isLoading: boolean
  hasQuery: boolean
}

function EmptyState({ isLoading, hasQuery }: EmptyStateProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-16 h-16 border-4 border-rose-200 border-t-rose-500 rounded-full animate-spin mb-6" />
        <p className="text-base font-medium text-neutral-700 mb-1">正在搜索中...</p>
        <p className="text-sm text-neutral-400">AI 正在为你分析最新热点内容</p>
      </div>
    )
  }

  if (hasQuery) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 flex items-center justify-center text-4xl mb-5">
          📡
        </div>
        <p className="text-base font-medium text-neutral-700 mb-1">准备搜索</p>
        <p className="text-sm text-neutral-400 mb-4">
          点击「搜索」按钮开始探索热点内容
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center text-4xl mb-5">
        📡
      </div>
      <h3 className="text-lg font-semibold text-neutral-800 mb-2">
        输入关键词开始探索
      </h3>
      <p className="text-sm text-neutral-500 max-w-xs leading-relaxed mb-6">
        搜索你感兴趣的话题，AI 将为你分析热度趋势、竞品内容和创作建议
      </p>

      {/* 热门推荐关键词 */}
      <div className="flex flex-wrap gap-2 justify-center">
        {['秋冬穿搭', '日系妆容', '家居改造', '咖啡探店', '慢生活'].map((kw) => (
          <button
            key={kw}
            className="px-3 py-1.5 rounded-full text-sm bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors border border-rose-200"
          >
            {kw}
          </button>
        ))}
      </div>
    </div>
  )
}
