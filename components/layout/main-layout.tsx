// ─────────────────────────────────────────────────────────────
//  MainLayout — 主布局容器
//  结构：Sidebar (固定左侧) + Main (右侧滚动区)
//  支持：顶部 Header 区域（面包屑/标题 + 右侧工具栏）
// ─────────────────────────────────────────────────────────────

// NOTE: 此文件为纯 UI 草图，不含路由逻辑或状态管理

interface MainLayoutProps {
  /** 页面主内容 */
  children: React.ReactNode;
  /** 左侧侧边栏（传入 <Sidebar /> 组件） */
  sidebar?: React.ReactNode;
  /** 顶部 Header 左侧内容（标题/面包屑） */
  headerLeft?: React.ReactNode;
  /** 顶部 Header 右侧内容（按钮/搜索/通知） */
  headerRight?: React.ReactNode;
  /** 是否显示 Header */
  showHeader?: boolean;
  /** 内容区背景色 */
  bgColor?: string;
}

export function MainLayout({
  children,
  sidebar,
  headerLeft,
  headerRight,
  showHeader = true,
  bgColor = "bg-[#FFF8F9]",
}: MainLayoutProps) {
  return (
    <div className="flex min-h-screen w-full">
      {/* ── 左侧侧边栏（固定，不滚动）──────────────────────────── */}
      {sidebar && (
        <div className="sticky top-0 h-screen shrink-0">
          {sidebar}
        </div>
      )}

      {/* ── 右侧主区域 ─────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-w-0 ${bgColor}`}>
        {/* 顶部 Header */}
        {showHeader && (
          <PageHeader left={headerLeft} right={headerRight} />
        )}

        {/* 页面内容区（可滚动） */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1200px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PageHeader — 顶部导航栏
//  高度固定 64px，白底，底部细线分隔
// ─────────────────────────────────────────────────────────────

interface PageHeaderProps {
  left?: React.ReactNode;
  right?: React.ReactNode;
}

function PageHeader({ left, right }: PageHeaderProps) {
  return (
    <header
      className={[
        "h-16 shrink-0",
        "flex items-center justify-between",
        "px-6",
        "bg-white",
        "border-b border-neutral-100",
        "sticky top-0 z-header",
        // 玻璃效果（可选）
        // "glass",
      ].join(" ")}
    >
      {/* 左侧：标题 / 面包屑 */}
      <div className="flex items-center gap-3 min-w-0">
        {left ?? <DefaultBreadcrumb />}
      </div>

      {/* 右侧：工具栏 */}
      <div className="flex items-center gap-2 ml-4 shrink-0">
        {right ?? <DefaultHeaderActions />}
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────
//  DefaultBreadcrumb — 默认面包屑占位
// ─────────────────────────────────────────────────────────────

function DefaultBreadcrumb() {
  return (
    <nav className="flex items-center gap-2 text-sm">
      <span className="text-neutral-400">首页</span>
      <span className="text-neutral-300">/</span>
      <span className="text-neutral-800 font-medium">当前页面</span>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────
//  DefaultHeaderActions — 默认右侧工具栏
//  搜索按钮 + 通知铃铛 + 用户头像
// ─────────────────────────────────────────────────────────────

function DefaultHeaderActions() {
  return (
    <div className="flex items-center gap-2">
      {/* 搜索按钮 */}
      <button
        className={[
          "flex items-center gap-2",
          "h-9 px-3 rounded-full",
          "bg-neutral-100 hover:bg-rose-50",
          "text-neutral-500 hover:text-rose-500",
          "text-sm",
          "transition-all duration-150",
        ].join(" ")}
      >
        <span aria-hidden="true">🔍</span>
        <span className="hidden sm:inline text-neutral-400 text-xs">
          搜索... ⌘K
        </span>
      </button>

      {/* 通知铃铛 */}
      <button
        className={[
          "relative",
          "w-9 h-9 rounded-full",
          "flex items-center justify-center",
          "bg-neutral-100 hover:bg-rose-50",
          "text-neutral-500 hover:text-rose-500",
          "transition-all duration-150",
        ].join(" ")}
      >
        <span aria-hidden="true">🔔</span>
        {/* 未读红点 */}
        <span
          className={[
            "absolute top-1.5 right-1.5",
            "w-2 h-2 rounded-full",
            "bg-primary-500 border-2 border-white",
          ].join(" ")}
        />
      </button>

      {/* 用户头像 */}
      <button
        className={[
          "w-9 h-9 rounded-full",
          "bg-gradient-to-br from-rose-400 to-pink-500",
          "flex items-center justify-center",
          "text-white text-sm font-semibold",
          "border-2 border-rose-200 hover:border-rose-300",
          "transition-all duration-150",
          "shadow-sm",
        ].join(" ")}
      >
        小
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PageContainer — 页面内容容器（可单独使用，不含侧边栏）
//  用于不需要整体布局的内嵌内容区
// ─────────────────────────────────────────────────────────────

interface PageContainerProps {
  children: React.ReactNode;
  /** 最大宽度限制 */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  className?: string;
}

const maxWidthMap = {
  sm: "max-w-screen-sm",
  md: "max-w-screen-md",
  lg: "max-w-screen-lg",
  xl: "max-w-screen-xl",
  "2xl": "max-w-[1400px]",
  full: "max-w-full",
};

export function PageContainer({
  children,
  maxWidth = "2xl",
  className = "",
}: PageContainerProps) {
  return (
    <div className={`${maxWidthMap[maxWidth]} mx-auto w-full ${className}`}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  PageTitle — 页面标题组件（含描述）
// ─────────────────────────────────────────────────────────────

interface PageTitleProps {
  title: string;
  description?: string;
  emoji?: string;
  action?: React.ReactNode;
}

export function PageTitle({
  title,
  description,
  emoji,
  action,
}: PageTitleProps) {
  return (
    <div className="flex items-start justify-between mb-8">
      <div className="flex items-center gap-3">
        {emoji && (
          <span className="text-3xl" aria-hidden="true">
            {emoji}
          </span>
        )}
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          {description && (
            <p className="text-sm text-neutral-500 mt-1">{description}</p>
          )}
        </div>
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SectionTitle — 区块标题（页面内各 section 的标题）
// ─────────────────────────────────────────────────────────────

interface SectionTitleProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function SectionTitle({
  title,
  description,
  action,
}: SectionTitleProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2 className="text-base font-semibold text-neutral-800">{title}</h2>
        {description && (
          <p className="text-xs text-neutral-500 mt-0.5">{description}</p>
        )}
      </div>
      {action && (
        <div className="text-sm text-rose-500 font-medium cursor-pointer hover:text-rose-600 transition-colors">
          {action}
        </div>
      )}
    </div>
  );
}
