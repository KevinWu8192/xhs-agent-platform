import Link from 'next/link'

// ─────────────────────────────────────────────────────────────
//  404 Not Found Page — 粉红主题
// ─────────────────────────────────────────────────────────────

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FFF8F9] flex items-center justify-center px-6">
      <div className="text-center max-w-md">
        {/* 装饰图标 */}
        <div
          className={[
            'w-28 h-28 rounded-3xl mx-auto mb-8',
            'bg-gradient-to-br from-rose-400 to-pink-500',
            'flex items-center justify-center text-6xl',
            'shadow-card-lg',
          ].join(' ')}
        >
          🌸
        </div>

        {/* 404 数字 */}
        <h1 className="text-7xl font-bold text-rose-400 mb-3 leading-none">
          404
        </h1>

        {/* 标题 */}
        <h2 className="text-2xl font-bold text-neutral-800 mb-3">
          页面走失了 🌸
        </h2>

        {/* 描述 */}
        <p className="text-neutral-500 text-base leading-relaxed mb-8">
          你要找的页面似乎去追赶小红书热点了，暂时找不到它的踪迹。
        </p>

        {/* 按钮组 */}
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className={[
              'inline-flex items-center gap-2',
              'px-6 py-3 rounded-full',
              'bg-gradient-to-r from-rose-500 to-pink-500',
              'text-white text-sm font-semibold',
              'shadow-card hover:shadow-glow',
              'transition-all duration-150 hover:-translate-y-0.5 active:scale-[0.98]',
            ].join(' ')}
          >
            <span>🏠</span>
            <span>返回首页</span>
          </Link>

          <Link
            href="/agents/radar"
            className={[
              'inline-flex items-center gap-2',
              'px-6 py-3 rounded-full',
              'bg-white border-2 border-rose-200',
              'text-rose-500 text-sm font-semibold',
              'shadow-sm hover:shadow-card',
              'transition-all duration-150 hover:-translate-y-0.5',
            ].join(' ')}
          >
            <span>📡</span>
            <span>探索热点</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
