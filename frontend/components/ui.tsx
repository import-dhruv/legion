"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import { cn, safeJson, statusTone, toneClasses, type Tone } from "@/lib/utils";
import { AlertIcon, RefreshIcon } from "@/components/Icons";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  beam = false,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  beam?: boolean;
}) {
  return (
    <MagicCard
      gradientColor="rgba(99,102,241,0.10)"
      gradientFrom="#6366f1"
      gradientTo="#22d3ee"
      className={cn("rounded-xl shadow-panel", className)}
    >
      {beam && (
        <span className="pointer-events-none absolute inset-0 z-30 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <BorderBeam size={90} duration={8} borderWidth={1} colorFrom="#a78bfa" colorTo="#22d3ee" />
        </span>
      )}
      <div className="relative z-40">
        {(title || action) && (
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
            <div className="min-w-0">
              {title && <h2 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h2>}
              {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
            </div>
            {action}
          </header>
        )}
        <div className={bodyClassName ?? "p-5"}>{children}</div>
      </div>
    </MagicCard>
  );
}

export function StatusBadge({
  status,
  label,
  dot = true,
  className,
}: {
  status: string;
  label?: string;
  dot?: boolean;
  className?: string;
}) {
  const tone = toneClasses[statusTone(status)];
  const live = /running|working|execut|active|in_progress/i.test(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        tone.bg,
        tone.text,
        tone.border,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot, live && "animate-pulse-soft")} />}
      {label ?? status.replace(/_/g, " ")}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "indigo",
  tickerValue,
  prefix,
  suffix,
  beam = false,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
  tickerValue?: number;
  prefix?: string;
  suffix?: string;
  beam?: boolean;
}) {
  const color = toneClasses[tone];
  return (
    <MagicCard
      gradientColor="rgba(129,140,248,0.12)"
      gradientFrom="#a78bfa"
      gradientTo="#22d3ee"
      className="min-h-[132px] rounded-xl shadow-panel"
    >
      {beam && (
        <BorderBeam
          size={64}
          duration={9}
          borderWidth={1}
          colorFrom="#a78bfa"
          colorTo="#22d3ee"
          className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}
      <div className="relative z-40 p-5">
        <div className={cn("pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-80", color.bg)} />
        <div className="relative flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
            <p className="mt-3 flex items-baseline gap-0.5 text-2xl font-semibold tracking-tight text-zinc-50">
              {prefix && <span className="text-lg text-zinc-400">{prefix}</span>}
              {tickerValue !== undefined ? (
                <NumberTicker
                  value={tickerValue}
                  className="text-2xl font-semibold tracking-tight text-zinc-50"
                />
              ) : (
                <span className="tabular-nums">{value}</span>
              )}
              {suffix && <span className="text-lg text-zinc-400">{suffix}</span>}
            </p>
            {hint && <p className="mt-2 truncate text-xs text-zinc-500">{hint}</p>}
          </div>
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border backdrop-blur-sm", color.bg, color.border, color.text)}>
            {icon}
          </div>
        </div>
      </div>
    </MagicCard>
  );
}

export function LiveIndicator({ connected, error }: { connected: boolean; error?: string | null }) {
  return (
    <span
      title={error ?? (connected ? "Stream connected" : "Connecting to stream")}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        connected
          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
          : "border-amber-500/25 bg-amber-500/10 text-amber-300",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connected ? "bg-emerald-400 animate-pulse-soft shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400 animate-pulse-soft",
        )}
      />
      {connected ? "Live" : "Connecting"}
    </span>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  const variants: Record<NonNullable<ButtonProps["variant"]>, string> = {
    primary:
      "border border-indigo-400/50 bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_22px_-8px_rgba(129,140,248,0.9)] hover:from-indigo-400 hover:to-violet-400",
    secondary:
      "border border-line bg-elevated text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700/60 hover:text-white",
    ghost: "border border-transparent bg-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
    danger: "border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20",
  };
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/60 disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-3.5 py-2 text-[13px]",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-4 py-14 text-center">
      {icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-indigo-400/20 bg-indigo-500/10 text-indigo-300 shadow-[0_0_24px_-12px_rgba(129,140,248,0.9)]">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-zinc-200">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-xs text-rose-200">
      <span className="flex items-center gap-2">
        <AlertIcon className="h-4 w-4" />
        {message}
      </span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-md border border-rose-400/30 px-2 py-1 font-medium hover:bg-rose-500/20"
        >
          <RefreshIcon className="h-3 w-3" /> Retry
        </button>
      )}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-xs text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-indigo-400" />
      {label}
    </div>
  );
}

export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-lg border border-white/[0.06] bg-canvas/70 p-3 font-mono text-[11px] leading-relaxed text-zinc-300",
        className,
      )}
    >
      {safeJson(value)}
    </pre>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <AnimatedGradientText
            colorFrom="#a78bfa"
            colorTo="#22d3ee"
            speed={0.85}
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          >
            {eyebrow}
          </AnimatedGradientText>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
