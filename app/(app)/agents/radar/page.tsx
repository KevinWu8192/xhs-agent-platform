'use client'

// ─────────────────────────────────────────────────────────────
//  Radar Agent Page — 信息雷达
//  搜索框 + 笔记列表 + AI Insights 流式展示
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import type { XHSNote } from '@/types'

const PLATFORMS = ['全部平台', '小红书', '微博', '抖音', 'B站'] as const
const TIME_FILTERS = ['最近 24 小时', '最近 3 天', '最近 7 天'] as const

type RadarSSEEvent = 'start' | 'notes' | 'delta' | 'done' | 'error'

export default function RadarPage() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [notes, setNotes] = useState<XHSNote[]>([])
  const [insights, setInsights] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [activePlatform, setActivePlatform] = useState('全部平台')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return

    setIsLoading(true)
    setNotes([])
    setInsights('')
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch('/api/agents/radar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim(), limit: 10 }),
      })

      if (!response.ok) {
        const errText = await response.text()
        setError(`请求失败 (${response.status}): ${errText}`)
        setIsLoading(false)
        return
      }

      const reader = response.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue

          const raw = trimmed.slice(6)
          if (raw === '[DONE]') {
            setIsLoading(false)
            return
          }

          try {
            const parsed = JSON.parse(raw) as { event: RadarSSEEvent; data: unknown }
            if (parsed.event === 'notes') {
              setNotes(parsed.data as XHSNote[])
            } else if (parsed.event === 'delta') {
              const delta = parsed.data as { type: string; text: string }
              setInsights((prev) => prev + delta.text)
            } else if (parsed.event === 'done') {
              setIsLoading(false)
              return
            } else if (parsed.event === 'error') {
              const errData = parsed.data as { message?: string }
              setError(errData?.message ?? '流式响应出错')
              setIsLoading(false)
              return
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败')
      setIsLoading(false)
    }
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleSuggestedKeyword(kw: string) {
    setQuery(kw)
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

      {/* ── 错误提示 ────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700">
          <span className="text-lg shrink-0">⚠️</span>
          <p className="text-sm">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600 transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── 主内容区 ────────────────────────────────────────────── */}
      {!hasSearched ? (
        /* 初始空状态 */
        <div className="flex-1 bg-white rounded-2xl shadow-card overflow-hidden">
          <InitialEmptyState onKeywordClick={handleSuggestedKeyword} />
        </div>
      ) : (
        /* 搜索结果：双栏布局 */
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-5 min-h-0">
          {/* 左侧：笔记列表 */}
          <div className="bg-white rounded-2xl shadow-card overflow-y-auto">
            <div className="p-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <span>📋</span>
                <span>搜索结果</span>
                {notes.length > 0 && (
                  <span className="ml-auto text-xs text-neutral-400 font-normal">
                    共 {notes.length} 条笔记
                  </span>
                )}
              </h2>
            </div>

            {isLoading && notes.length === 0 ? (
              /* 骨架屏 */
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm text-neutral-500">暂无结果</p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {notes.map((note) => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </div>

          {/* 右侧：AI Insights 流式展示 */}
          <div className="bg-white rounded-2xl shadow-card overflow-y-auto flex flex-col">
            <div className="p-4 border-b border-neutral-100">
              <h2 className="text-sm font-semibold text-neutral-700 flex items-center gap-2">
                <span>🤖</span>
                <span>AI 深度洞察</span>
                {isLoading && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs text-rose-500 font-normal">
                    <span className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
                    分析中...
                  </span>
                )}
              </h2>
            </div>

            <div className="flex-1 p-4">
              {isLoading && !insights ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-10 h-10 border-4 border-rose-100 border-t-rose-400 rounded-full animate-spin mb-4" />
                  <p className="text-sm text-neutral-500">AI 分析中...</p>
                  <p className="text-xs text-neutral-400 mt-1">正在处理搜索结果，请稍候</p>
                </div>
              ) : insights ? (
                <div className="prose prose-sm max-w-none">
                  <div className="whitespace-pre-wrap text-neutral-700 text-sm leading-relaxed font-sans">
                    {insights}
                    {isLoading && (
                      <span className="inline-block w-0.5 h-4 bg-rose-400 animate-pulse ml-0.5 align-middle" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="text-4xl mb-3">💡</div>
                  <p className="text-sm text-neutral-500">等待笔记加载后分析...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  SkeletonCard — 骨架屏卡片
// ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-xl p-4 bg-neutral-50 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-lg bg-neutral-200 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-3/4 rounded bg-neutral-200" />
          <div className="h-3 w-1/2 rounded bg-neutral-200" />
          <div className="flex gap-3 mt-2">
            <div className="h-3 w-12 rounded bg-neutral-200" />
            <div className="h-3 w-12 rounded bg-neutral-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  NoteCard — 笔记卡片
// ─────────────────────────────────────────────────────────────

function NoteCard({ note }: { note: XHSNote }) {
  return (
    <a
      href={note.note_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-xl p-4 bg-neutral-50 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all duration-150"
    >
      <div className="flex items-start gap-3">
        {/* 封面图 */}
        {note.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={note.cover_image_url}
            alt={note.title}
            className="w-16 h-16 rounded-lg object-cover shrink-0 bg-neutral-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-rose-100 to-pink-100 flex items-center justify-center text-2xl shrink-0">
            📝
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* 标题 */}
          <h3 className="text-sm font-semibold text-neutral-800 line-clamp-2 leading-snug">
            {note.title}
          </h3>

          {/* 作者 */}
          <p className="text-xs text-neutral-500 mt-1">@{note.author}</p>

          {/* 互动数据 */}
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs text-neutral-500">
              <span>❤️</span>
              <span>{formatCount(note.likes)}</span>
            </span>
            <span className="flex items-center gap-1 text-xs text-neutral-500">
              <span>💬</span>
              <span>{formatCount(note.comments)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* 标签 */}
      {note.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {note.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-500 border border-rose-100"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </a>
  )
}

// ─────────────────────────────────────────────────────────────
//  InitialEmptyState — 初始空状态
// ─────────────────────────────────────────────────────────────

function InitialEmptyState({ onKeywordClick }: { onKeywordClick: (kw: string) => void }) {
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

      <div className="flex flex-wrap gap-2 justify-center">
        {['秋冬穿搭', '日系妆容', '家居改造', '咖啡探店', '慢生活'].map((kw) => (
          <button
            key={kw}
            onClick={() => onKeywordClick(kw)}
            className="px-3 py-1.5 rounded-full text-sm bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors border border-rose-200"
          >
            {kw}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function formatCount(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}
