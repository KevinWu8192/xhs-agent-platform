'use client'

// ─────────────────────────────────────────────────────────────
//  Sidebar — 左侧导航栏
//  样式：小红书品牌粉红渐变背景，圆润卡片感
//  包含：Logo 区、导航项、底部用户信息
// ─────────────────────────────────────────────────────────────

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Settings, type LucideIcon } from 'lucide-react'

interface NavItem {
  id: string;
  label: string;
  emoji?: string;
  icon?: LucideIcon;
  href: string;
  badge?: number;
}

interface SidebarProps {
  /** 折叠状态（预留） */
  collapsed?: boolean;
}

const navItems: NavItem[] = [
  {
    id: "dashboard",
    label: "首页",
    emoji: "🏠",
    href: "/dashboard",
  },
  {
    id: "radar",
    label: "信息雷达",
    emoji: "📡",
    href: "/agents/radar",
  },
  {
    id: "script",
    label: "脚本口播",
    emoji: "🎬",
    href: "/agents/script",
  },
  {
    id: "topics",
    label: "选题助手",
    emoji: "💡",
    href: "/agents/topics",
  },
  {
    id: "analytics",
    label: "数据分析",
    emoji: "📊",
    href: "/agents/analytics",
    badge: 3,
  },
];

const bottomNavItems: NavItem[] = [
  {
    id: "settings",
    label: "设置",
    icon: Settings,
    href: "/settings",
  },
  {
    id: "help",
    label: "帮助",
    emoji: "❓",
    href: "/help",
  },
];

function getActiveId(pathname: string): string {
  if (pathname === '/dashboard') return 'dashboard'
  if (pathname.startsWith('/agents/radar')) return 'radar'
  if (pathname.startsWith('/agents/script')) return 'script'
  if (pathname.startsWith('/agents/topics')) return 'topics'
  if (pathname.startsWith('/agents/analytics')) return 'analytics'
  if (pathname.startsWith('/settings')) return 'settings'
  if (pathname.startsWith('/help')) return 'help'
  return 'dashboard'
}

export function Sidebar({
  collapsed = false,
}: SidebarProps) {
  const pathname = usePathname()
  const activeId = getActiveId(pathname)

  return (
    <aside
      className={[
        // 尺寸
        collapsed ? "w-16" : "w-[240px]",
        "min-h-screen",
        "flex flex-col",
        "shrink-0",
        // 背景：品牌粉红渐变
        "bg-gradient-to-b from-[#FF2442] to-[#C41832]",
        // 定位
        "sticky top-0 h-screen",
        // 过渡
        "transition-all duration-300",
        // 层级
        "z-sidebar",
      ].join(" ")}
    >
      {/* ── Logo 区域 ──────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          {/* Logo 图标 */}
          <div
            className={[
              "flex items-center justify-center",
              "w-10 h-10 rounded-2xl",
              "bg-white/20 backdrop-blur-sm",
              "text-2xl",
              "shrink-0",
            ].join(" ")}
          >
            ✨
          </div>

          {/* Logo 文字（展开时显示） */}
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-lg leading-tight whitespace-nowrap">
                XHS 助手
              </p>
              <p className="text-white/60 text-xs whitespace-nowrap">博主创作平台</p>
            </div>
          )}
        </Link>
      </div>

      {/* ── 分隔线 ─────────────────────────────────────────────── */}
      <div className="mx-4 h-px bg-white/15 mb-2" />

      {/* ── 主导航区 ───────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {/* 分组标签（展开时显示） */}
        {!collapsed && (
          <p className="px-3 mb-2 text-white/40 text-xs font-medium uppercase tracking-wider">
            AI Agent
          </p>
        )}

        {navItems.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            isActive={item.id === activeId}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* ── 底部导航 ───────────────────────────────────────────── */}
      <div className="px-3 py-2 space-y-1">
        <div className="mx-1 h-px bg-white/15 mb-2" />
        {bottomNavItems.map((item) => (
          <NavItemButton
            key={item.id}
            item={item}
            isActive={item.id === activeId}
            collapsed={collapsed}
          />
        ))}
      </div>

      {/* ── 用户信息区（由 UserAvatarMenu 接管） ──────────────── */}
      <div className="px-3 pb-5 pt-2">
        <div className="mx-1 h-px bg-white/15 mb-3" />
        <SidebarUserMenu collapsed={collapsed} />
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
//  NavItemButton — 单个导航项（Link 版本）
// ─────────────────────────────────────────────────────────────

interface NavItemButtonProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavItemButton({ item, isActive, collapsed }: NavItemButtonProps) {
  const IconComponent = item.icon

  return (
    <Link
      href={item.href}
      className={[
        "w-full flex items-center rounded-xl",
        collapsed ? "justify-center p-3" : "gap-3 px-3 py-2.5",
        "text-left transition-all duration-150",
        isActive
          ? "bg-white/20 text-white font-medium shadow-sm"
          : "text-white/75 hover:text-white hover:bg-white/10",
      ].join(" ")}
      title={collapsed ? item.label : undefined}
    >
      {/* 图标：lucide icon 或 emoji */}
      {IconComponent ? (
        <IconComponent
          className={[
            "w-5 h-5 shrink-0 transition-transform duration-150",
            isActive ? "scale-110" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      ) : (
        <span
          className={[
            "text-lg shrink-0 transition-transform duration-150",
            isActive ? "scale-110" : "",
          ].join(" ")}
          aria-hidden="true"
        >
          {item.emoji}
        </span>
      )}

      {/* 文字标签（展开时显示） */}
      {!collapsed && (
        <span className="flex-1 text-sm truncate">{item.label}</span>
      )}

      {/* Badge（展开时显示） */}
      {!collapsed && item.badge !== undefined && item.badge > 0 && (
        <span
          className={[
            "flex items-center justify-center",
            "w-5 h-5 rounded-full text-xs font-bold",
            "bg-white text-primary-500",
            "shrink-0",
          ].join(" ")}
        >
          {item.badge > 9 ? "9+" : item.badge}
        </span>
      )}

      {/* 激活指示条（展开时右侧） */}
      {!collapsed && isActive && (
        <div className="w-1 h-4 rounded-full bg-white shrink-0" />
      )}
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────
//  SidebarUserMenu — 侧边栏底部用户区域（动态导入 UserAvatarMenu）
// ─────────────────────────────────────────────────────────────

import { UserAvatarMenu } from '@/components/user-avatar'

interface SidebarUserMenuProps {
  collapsed: boolean;
}

function SidebarUserMenu({ collapsed }: SidebarUserMenuProps) {
  return (
    <div
      className={[
        "flex items-center",
        collapsed ? "justify-center" : "gap-3 px-2",
        "py-2 rounded-xl",
      ].join(" ")}
    >
      <UserAvatarMenu collapsed={collapsed} />
    </div>
  )
}
