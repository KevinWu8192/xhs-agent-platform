import { type HTMLAttributes, forwardRef } from "react";

// ─────────────────────────────────────────────────────────────
//  Card — 统一卡片组件
//  支持变体：default（白底）| gradient（渐变）| subtle（浅粉底）
//  所有卡片统一使用 rounded-2xl + 柔和粉红阴影 + hover 动效
// ─────────────────────────────────────────────────────────────

type CardVariant = "default" | "gradient" | "subtle" | "outline";
type CardSize = "sm" | "md" | "lg";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  size?: CardSize;
  /** 禁用 hover 动效 */
  noHover?: boolean;
  /** 点击时是否有按压感 */
  pressable?: boolean;
}

const variantClasses: Record<CardVariant, string> = {
  default: "bg-white shadow-card hover:shadow-card-hover",
  gradient:
    "bg-gradient-to-br from-rose-400 to-pink-500 text-white shadow-card hover:shadow-card-lg",
  subtle: "bg-rose-50 shadow-none hover:bg-rose-100",
  outline: "bg-white border border-neutral-200 shadow-none hover:border-rose-300",
};

const sizeClasses: Record<CardSize, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = "default",
      size = "md",
      noHover = false,
      pressable = false,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = [
      // 基础结构
      "rounded-2xl",
      // 变体样式
      variantClasses[variant],
      // 尺寸（内边距）
      sizeClasses[size],
      // 过渡动画
      !noHover ? "transition-all duration-200" : "",
      // hover 上浮（仅 default/outline 变体）
      !noHover && (variant === "default" || variant === "outline")
        ? "hover:-translate-y-0.5"
        : "",
      // 按压感
      pressable ? "active:scale-[0.98] cursor-pointer" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div ref={ref} className={baseClasses} {...props}>
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";

// ─────────────────────────────────────────────────────────────
//  CardHeader — 卡片头部（标题 + 副标题 + 右侧操作区）
// ─────────────────────────────────────────────────────────────

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  action?: React.ReactNode;
}

export function CardHeader({
  action,
  className = "",
  children,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={`flex items-start justify-between mb-4 ${className}`}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {action && (
        <div className="flex items-center gap-2 ml-4 shrink-0">{action}</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CardTitle — 卡片标题
// ─────────────────────────────────────────────────────────────

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: "h1" | "h2" | "h3" | "h4";
}

export function CardTitle({
  as: Tag = "h3",
  className = "",
  children,
  ...props
}: CardTitleProps) {
  return (
    <Tag
      className={`text-lg font-semibold text-neutral-900 leading-snug ${className}`}
      {...props}
    >
      {children}
    </Tag>
  );
}

// ─────────────────────────────────────────────────────────────
//  CardDescription — 卡片描述文字
// ─────────────────────────────────────────────────────────────

export function CardDescription({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={`text-sm text-neutral-500 mt-1 line-clamp-2 ${className}`}
      {...props}
    >
      {children}
    </p>
  );
}

// ─────────────────────────────────────────────────────────────
//  CardContent — 卡片正文区
// ─────────────────────────────────────────────────────────────

export function CardContent({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  CardFooter — 卡片底部操作区
// ─────────────────────────────────────────────────────────────

export function CardFooter({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-between mt-4 pt-4 border-t border-neutral-100 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  AgentCard — Agent 专用渐变卡片（Dashboard 用）
// ─────────────────────────────────────────────────────────────

const agentGradients = [
  "from-rose-400 to-pink-500",
  "from-pink-400 to-rose-500",
  "from-rose-500 to-primary-600",
  "from-primary-300 to-rose-400",
] as const;

interface AgentCardProps extends HTMLAttributes<HTMLDivElement> {
  emoji: string;
  title: string;
  description: string;
  gradientIndex?: 0 | 1 | 2 | 3;
  onStart?: () => void;
}

export function AgentCard({
  emoji,
  title,
  description,
  gradientIndex = 0,
  onStart,
  className = "",
  ...props
}: AgentCardProps) {
  const gradient = agentGradients[gradientIndex];

  return (
    <div
      className={[
        `bg-gradient-to-br ${gradient}`,
        "rounded-2xl p-6 text-white",
        "shadow-card hover:shadow-card-hover",
        "transition-all duration-200 hover:-translate-y-1",
        "cursor-pointer group",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...props}
    >
      {/* Emoji 图标 */}
      <div className="text-4xl mb-4 group-hover:scale-110 transition-transform duration-200">
        {emoji}
      </div>

      {/* 标题 */}
      <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>

      {/* 一句话描述 */}
      <p className="text-sm text-white/80 leading-relaxed line-clamp-2 mb-5">
        {description}
      </p>

      {/* 开始使用按钮 */}
      <button
        onClick={onStart}
        className={[
          "w-full py-2.5 rounded-full",
          "bg-white/20 hover:bg-white/30",
          "text-white text-sm font-medium",
          "border border-white/30",
          "transition-all duration-150",
          "active:scale-[0.98]",
        ].join(" ")}
      >
        开始使用
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SkeletonCard — 骨架屏卡片（加载状态用）
// ─────────────────────────────────────────────────────────────

interface SkeletonCardProps {
  lines?: number;
  showHeader?: boolean;
}

export function SkeletonCard({ lines = 3, showHeader = true }: SkeletonCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-6 animate-pulse">
      {showHeader && (
        <div className="flex items-center gap-3 mb-4">
          <div className="skeleton rounded-full w-10 h-10" />
          <div className="flex-1 space-y-2">
            <div className="skeleton rounded h-4 w-2/3" />
            <div className="skeleton rounded h-3 w-1/3" />
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="skeleton rounded h-3"
            style={{ width: `${100 - i * 12}%` }}
          />
        ))}
      </div>
    </div>
  );
}
