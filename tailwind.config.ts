import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // ── XHS 品牌主色：小红书粉红系 ──────────────────────────────
        primary: {
          DEFAULT: "#FF2442",   // 小红书官方红粉色
          50:  "#FFF0F2",       // 极浅底色，用于页面背景
          100: "#FFD6DB",       // 浅粉，用于 tag、badge 背景
          200: "#FFB3BC",       // 浅粉，用于 hover 状态
          300: "#FF8095",       // 中粉，用于次级按钮
          400: "#FF4D69",       // 深粉，用于 active 状态
          500: "#FF2442",       // 主色，用于主按钮、重点文字
          600: "#E81F3C",       // 深红粉，用于按钮 hover
          700: "#C41832",       // 更深，用于按钮 active
          800: "#9A1226",       // 极深，辅助文字
          900: "#6E0D1B",       // 最深，不常用
          foreground: "#FFFFFF",
        },

        // ── 粉玫瑰辅助色（渐变搭配用）────────────────────────────────
        rose: {
          50:  "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#FB7185",
          500: "#F43F5E",
          600: "#E11D48",
          700: "#BE123C",
          800: "#9F1239",
          900: "#881337",
        },

        // ── 暖粉 / 珊瑚辅助色 ─────────────────────────────────────────
        pink: {
          50:  "#FDF2F8",
          100: "#FCE7F3",
          200: "#FBCFE8",
          300: "#F9A8D4",
          400: "#F472B6",
          500: "#EC4899",
          600: "#DB2777",
          700: "#BE185D",
          800: "#9D174D",
          900: "#831843",
        },

        // ── 中性色系 ───────────────────────────────────────────────────
        neutral: {
          0:   "#FFFFFF",
          50:  "#FAFAFA",
          100: "#F5F5F5",
          200: "#E5E5E5",
          300: "#D4D4D4",
          400: "#A3A3A3",
          500: "#737373",
          600: "#525252",
          700: "#404040",
          800: "#262626",
          900: "#171717",
          950: "#0A0A0A",
        },

        // ── 语义色 ─────────────────────────────────────────────────────
        success: {
          DEFAULT: "#10B981",
          light:   "#D1FAE5",
        },
        warning: {
          DEFAULT: "#F59E0B",
          light:   "#FEF3C7",
        },
        error: {
          DEFAULT: "#EF4444",
          light:   "#FEE2E2",
        },
        info: {
          DEFAULT: "#3B82F6",
          light:   "#DBEAFE",
        },

        // ── 页面背景 ───────────────────────────────────────────────────
        background: {
          DEFAULT: "#FFF8F9",    // 主背景：极浅粉白
          card:    "#FFFFFF",    // 卡片背景
          subtle:  "#FFF0F2",   // 区域背景
        },

        // ── 文字色 ────────────────────────────────────────────────────
        text: {
          primary:   "#1A1A1A",  // 主标题
          secondary: "#525252",  // 副标题/描述
          tertiary:  "#A3A3A3",  // 占位符/禁用
          inverse:   "#FFFFFF",  // 深色背景上的文字
          brand:     "#FF2442",  // 品牌色文字
        },

        // ── shadcn/ui 兼容变量 ─────────────────────────────────────────
        border:     "hsl(var(--border))",
        input:      "hsl(var(--input))",
        ring:       "hsl(var(--ring))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT:    "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },

      // ── 圆角规范 ─────────────────────────────────────────────────────
      // 主推 2xl / 3xl，打造圆润现代感
      borderRadius: {
        none:  "0px",
        sm:    "6px",
        DEFAULT: "8px",
        md:    "10px",
        lg:    "14px",
        xl:    "16px",
        "2xl": "20px",   // 卡片默认圆角
        "3xl": "24px",   // 大卡片 / 模态框
        "4xl": "32px",   // 超大圆角装饰
        full:  "9999px", // 胶囊按钮 / 头像
      },

      // ── 字体 ─────────────────────────────────────────────────────────
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "PingFang SC",
          "Hiragino Sans GB",
          "Microsoft YaHei",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Consolas",
          "Monaco",
          "monospace",
        ],
      },

      // ── 字体大小 ──────────────────────────────────────────────────────
      fontSize: {
        "2xs": ["10px", { lineHeight: "14px" }],
        xs:    ["12px", { lineHeight: "16px" }],
        sm:    ["13px", { lineHeight: "20px" }],
        base:  ["14px", { lineHeight: "22px" }],
        md:    ["15px", { lineHeight: "22px" }],
        lg:    ["16px", { lineHeight: "24px" }],
        xl:    ["18px", { lineHeight: "28px" }],
        "2xl": ["20px", { lineHeight: "30px" }],
        "3xl": ["24px", { lineHeight: "36px" }],
        "4xl": ["28px", { lineHeight: "40px" }],
        "5xl": ["32px", { lineHeight: "44px" }],
        "6xl": ["40px", { lineHeight: "52px" }],
      },

      // ── 间距系统（8px 基准）────────────────────────────────────────────
      spacing: {
        "0":   "0px",
        "0.5": "2px",
        "1":   "4px",
        "1.5": "6px",
        "2":   "8px",    // 基础间距
        "2.5": "10px",
        "3":   "12px",
        "3.5": "14px",
        "4":   "16px",   // 卡片内边距小号
        "5":   "20px",
        "6":   "24px",   // 卡片内边距默认
        "7":   "28px",
        "8":   "32px",   // 区块间距
        "9":   "36px",
        "10":  "40px",
        "11":  "44px",
        "12":  "48px",   // 大区块间距
        "14":  "56px",
        "16":  "64px",
        "18":  "72px",
        "20":  "80px",
        "24":  "96px",
        "28":  "112px",
        "32":  "128px",
        sidebar:     "240px",  // 侧边栏宽度
        "sidebar-sm": "64px",  // 折叠侧边栏宽度
      },

      // ── 阴影（柔和、粉调）─────────────────────────────────────────────
      boxShadow: {
        // 卡片阴影系列
        card:       "0 1px 4px 0 rgba(255, 36, 66, 0.06), 0 2px 8px 0 rgba(0, 0, 0, 0.04)",
        "card-md":  "0 2px 8px 0 rgba(255, 36, 66, 0.08), 0 4px 16px 0 rgba(0, 0, 0, 0.06)",
        "card-lg":  "0 4px 16px 0 rgba(255, 36, 66, 0.10), 0 8px 32px 0 rgba(0, 0, 0, 0.08)",
        "card-hover": "0 6px 24px 0 rgba(255, 36, 66, 0.14), 0 12px 40px 0 rgba(0, 0, 0, 0.10)",

        // 粉红光晕（按钮、重点元素）
        glow:       "0 0 20px rgba(255, 36, 66, 0.25)",
        "glow-sm":  "0 0 10px rgba(255, 36, 66, 0.20)",
        "glow-lg":  "0 0 40px rgba(255, 36, 66, 0.30)",

        // 通用阴影
        sm:    "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        DEFAULT: "0 1px 3px 0 rgba(0, 0, 0, 0.10), 0 1px 2px -1px rgba(0, 0, 0, 0.10)",
        md:    "0 4px 6px -1px rgba(0, 0, 0, 0.10), 0 2px 4px -2px rgba(0, 0, 0, 0.10)",
        lg:    "0 10px 15px -3px rgba(0, 0, 0, 0.10), 0 4px 6px -4px rgba(0, 0, 0, 0.10)",
        xl:    "0 20px 25px -5px rgba(0, 0, 0, 0.10), 0 8px 10px -6px rgba(0, 0, 0, 0.10)",
        inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)",
        none:  "none",
      },

      // ── 动画 ──────────────────────────────────────────────────────────
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": {
          "0%":   { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(8px)" },
        },
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%":      { opacity: "0.5" },
        },
        "bounce-gentle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-4px)" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.3s ease-out",
        "fade-out":       "fade-out 0.3s ease-in",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "scale-in":       "scale-in 0.2s ease-out",
        shimmer:          "shimmer 2s linear infinite",
        "pulse-gentle":   "pulse 2s ease-in-out infinite",
        "bounce-gentle":  "bounce-gentle 1.5s ease-in-out infinite",
      },

      // ── 渐变背景（Agent 卡片用）────────────────────────────────────────
      backgroundImage: {
        // Agent 卡片渐变
        "gradient-rose":    "linear-gradient(135deg, #FF2442 0%, #FF6B81 100%)",
        "gradient-pink":    "linear-gradient(135deg, #F472B6 0%, #EC4899 100%)",
        "gradient-coral":   "linear-gradient(135deg, #FF6B6B 0%, #FF2442 100%)",
        "gradient-warm":    "linear-gradient(135deg, #FFA07A 0%, #FF6B81 100%)",
        // 页面背景
        "gradient-page":    "linear-gradient(180deg, #FFF8F9 0%, #FFFFFF 100%)",
        "gradient-sidebar": "linear-gradient(180deg, #FF2442 0%, #C41832 100%)",
        // 骨架屏动画
        "shimmer-gradient": "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
      },

      // ── 最小/最大高度 ─────────────────────────────────────────────────
      minHeight: {
        screen:  "100vh",
        "0":     "0",
        full:    "100%",
        "card":  "120px",
        "hero":  "320px",
      },

      // ── z-index ───────────────────────────────────────────────────────
      zIndex: {
        sidebar:  "40",
        header:   "50",
        overlay:  "60",
        modal:    "70",
        toast:    "80",
        tooltip:  "90",
      },
    },
  },
  plugins: [
    // require("tailwindcss-animate"),  // uncomment when installed
  ],
};

export default config;
