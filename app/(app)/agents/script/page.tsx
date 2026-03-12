'use client'

// ─────────────────────────────────────────────────────────────
//  Script Agent Page — 脚本口播
//  话题输入 + 风格选择 + 生成按钮 + 流式脚本输出区
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import Link from 'next/link'
import type { ScriptStyle } from '@/types'

// ── 内容风格选项 ──────────────────────────────────────────────
const STYLE_OPTIONS = [
  {
    id: 'lifestyle' as ScriptStyle,
    label: '生活类',
    emoji: '🌿',
    desc: '温暖真实，记录日常',
    gradient: 'from-emerald-400 to-teal-500',
  },
  {
    id: 'beauty' as ScriptStyle,
    label: '美妆',
    emoji: '💄',
    desc: '种草拔草，专业干货',
    gradient: 'from-rose-400 to-pink-500',
  },
  {
    id: 'food' as ScriptStyle,
    label: '美食',
    emoji: '🍜',
    desc: '探店食谱，烟火人间',
    gradient: 'from-amber-400 to-orange-500',
  },
  {
    id: 'tech' as ScriptStyle,
    label: '数码',
    emoji: '📱',
    desc: '开箱测评，极客范儿',
    gradient: 'from-blue-400 to-indigo-500',
  },
] as const

// ── 快速话题填入 ──────────────────────────────────────────────
const HOT_TOPICS = ['秋冬穿搭', '在家咖啡', '日系妆容', '宿舍改造', '慢生活'] as const
const EXAMPLE_TOPICS = ['秋冬日系清透妆容教程', '咖啡在家复刻 5 个诀窍', '宿舍改造前后对比'] as const

type ScriptSSEEvent = 'start' | 'delta' | 'done' | 'error'

