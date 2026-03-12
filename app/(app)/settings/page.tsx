'use client'

// ─────────────────────────────────────────────────────────────
//  Settings Page — AI 模型设置
//  配置 API 地址、API Key、模型选择
//  与后端 GET/PUT /api/settings 交互
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'

// ── 预设模型 ──────────────────────────────────────────────────
const PRESET_MODELS = [
  { id: 'claude-sonnet-4.6', label: 'claude-sonnet-4.6' },
  { id: 'claude-haiku-4.5',  label: 'claude-haiku-4.5'  },
  { id: 'claude-opus-4.6',   label: 'claude-opus-4.6'   },
  { id: 'custom',            label: '自定义'             },
] as const

type PresetModelId = typeof PRESET_MODELS[number]['id']

// ── API 响应类型 ──────────────────────────────────────────────
interface SettingsResponse {
  baseUrl: string | null
  model: string
  hasCustomKey: boolean
  keyPreview: string | null
}

// ─────────────────────────────────────────────────────────────
//  Main Page Component
// ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  // ── 加载状态 ──────────────────────────────────────────────
  const [isLoading, setIsLoading] = useState(true)

  // ── 表单状态 ──────────────────────────────────────────────
  const [baseUrl, setBaseUrl] = useState('')
  const [selectedModel, setSelectedModel] = useState<PresetModelId>('claude-sonnet-4.6')
  const [customModel, setCustomModel] = useState('')

  // ── API Key 相关状态 ──────────────────────────────────────
  const [hasCustomKey, setHasCustomKey] = useState(false)
  const [keyPreview, setKeyPreview] = useState<string | null>(null)
  const [isEditingKey, setIsEditingKey] = useState(false)
  const [newApiKey, setNewApiKey] = useState('')

  // ── 保存状态 ──────────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── 加载当前设置 ──────────────────────────────────────────
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error(`请求失败 (${res.status})`)
        const data: SettingsResponse = await res.json()

        setBaseUrl(data.baseUrl ?? '')
        setHasCustomKey(data.hasCustomKey)
        setKeyPreview(data.keyPreview)

        // 判断模型是否为预设之一
        const presetIds = PRESET_MODELS.filter(m => m.id !== 'custom').map(m => m.id)
        if (presetIds.includes(data.model as Exclude<PresetModelId, 'custom'>)) {
          setSelectedModel(data.model as PresetModelId)
        } else {
          setSelectedModel('custom')
          setCustomModel(data.model)
        }
      } catch (err) {
        // 加载失败时使用默认值，不阻塞页面
        console.error('Failed to load settings:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchSettings()
  }, [])

  // ── 清除 API Key ──────────────────────────────────────────
  const handleClearKey = useCallback(async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: '' }),
      })
      if (!res.ok) throw new Error(`请求失败 (${res.status})`)
      setHasCustomKey(false)
      setKeyPreview(null)
      setIsEditingKey(false)
      setNewApiKey('')
    } catch (err) {
      console.error('Failed to clear API key:', err)
    }
  }, [])

  // ── 保存设置 ──────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveError(null)

    const modelToSave = selectedModel === 'custom' ? customModel.trim() : selectedModel

    const body: { baseUrl?: string; model?: string; apiKey?: string } = {
      baseUrl: baseUrl.trim() || undefined,
      model: modelToSave || undefined,
    }

    // Send apiKey when: editing an existing key OR entering a new key for the first time
    if (newApiKey) {
      body.apiKey = newApiKey
    }

    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`保存失败 (${res.status})`)

      // 保存成功后从服务端重新拉取最新状态（含真实 keyPreview）
      const refreshRes = await fetch('/api/settings')
      if (refreshRes.ok) {
        const refreshData: SettingsResponse = await refreshRes.json()
        setHasCustomKey(refreshData.hasCustomKey)
        setKeyPreview(refreshData.keyPreview)
      }

      if (isEditingKey) {
        setIsEditingKey(false)
        setNewApiKey('')
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 1500)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存失败，请重试')
    } finally {
      setIsSaving(false)
    }
  }, [baseUrl, selectedModel, customModel, isEditingKey, newApiKey])

  // ── 骨架屏 ────────────────────────────────────────────────
  if (isLoading) {
    return <SettingsSkeleton />
  }

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* ── 页面标题 ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-8">
        <div
          className={[
            'w-10 h-10 rounded-2xl',
            'bg-gradient-to-br from-rose-400 to-pink-500',
            'flex items-center justify-center text-xl',
            'shadow-glow-sm',
          ].join(' ')}
        >
          ⚙️
        </div>
        <div>
          <h1 className="text-xl font-bold text-neutral-900">AI 模型设置</h1>
          <p className="text-xs text-neutral-500">配置你的 AI 服务，支持官方 API 或企业网关</p>
        </div>
      </div>

      {/* ── 设置卡片 ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">

        {/* ── API 地址 ─────────────────────────────────────────── */}
        <SettingSection
          label="API 地址"
          hint="留空则使用系统默认"
          isFirst
        >
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://api.anthropic.com"
            className={[
              'w-full h-10 px-3.5 rounded-xl',
              'bg-neutral-50 border-2 border-neutral-200',
              'text-neutral-900 text-sm placeholder-neutral-400',
              'transition-all duration-200',
              'focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 focus:bg-white',
            ].join(' ')}
          />
        </SettingSection>

        <Divider />

        {/* ── API Key ──────────────────────────────────────────── */}
        <SettingSection
          label="API Key"
          hint="留空则使用系统默认"
        >
          {hasCustomKey && !isEditingKey ? (
            /* 已有 key：显示预览 + 操作按钮 */
            <div
              className={[
                'flex items-center gap-3 h-10 px-3.5 rounded-xl',
                'bg-neutral-50 border-2 border-neutral-200',
              ].join(' ')}
            >
              {/* 隐藏点 */}
              <div className="flex gap-1 shrink-0">
                {Array.from({ length: 8 }).map((_, i) => (
                  <span key={i} className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
                ))}
              </div>

              {/* key 预览 */}
              {keyPreview && (
                <span className="text-sm text-neutral-600 font-mono flex-1 truncate">
                  {keyPreview}
                </span>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setIsEditingKey(true)}
                  className={[
                    'h-6 px-3 rounded-full text-xs font-medium',
                    'bg-rose-50 text-rose-600 hover:bg-rose-100',
                    'border border-rose-200 hover:border-rose-300',
                    'transition-all duration-150',
                  ].join(' ')}
                >
                  修改
                </button>
                <button
                  onClick={handleClearKey}
                  className={[
                    'h-6 px-3 rounded-full text-xs font-medium',
                    'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                    'border border-neutral-200',
                    'transition-all duration-150',
                  ].join(' ')}
                >
                  清除
                </button>
              </div>
            </div>
          ) : (
            /* 无 key 或编辑中：显示输入框 */
            <div className="flex items-center gap-2">
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder={isEditingKey ? '输入新的 API Key' : '输入 API Key（留空使用系统默认）'}
                autoFocus={isEditingKey}
                className={[
                  'flex-1 h-10 px-3.5 rounded-xl',
                  'bg-neutral-50 border-2 border-neutral-200',
                  'text-neutral-900 text-sm placeholder-neutral-400',
                  'transition-all duration-200',
                  'focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 focus:bg-white',
                ].join(' ')}
              />
              {isEditingKey && (
                <button
                  onClick={() => {
                    setIsEditingKey(false)
                    setNewApiKey('')
                  }}
                  className={[
                    'h-10 px-3.5 rounded-xl shrink-0',
                    'bg-neutral-100 text-neutral-600 hover:bg-neutral-200',
                    'border border-neutral-200',
                    'text-sm transition-all duration-150',
                  ].join(' ')}
                >
                  取消
                </button>
              )}
            </div>
          )}
        </SettingSection>

        <Divider />

        {/* ── 模型选择 ─────────────────────────────────────────── */}
        <SettingSection label="模型">
          {/* 按钮组 */}
          <div className="flex flex-wrap gap-2">
            {PRESET_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => setSelectedModel(m.id)}
                className={[
                  'h-8 px-3.5 rounded-full text-sm font-medium',
                  'border-2 transition-all duration-150',
                  selectedModel === m.id
                    ? 'bg-rose-500 border-rose-500 text-white shadow-sm'
                    : 'bg-white border-neutral-200 text-neutral-600 hover:border-rose-300 hover:text-rose-500',
                ].join(' ')}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* 自定义模型输入框 */}
          {selectedModel === 'custom' && (
            <input
              type="text"
              value={customModel}
              onChange={(e) => setCustomModel(e.target.value)}
              placeholder="输入模型名称，例如：claude-3-5-sonnet-20241022"
              className={[
                'mt-3 w-full h-10 px-3.5 rounded-xl',
                'bg-neutral-50 border-2 border-neutral-200',
                'text-neutral-900 text-sm placeholder-neutral-400',
                'transition-all duration-200',
                'focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 focus:bg-white',
              ].join(' ')}
            />
          )}
        </SettingSection>

        {/* ── 错误提示 ──────────────────────────────────────────── */}
        {saveError && (
          <div className="mx-6 mb-4 flex items-center gap-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700">
            <span className="text-base shrink-0">⚠️</span>
            <p className="text-sm flex-1">{saveError}</p>
            <button
              onClick={() => setSaveError(null)}
              className="text-red-400 hover:text-red-600 transition-colors text-sm shrink-0"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── 保存按钮区 ───────────────────────────────────────── */}
        <div className="px-6 py-5 flex items-center gap-4 bg-neutral-50 border-t border-neutral-100">
          <button
            onClick={handleSave}
            disabled={isSaving || saveSuccess}
            className={[
              'h-10 px-6 rounded-xl',
              'bg-gradient-to-r from-rose-500 to-pink-500',
              'hover:from-rose-600 hover:to-pink-600',
              'text-white text-sm font-semibold',
              'shadow-card hover:shadow-glow-sm',
              'transition-all duration-200 active:scale-[0.98]',
              'disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-card disabled:active:scale-100',
              'flex items-center gap-2',
            ].join(' ')}
          >
            {isSaving ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>保存中...</span>
              </>
            ) : (
              <span>保存设置</span>
            )}
          </button>

          {/* 保存成功提示 */}
          {saveSuccess && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-fade-in">
              <span className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs">✓</span>
              已保存
            </span>
          )}
        </div>
      </div>

      {/* ── 当前 AI 配置信息卡片 ───────────────────────────────── */}
      {(hasCustomKey || baseUrl.trim()) && (
        <div className="mt-5 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm">⚙️</span>
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">当前配置</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400 w-16 shrink-0">API URL</span>
              <span className="text-neutral-700 font-mono text-xs truncate">
                {baseUrl.trim() || '默认 (Anthropic)'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400 w-16 shrink-0">模型</span>
              <span className="text-neutral-700 font-mono text-xs">
                {selectedModel === 'custom' ? (customModel.trim() || '—') : selectedModel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-400 w-16 shrink-0">API Key</span>
              <span className="text-neutral-700 font-mono text-xs">
                {hasCustomKey && keyPreview ? keyPreview : hasCustomKey ? '已配置' : '未配置'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  SettingSection — 单个设置项容器
// ─────────────────────────────────────────────────────────────

interface SettingSectionProps {
  label: string
  hint?: string
  isFirst?: boolean
  children: React.ReactNode
}

function SettingSection({ label, hint, isFirst = false, children }: SettingSectionProps) {
  return (
    <div className={['px-6', isFirst ? 'pt-6 pb-5' : 'py-5'].join(' ')}>
      <label className="block text-sm font-semibold text-neutral-800 mb-2.5">
        {label}
      </label>
      {children}
      {hint && (
        <p className="mt-2 text-xs text-neutral-400">{hint}</p>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Divider — 分隔线
// ─────────────────────────────────────────────────────────────

function Divider() {
  return <div className="mx-6 h-px bg-neutral-100" />
}

// ─────────────────────────────────────────────────────────────
//  SettingsSkeleton — 骨架屏
// ─────────────────────────────────────────────────────────────

function SettingsSkeleton() {
  return (
    <div className="max-w-2xl mx-auto animate-pulse">
      {/* 标题骨架 */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-2xl bg-neutral-200" />
        <div className="space-y-2">
          <div className="h-5 w-32 rounded bg-neutral-200" />
          <div className="h-3 w-48 rounded bg-neutral-200" />
        </div>
      </div>

      {/* 卡片骨架 */}
      <div className="bg-white rounded-2xl shadow-card overflow-hidden">
        {[1, 2, 3].map((i) => (
          <div key={i}>
            {i > 1 && <div className="mx-6 h-px bg-neutral-100" />}
            <div className="px-6 py-5">
              <div className="h-3.5 w-20 rounded bg-neutral-200 mb-3" />
              <div className="h-10 w-full rounded-xl bg-neutral-100" />
              {i === 3 && (
                <div className="flex gap-2 mt-3">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-8 w-24 rounded-full bg-neutral-100" />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        <div className="px-6 py-5 bg-neutral-50 border-t border-neutral-100">
          <div className="h-10 w-28 rounded-xl bg-neutral-200" />
        </div>
      </div>
    </div>
  )
}
