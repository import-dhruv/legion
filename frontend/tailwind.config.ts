import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./features/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: "#08090c",
        surface: "#0d0f14",
        panel: "#11141b",
        elevated: "#171a23",
        line: "#232732",
        muted: "#8b91a1",
        // shadcn / Magic UI theme tokens (dark control-room palette)
        background: "#0d0f14",
        foreground: "#e4e4e7",
        card: "#11141b",
        "card-foreground": "#e4e4e7",
        popover: "#11141b",
        "popover-foreground": "#e4e4e7",
        primary: "#6366f1",
        "primary-foreground": "#ffffff",
        secondary: "#171a23",
        "secondary-foreground": "#e4e4e7",
        "muted-foreground": "#8b91a1",
        accent: "#171a23",
        "accent-foreground": "#e4e4e7",
        destructive: "#f43f5e",
        "destructive-foreground": "#fff1f2",
        border: "#232732",
        input: "#232732",
        ring: "#818cf8",
        sidebar: "#0d0f14",
        "sidebar-foreground": "#e4e4e7",
        "sidebar-primary": "#6366f1",
        "sidebar-accent": "#171a23",
        "sidebar-border": "#232732",
        "sidebar-ring": "#818cf8",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 0 0 rgba(255,255,255,0.03) inset, 0 12px 40px -20px rgba(0,0,0,0.9)",
        glow: "0 0 0 1px rgba(99,102,241,0.35), 0 0 28px -8px rgba(99,102,241,0.4)",
        vignette: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        // Magic UI animations
        shine: {
          "0%": { backgroundPosition: "0% 0%" },
          "50%": { backgroundPosition: "100% 100%" },
          "100%": { backgroundPosition: "0% 0%" },
        },
        aurora: {
          "0%": { backgroundPosition: "0% 50%", transform: "rotate(-5deg) scale(0.9)" },
          "25%": { backgroundPosition: "50% 100%", transform: "rotate(5deg) scale(1.1)" },
          "50%": { backgroundPosition: "100% 50%", transform: "rotate(-3deg) scale(0.95)" },
          "75%": { backgroundPosition: "50% 0%", transform: "rotate(3deg) scale(1.05)" },
          "100%": { backgroundPosition: "0% 50%", transform: "rotate(-5deg) scale(0.9)" },
        },
        gradient: {
          to: { backgroundPosition: "var(--bg-size, 300%) 0" },
        },
        meteor: {
          "0%": { transform: "rotate(var(--angle)) translateX(0)", opacity: "1" },
          "70%": { opacity: "1" },
          "100%": { transform: "rotate(var(--angle)) translateX(-500px)", opacity: "0" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(calc(-100% - var(--gap)))" },
        },
        "marquee-vertical": {
          from: { transform: "translateY(0)" },
          to: { transform: "translateY(calc(-100% - var(--gap)))" },
        },
        "shimmer-slide": {
          to: { transform: "translateX(100%)" },
        },
        "spin-around": {
          "0%": { transform: "translateZ(0) rotate(0)" },
          "15%, 35%": { transform: "translateZ(0) rotate(90deg)" },
          "65%, 85%": { transform: "translateZ(0) rotate(270deg)" },
          "100%": { transform: "translateZ(0) rotate(360deg)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height, auto)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height, auto)" },
          to: { height: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 220ms ease-out both",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        shine: "shine var(--duration, 14s) infinite linear",
        aurora: "aurora 8s ease-in-out infinite alternate",
        gradient: "gradient 8s linear infinite",
        meteor: "meteor 5s linear infinite",
        marquee: "marquee var(--duration, 40s) infinite linear",
        "marquee-vertical": "marquee-vertical var(--duration, 40s) linear infinite",
        "shimmer-slide": "shimmer-slide var(--speed, 3s) ease-in-out infinite alternate",
        "spin-around": "spin-around calc(var(--speed, 3s) * 2) infinite linear",
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
