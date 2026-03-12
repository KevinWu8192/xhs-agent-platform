// ─────────────────────────────────────────────────────────────
//  Sidebar — 左侧导航栏
//  样式：小红书品牌粉红渐变背景，圆润卡片感
//  包含：Logo 区、导航项、底部用户信息
// ─────────────────────────────────────────────────────────────

// NOTE: 此文件为纯 UI 草图，不含路由逻辑或状态管理
// 实际集成时需替换 "active" 判断为 usePathname() 等

interface NavItem {
  id: string;
  label: string;
  emoji: string;
  href: string;
  badge?: number;
}

interface SidebarProps {
  /** 当前激活的导航项 id */
  activeId?: string;
  /** 用户信息 */
  user?: {
    name: string;
    avatarUrl?: string;
    plan?: "free" | "pro";
  };
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
    emoji: "⚙️",
    href: "/settings",
  },
  {
    id: "help",
    label: "帮助",
    emoji: "❓",
    href: "/help",
  },
];

export function Sidebar({
  activeId = "dashboard",
  user = { name: "小红", plan: "free" },
  collapsed = false,
}: SidebarProps) {
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
        "transition-all duration-300 ease-smooth",
        // 层级
        "z-sidebar",
      ].join(" ")}
    >
      {/* ── Logo 区域 ──────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
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
        </div>
      </div>

      {/* ── 分隔线 ─────────────────────────────────────────────── */}
      <div className="mx-4 h-px bg-white/15 mb-2" />

      {/* ── 主导航区 ───────────────────────────────────────────── */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-hide">
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

      {/* ── 用户信息区 ─────────────────────────────────────────── */}
      <div className="px-3 pb-5 pt-2">
        <div className="mx-1 h-px bg-white/15 mb-3" />

        <div
          className={[
            "flex items-center",
            collapsed ? "justify-center" : "gap-3 px-2",
            "py-2 rounded-xl",
            "hover:bg-white/10 transition-colors duration-150 cursor-pointer",
          ].join(" ")}
        >
          {/* 用户头像 */}
          <UserAvatar name={user.name} avatarUrl={user.avatarUrl} />

          {/* 用户信息文字（展开时显示） */}
          {!collapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={[
                    "inline-flex items-center",
                    "px-1.5 py-0.5 rounded-full text-2xs font-medium",
                    user.plan === "pro"
                      ? "bg-yellow-400/20 text-yellow-300"
                      : "bg-white/15 text-white/70",
                  ].join(" ")}
                >
                  {user.plan === "pro" ? "✦ Pro" : "Free"}
                </span>
              </div>
            </div>
          )}

          {/* 更多按钮 */}
          {!collapsed && (
            <button className="text-white/50 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10">
              <span className="text-sm">•••</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────────────────────
//  NavItemButton — 单个导航项
// ─────────────────────────────────────────────────────────────

interface NavItemButtonProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
}

function NavItemButton({ item, isActive, collapsed }: NavItemButtonProps) {
  return (
    <button
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
      {/* Emoji 图标 */}
      <span
        className={[
          "text-lg shrink-0 transition-transform duration-150",
          isActive ? "scale-110" : "group-hover:scale-105",
        ].join(" ")}
        aria-hidden="true"
      >
        {item.emoji}
      </span>

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
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
//  UserAvatar — 用户头像
// ─────────────────────────────────────────────────────────────

interface UserAvatarProps {
  name: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
}

function UserAvatar({ name, avatarUrl, size = "md" }: UserAvatarProps) {
  const sizeMap = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const initials = name
    .slice(0, 2)
    .split("")
    .join("");

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${sizeMap[size]} rounded-full object-cover shrink-0 border-2 border-white/30`}
      />
    );
  }

  return (
    <div
      className={[
        sizeMap[size],
        "rounded-full shrink-0",
        "bg-white/25 border border-white/30",
        "flex items-center justify-center",
        "font-semibold text-white",
      ].join(" ")}
    >
      {initials}
    </div>
  );
}
