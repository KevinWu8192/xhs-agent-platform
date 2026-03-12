'use client'

// ─────────────────────────────────────────────────────────────
//  SetupBanner — 新用户引导 Banner
//  当用户未配置 API Key 且系统也无默认 Key 时，在 Dashboard 顶部显示
// ─────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X, Key } from 'lucide-react'

export function SetupBanner() {
  const [show, setShow] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        // 只有用户没配 key 且系统也没有默认 key 时显示
        if (!data.hasCustomKey && !data.systemHasDefault) {
          setShow(true)
        }
      })
      .catch(() => {}) // 静默失败，不影响正常使用
  }, [])

  if (!show || dismissed) return null

  return (
    <div className="mb-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
      <Key className="h-5 w-5 shrink-0 text-amber-500" />
      <p className="flex-1 text-sm text-amber-800">
        <span className="font-semibold">还差一步！</span>
        {' '}配置你的 AI API Key，即可开始使用所有 Agent 功能
      </p>
      <Link
        href="/settings"
        className="shrink-0 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition-colors"
      >
        前往设置
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors"
        aria-label="关闭提示"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
