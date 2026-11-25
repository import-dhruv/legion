"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn, safeJson, statusTone, toneClasses, type Tone } from "@/lib/utils";
import { AlertIcon, RefreshIcon } from "@/components/Icons";

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-panel/80 shadow-panel backdrop-blur-sm",
        className,
      )}
    >
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/80 px-5 py-4">
          <div className="min-w-0">
            {title && <h2 className="text-sm font-semibold tracking-tight text-zinc-100">{title}</h2>}
            {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName ?? "p-5"}>{children}</div>
    </section>
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
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize",
        tone.bg,
        tone.text,
        tone.border,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} />}
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
}: {
  label: string;
  value: string;
  hint?: string;
  icon: ReactNode;
  tone?: Tone;
}) {
  const color = toneClasses[tone];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-line bg-panel/80 p-5 shadow-panel transition-colors hover:border-zinc-600/70">
      <div className={cn("absolute -right-6 -top-6 h-24 w-24 rounded-full blur-2xl transition-opacity group-hover:opacity-70", color.bg)} />
      <div className="relative flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">{label}</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-zinc-50">{value}</p>
          {hint && <p className="mt-2 truncate text-xs text-zinc-500">{hint}</p>}
        </div>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", color.bg, color.border, color.text)}>
          {icon}
        </div>
      </div>
    </div>
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
          connected ? "bg-emerald-400 animate-pulse-soft" : "bg-amber-400",
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
      "bg-indigo-500 text-white hover:bg-indigo-400 border border-indigo-400/50 shadow-[0_0_18px_-6px_rgba(99,102,241,0.8)]",
    secondary:
      "bg-elevated text-zinc-200 hover:bg-zinc-700/60 hover:text-white border border-line hover:border-zinc-600",
    ghost: "bg-transparent text-zinc-400 hover:bg-white/5 hover:text-zinc-100 border border-transparent",
    danger: "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30",
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
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-elevated text-zinc-500">
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
        "overflow-x-auto rounded-lg border border-line bg-canvas/70 p-3 font-mono text-[11px] leading-relaxed text-zinc-300",
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
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-400">{eyebrow}</p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