export default function ScriptPage() {
  const [topic, setTopic] = useState('')
  const [style, setStyle] = useState<ScriptStyle>('lifestyle')
  const [isGenerating, setIsGenerating] = useState(false)
  const [scriptText, setScriptText] = useState('')
  const [isDone, setIsDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isKeyError, setIsKeyError] = useState(false)
  const [charCount, setCharCount] = useState(0)
  const [copied, setCopied] = useState(false)

  function handleTopicChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    if (val.length <= 200) {
      setTopic(val)
      setCharCount(val.length)
    }
  }

  function fillTopic(t: string) {
    const newTopic = topic ? `${topic} ${t}` : t
    if (newTopic.length <= 200) {
      setTopic(newTopic)
      setCharCount(newTopic.length)
    }
  }

  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) return

    setIsGenerating(true)
    setScriptText('')
    setIsDone(false)
    setError(null)
    setIsKeyError(false)

    try {
      const response = await fetch('/api/agents/script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topic.trim(),
          style,
          duration_seconds: 60,
          tone: 'casual',
        }),
      })

      if (!response.ok) {
        if (response.status === 422) {
          const data = await response.json()
          if (data.error === 'API_KEY_NOT_CONFIGURED') {
            setError('请先前往「设置」页面配置你的 AI API Key')
            setIsKeyError(true)
            setIsGenerating(false)
            return
          }
        }
        const errText = await response.text()
        setError(`请求失败 (${response.status}): ${errText}`)
        setIsGenerating(false)
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
            setIsGenerating(false)
            setIsDone(true)
            return
          }

          try {
            const parsed = JSON.parse(raw) as { event: ScriptSSEEvent; data: unknown }
            if (parsed.event === 'delta') {
              const delta = parsed.data as { type: string; text: string }
              if (delta.text) {
                setScriptText((prev) => prev + delta.text)
              }
            } else if (parsed.event === 'done') {
              setIsGenerating(false)
              setIsDone(true)
              return
            } else if (parsed.event === 'error') {
              const errData = parsed.data as { message?: string }
              setError(errData?.message ?? '生成出错')
              setIsGenerating(false)
              return
            }
          } catch {
            // skip malformed lines
          }
        }
      }

      setIsGenerating(false)
      setIsDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '网络请求失败')
      setIsGenerating(false)
    }
  }, [topic, style])

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(scriptText)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard API not available
    }
  }

  const hasScript = scriptText.length > 0

  return (
    <div className="animate-fade-in">
      {/* ── 页面标题 ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={[
              'w-10 h-10 rounded-2xl',
              'bg-gradient-to-br from-pink-400 to-rose-500',
              'flex items-center justify-center text-xl',
              'shadow-glow-sm',
            ].join(' ')}
          >
            ✍️
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900">脚本口播</h1>
            <p className="text-xs text-neutral-500">AI 一键生成爆款脚本，让你的视频更有感染力</p>
          </div>
        </div>

        {/* 历史记录按钮 */}
        <button
          className={[
            'flex items-center gap-2',
            'h-9 px-4 rounded-full',
            'bg-white border border-neutral-200 shadow-sm',
            'text-sm text-neutral-600 hover:text-rose-500 hover:border-rose-300',
            'transition-all duration-150',
          ].join(' ')}
        >
          <span className="text-base">📋</span>
          <span>历史脚本</span>
        </button>
      </div>

      {/* ── 双栏布局：左侧配置 + 右侧输出 ───────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[460px_1fr] gap-6 mt-6">
        {/* ── 左侧：配置面板 ─────────────────────────────────────── */}
        <div className="space-y-5">
          {/* 话题输入 */}
          <section className="bg-white rounded-2xl shadow-card p-5">
            <label className="block text-sm font-semibold text-neutral-800 mb-3">
              📝 话题 / 关键词
              <span className="ml-1 text-xs font-normal text-neutral-400">（必填）</span>
            </label>

            <textarea
              value={topic}
              onChange={handleTopicChange}
              placeholder={'输入你要创作的话题，例如：\n「秋冬日系清透妆容教程」\n「拿铁咖啡在家复刻」'}
              className={[
                'w-full h-28 px-4 py-3 rounded-xl resize-none',
                'bg-neutral-50 border-2 border-neutral-200',
                'text-neutral-900 text-sm placeholder-neutral-400',
                'transition-all duration-200',
                'focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50',
                'focus:bg-white',
              ].join(' ')}
            />

            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-neutral-400">描述越详细，生成效果越好</p>
              <span className={`text-xs ${charCount >= 180 ? 'text-rose-500' : 'text-neutral-400'}`}>
                {charCount} / 200
              </span>
            </div>

            {/* 热点话题快速填入 */}
            <div className="mt-3">
              <p className="text-xs text-neutral-500 mb-2">今日热点话题：</p>
              <div className="flex flex-wrap gap-1.5">
                {HOT_TOPICS.map((t) => (
                  <button
                    key={t}
                    onClick={() => fillTopic(t)}
                    className="px-2.5 py-1 rounded-full text-xs bg-rose-50 text-rose-500 hover:bg-rose-100 transition-colors"
                  >
                    + {t}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 内容风格选择 */}
          <section className="bg-white rounded-2xl shadow-card p-5">
            <label className="block text-sm font-semibold text-neutral-800 mb-3">
              🎨 内容风格
            </label>

            <div className="grid grid-cols-2 gap-2.5">
              {STYLE_OPTIONS.map((styleOption) => (
                <button
                  key={styleOption.id}
                  onClick={() => setStyle(styleOption.id)}
                  className={[
                    'relative p-3.5 rounded-xl text-left',
                    'transition-all duration-150',
                    'border-2',
                    style === styleOption.id
                      ? 'border-rose-400 bg-rose-50'
                      : 'border-transparent bg-neutral-50 hover:border-neutral-200',
                  ].join(' ')}
                >
                  {/* 选中指示 */}
                  {style === styleOption.id && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-rose-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">✓</span>
                    </div>
                  )}

                  {/* Emoji */}
                  <div
                    className={[
                      'w-9 h-9 rounded-xl mb-2',
                      `bg-gradient-to-br ${styleOption.gradient}`,
                      'flex items-center justify-center text-lg',
                    ].join(' ')}
                  >
                    {styleOption.emoji}
                  </div>

                  <div className="text-sm font-semibold text-neutral-800">{styleOption.label}</div>
                  <div className="text-xs text-neutral-500 mt-0.5">{styleOption.desc}</div>
                </button>
              ))}
            </div>
          </section>

          {/* 错误提示 */}
          {error && (
            <div className={[
              'flex items-center gap-3 p-4 rounded-xl border',
              isKeyError
                ? 'bg-amber-50 border-amber-200 text-amber-800'
                : 'bg-red-50 border-red-200 text-red-700',
            ].join(' ')}>
              <span className="text-lg shrink-0">{isKeyError ? '🔑' : '⚠️'}</span>
              <p className="text-sm flex-1">{error}</p>
              {isKeyError && (
                <Link
                  href="/settings"
                  className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
                >
                  前往设置
                </Link>
              )}
              <button
                onClick={() => { setError(null); setIsKeyError(false) }}
                className={[
                  'shrink-0 transition-colors',
                  isKeyError ? 'text-amber-400 hover:text-amber-600' : 'ml-auto text-red-400 hover:text-red-600',
                ].join(' ')}
              >
                ✕
              </button>
            </div>
          )}

          {/* 生成按钮 */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className={[
              'w-full h-14 rounded-2xl',
              'bg-gradient-to-r from-rose-500 to-pink-500',
              'hover:from-rose-600 hover:to-pink-600',
              'text-white text-base font-bold',
              'shadow-card hover:shadow-glow',
              'transition-all duration-200',
              'active:scale-[0.98]',
              'flex items-center justify-center gap-2.5',
              'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-card disabled:active:scale-100',
            ].join(' ')}
          >
            {isGenerating ? (
              <>
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>AI 创作中...</span>
              </>
            ) : (
              <>
                <span className="text-xl">✨</span>
                <span>生成脚本</span>
                <span className="text-sm font-normal text-white/70 ml-1">约 5 秒</span>
              </>
            )}
          </button>
        </div>

        {/* ── 右侧：脚本输出区 ────────────────────────────────────── */}
        <div
          className={[
            'bg-white rounded-2xl shadow-card',
            'flex flex-col',
            'overflow-hidden',
            'min-h-[600px]',
          ].join(' ')}
        >
          {!hasScript && isGenerating ? (
            <GeneratingState />
          ) : hasScript ? (
            <ScriptOutput
              scriptText={scriptText}
              isGenerating={isGenerating}
              isDone={isDone}
              copied={copied}
              onCopy={handleCopy}
            />
          ) : (
            <ScriptEmptyState onFillTopic={fillTopic} />
          )}
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  ScriptOutput — 流式脚本展示区
// ─────────────────────────────────────────────────────────────

interface ScriptOutputProps {
  scriptText: string
  isGenerating: boolean
  isDone: boolean
  copied: boolean
  onCopy: () => void
}

function ScriptOutput({ scriptText, isGenerating, isDone, copied, onCopy }: ScriptOutputProps) {
  return (
    <div className="flex flex-col h-full">
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <span>✍️</span>
          <span className="font-medium">生成的脚本</span>
          {isGenerating && (
            <span className="flex items-center gap-1.5 text-xs text-rose-500 ml-2">
              <span className="w-3 h-3 border-2 border-rose-400 border-t-transparent rounded-full animate-spin" />
              生成中...
            </span>
          )}
          {isDone && (
            <span className="text-xs text-emerald-500 ml-2">✓ 生成完成</span>
          )}
        </div>

        {/* 复制按钮 — 完成后显示 */}
        {isDone && (
          <button
            onClick={onCopy}
            className={[
              'flex items-center gap-1.5 h-8 px-4 rounded-lg text-sm font-medium',
              'transition-all duration-150',
              copied
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100',
            ].join(' ')}
          >
            {copied ? (
              <>
                <span>✓</span>
                <span>已复制</span>
              </>
            ) : (
              <>
                <span>📋</span>
                <span>复制全文</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 脚本内容 */}
      <div className="flex-1 overflow-y-auto p-5">
        <pre className="whitespace-pre-wrap font-sans text-sm text-neutral-700 leading-relaxed">
          {scriptText}
          {isGenerating && (
            <span className="inline-block w-0.5 h-4 bg-rose-400 animate-pulse ml-0.5 align-middle" />
          )}
        </pre>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  ScriptEmptyState — 空状态（未生成脚本时）
// ─────────────────────────────────────────────────────────────

function ScriptEmptyState({ onFillTopic }: { onFillTopic: (t: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 text-center">
      <div
        className={[
          'w-24 h-24 rounded-3xl mb-6',
          'bg-gradient-to-br from-rose-100 to-pink-100',
          'flex items-center justify-center text-5xl',
        ].join(' ')}
      >
        ✍️
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
        {EXAMPLE_TOPICS.map((example) => (
          <button
            key={example}
            onClick={() => onFillTopic(example)}
            className={[
              'w-full text-left px-4 py-3 rounded-xl',
              'bg-rose-50 hover:bg-rose-100',
              'text-sm text-rose-600 font-medium',
              'border border-rose-200 hover:border-rose-300',
              'transition-all duration-150',
              'flex items-center gap-2',
            ].join(' ')}
          >
            <span>✨</span>
            <span>{example}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  GeneratingState — 生成中的加载状态（脚本尚未开始流出时）
// ─────────────────────────────────────────────────────────────

function GeneratingState() {
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
            <div className="w-5 h-5 rounded-full bg-neutral-200 animate-pulse" />
            <div className="h-3 w-20 rounded bg-neutral-200 animate-pulse" />
          </div>
          {/* 内容骨架 */}
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-rose-100 animate-pulse" />
            <div className="h-3 w-5/6 rounded bg-rose-100 animate-pulse" />
            <div className="h-3 w-4/5 rounded bg-rose-100 animate-pulse" />
            {i < 3 && <div className="h-3 w-3/4 rounded bg-rose-100 animate-pulse" />}
          </div>
        </div>
      ))}
    </div>
  )
}
