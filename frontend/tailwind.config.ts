import type { Config } from "tailwindcss";

const hsl = (variable: string) => `hsl(var(${variable}) / <alpha-value>)`;

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
        // Original control-room surfaces, remapped to light neutrals.
        canvas: "#ffffff",
        surface: "#ffffff",
        panel: "#fafafa",
        elevated: "#f5f5f5",
        line: "#e5e5e5",
        // shadcn / Magic UI theme tokens, driven by app/globals.css.
        background: hsl("--background"),
        foreground: hsl("--foreground"),
        card: hsl("--card"),
        "card-foreground": hsl("--card-foreground"),
        popover: hsl("--popover"),
        "popover-foreground": hsl("--popover-foreground"),
        primary: hsl("--primary"),
        "primary-foreground": hsl("--primary-foreground"),
        secondary: hsl("--secondary"),
        "secondary-foreground": hsl("--secondary-foreground"),
        "muted-foreground": hsl("--muted-foreground"),
        accent: hsl("--accent"),
        "accent-foreground": hsl("--accent-foreground"),
        destructive: hsl("--destructive"),
        "destructive-foreground": hsl("--destructive-foreground"),
        border: hsl("--border"),
        input: hsl("--input"),
        ring: hsl("--ring"),
        sidebar: hsl("--sidebar"),
        "sidebar-foreground": hsl("--sidebar-foreground"),
        "sidebar-primary": hsl("--sidebar-primary"),
        "sidebar-primary-foreground": hsl("--sidebar-primary-foreground"),
        "sidebar-accent": hsl("--sidebar-accent"),
        "sidebar-accent-foreground": hsl("--sidebar-accent-foreground"),
        "sidebar-border": hsl("--sidebar-border"),
        "sidebar-ring": hsl("--sidebar-ring"),
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        panel: "0 1px 2px rgba(0,0,0,0.04), 0 16px 40px -32px rgba(0,0,0,0.45)",
        glow: "0 0 0 1px rgba(0,0,0,0.08), 0 12px 32px -18px rgba(0,0,0,0.28)",
        vignette: "inset 0 1px 0 0 rgba(0,0,0,0.03)",
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
        // Magic UI animations — preserved.
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
