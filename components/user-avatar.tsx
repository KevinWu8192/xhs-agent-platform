'use client'

// ─────────────────────────────────────────────────────────────
//  UserAvatarMenu — 用户头像 + 退出登录下拉菜单
//  用于 Sidebar 底部用户区域
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface UserAvatarMenuProps {
  collapsed?: boolean
}

export function UserAvatarMenu({ collapsed = false }: UserAvatarMenuProps) {
  const router = useRouter()
  const supabase = createClient()
  const [isOpen, setIsOpen] = useState(false)
  const [userEmail, setUserEmail] = useState<string>('')
  const [displayName, setDisplayName] = useState<string>('')
  const [isSigningOut, setIsSigningOut] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        setUserEmail(user.email)
        setDisplayName(user.email.split('@')[0])
      }
    }
    loadUser()
  }, [supabase])

  // Close menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function handleSignOut() {
    setIsSigningOut(true)
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      setIsSigningOut(false)
    }
  }

  const initials = displayName ? displayName.slice(0, 2) : '?'

  if (collapsed) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-semibold text-white text-sm hover:opacity-90 transition-opacity"
          title={displayName}
        >
          {initials}
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-2xl shadow-card-lg border border-neutral-100 overflow-hidden z-modal">
            <div className="px-4 py-3 border-b border-neutral-100">
              <p className="text-sm font-medium text-neutral-800 truncate">{displayName}</p>
              <p className="text-xs text-neutral-400 truncate">{userEmail}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full px-4 py-3 text-left text-sm text-rose-500 hover:bg-rose-50 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <span>🚪</span>
              <span>{isSigningOut ? '退出中...' : '退出登录'}</span>
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="relative w-full" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-rose-50 transition-colors duration-150 cursor-pointer"
      >
        {/* 用户头像 */}
        <div className="w-9 h-9 rounded-full shrink-0 bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center font-semibold text-white text-sm">
          {initials}
        </div>

        {/* 用户信息文字 */}
        <div className="flex-1 min-w-0 overflow-hidden text-left">
          <p className="text-neutral-800 text-sm font-medium truncate">{displayName || '加载中...'}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500">
              Free
            </span>
          </div>
        </div>

        {/* 更多按钮 */}
        <span className="text-neutral-400 hover:text-neutral-600 transition-colors p-1 rounded-lg hover:bg-neutral-100 text-sm">
          •••
        </span>
      </button>

      {/* 下拉菜单 */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-full bg-white rounded-2xl shadow-card-lg border border-neutral-100 overflow-hidden z-modal">
          <div className="px-4 py-3 border-b border-neutral-100">
            <p className="text-sm font-medium text-neutral-800 truncate">{displayName}</p>
            <p className="text-xs text-neutral-400 truncate">{userEmail}</p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="w-full px-4 py-3 text-left text-sm text-rose-500 hover:bg-rose-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <span>🚪</span>
            <span>{isSigningOut ? '退出中...' : '退出登录'}</span>
          </button>
        </div>
      )}
    </div>
  )
}
