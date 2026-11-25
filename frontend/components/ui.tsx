"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { BorderBeam } from "@/components/ui/border-beam";
import { MagicCard } from "@/components/ui/magic-card";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedGradientText } from "@/components/ui/animated-gradient-text";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button as ShadcnButton } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
      gradientColor="rgba(0,0,0,0.06)"
      gradientFrom="#a3a3a3"
      gradientTo="#525252"
      className={cn("rounded-xl shadow-panel", className)}
    >
      {beam && (
        <span className="pointer-events-none absolute inset-0 z-30 opacity-0 transition-opacity duration-500 group-hover:opacity-100">
          <BorderBeam size={90} duration={8} borderWidth={1} colorFrom="#a3a3a3" colorTo="#525252" />
        </span>
      )}
      <Card className="gap-0 rounded-[inherit] border-0 bg-transparent py-0 shadow-none ring-0">
        {(title || action) && (
          <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div className="min-w-0">
              {title && <CardTitle className="text-sm font-semibold tracking-tight">{title}</CardTitle>}
              {subtitle && <CardDescription className="mt-1 text-xs">{subtitle}</CardDescription>}
            </div>
            {action}
          </CardHeader>
        )}
        <CardContent className={bodyClassName ?? "p-5"}>{children}</CardContent>
      </Card>
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
    <Badge
      variant="secondary"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium capitalize shadow-none",
        tone.bg,
        tone.text,
        tone.border,
        className,
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot, live && "animate-pulse-soft")} />}
      {label ?? status.replace(/_/g, " ")}
    </Badge>
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
      gradientColor="rgba(0,0,0,0.07)"
      gradientFrom="#a3a3a3"
      gradientTo="#525252"
      className="min-h-[132px] rounded-xl shadow-panel"
    >
      {beam && (
        <BorderBeam
          size={64}
          duration={9}
          borderWidth={1}
          colorFrom="#a3a3a3"
          colorTo="#525252"
          className="opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      )}
      <Card className="gap-0 rounded-[inherit] border-0 bg-transparent py-0 shadow-none ring-0">
        <CardContent className="relative p-5">
          <div className={cn("pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full blur-3xl transition-opacity duration-500 group-hover:opacity-80", color.bg)} />
          <div className="relative flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardDescription className="text-[10px] font-semibold uppercase tracking-[0.16em]">
                {label}
              </CardDescription>
              <p className="mt-3 flex items-baseline gap-0.5 text-2xl font-semibold tracking-tight text-foreground">
                {prefix && <span className="text-lg text-muted-foreground">{prefix}</span>}
                {tickerValue !== undefined ? (
                  <NumberTicker
                    value={tickerValue}
                    className="text-2xl font-semibold tracking-tight text-foreground"
                  />
                ) : (
                  <span className="tabular-nums">{value}</span>
                )}
                {suffix && <span className="text-lg text-muted-foreground">{suffix}</span>}
              </p>
              {hint && <p className="mt-2 truncate text-xs text-muted-foreground">{hint}</p>}
            </div>
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg border", color.bg, color.border, color.text)}>
              {icon}
            </span>
          </div>
        </CardContent>
      </Card>
    </MagicCard>
  );
}

export function LiveIndicator({ connected, error }: { connected: boolean; error?: string | null }) {
  return (
    <Badge
      variant="outline"
      title={error ?? (connected ? "Stream connected" : "Connecting to stream")}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-medium shadow-none",
        connected ? "border-border bg-secondary text-foreground" : "border-dashed border-border bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          connected ? "bg-foreground animate-pulse-soft" : "bg-muted-foreground animate-pulse-soft",
        )}
      />
      {connected ? "Live" : "Connecting"}
    </Badge>
  );
}

type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> & {
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
  const variants = {
    primary: "bg-foreground text-background hover:bg-foreground/85",
    secondary: "border border-border bg-card text-foreground hover:bg-muted",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
  } as const;

  return (
    <ShadcnButton
      variant={variant === "danger" ? "destructive" : variant === "ghost" ? "ghost" : variant === "primary" ? "default" : "outline"}
      size={size === "sm" ? "sm" : "default"}
      className={cn(
        "font-medium transition-all focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </ShadcnButton>
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
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-muted text-foreground shadow-sm">
          {icon}
        </div>
      )}
      <div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && <p className="mx-auto mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Card
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive shadow-none"
    >
      <span className="flex items-center gap-2">
        <AlertIcon className="h-4 w-4" />
        {message}
      </span>
      {onRetry && (
        <ShadcnButton
          type="button"
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <RefreshIcon className="h-3 w-3" /> Retry
        </ShadcnButton>
      )}
    </Card>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-xs text-muted-foreground">
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <span>{label}</span>
    </div>
  );
}

export function JsonBlock({ value, className }: { value: unknown; className?: string }) {
  return (
    <pre
      className={cn(
        "overflow-x-auto rounded-lg border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed text-foreground",
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
            colorFrom="#737373"
            colorTo="#171717"
            speed={0.85}
            className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em]"
          >
            {eyebrow}
          </AnimatedGradientText>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[28px]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
        <Separator className="mt-5 w-16 bg-foreground/70" />
      </div>
      {action}
    </div>
  );
}
