export type Tone = "emerald" | "amber" | "rose" | "indigo" | "cyan" | "violet" | "zinc";

/**
 * Monochrome status tones. Tone names are kept for compatibility with the
 * existing API; the palette itself is intentionally black / white / gray.
 */
export const toneClasses: Record<Tone, { text: string; bg: string; dot: string; border: string }> = {
  emerald: {
    text: "text-foreground",
    bg: "bg-secondary",
    dot: "bg-foreground",
    border: "border-border",
  },
  amber: {
    text: "text-muted-foreground",
    bg: "bg-muted",
    dot: "bg-muted-foreground",
    border: "border-border",
  },
  rose: {
    text: "text-destructive",
    bg: "bg-destructive/10",
    dot: "bg-destructive",
    border: "border-destructive/20",
  },
  indigo: {
    text: "text-foreground",
    bg: "bg-accent",
    dot: "bg-foreground/70",
    border: "border-border",
  },
  cyan: {
    text: "text-muted-foreground",
    bg: "bg-muted",
    dot: "bg-foreground/50",
    border: "border-border",
  },
  violet: {
    text: "text-foreground",
    bg: "bg-muted",
    dot: "bg-foreground/60",
    border: "border-border",
  },
  zinc: {
    text: "text-muted-foreground",
    bg: "bg-muted",
    dot: "bg-muted-foreground",
    border: "border-border",
  },
};

export const eventTone = (type: string): Tone => {
  const t = type.toLowerCase();
  if (/fail|error|reject|blocked|run_failed/.test(t)) return "rose";
  if (/complete|success|verified|approv|deploy|pass/.test(t)) return "emerald";
  if (/start|phase|progress|task|working/.test(t)) return "indigo";
  if (/approval|gate|wait|pause/.test(t)) return "amber";
  if (/message|communication/.test(t)) return "cyan";
  return "zinc";
};

export const statusTone = (status: string): Tone => {
  const s = status.toLowerCase();
  if (/complet|verified|done|approved|running|working|active|ok/.test(s)) return "emerald";
  if (/progress|execut|busy/.test(s)) return "indigo";
  if (/await|pending|pause|queued|review|idle/.test(s)) return "amber";
  if (/fail|error|reject|block|stop/.test(s)) return "rose";
  return "zinc";
};

export { cn } from "cn";

export const titleize = (value: string): string =>
  value
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

export const shortId = (value: string, length = 8): string =>
  value.length > length ? `${value.slice(0, length)}…` : value;

export const formatNumber = (value: number): string => new Intl.NumberFormat("en-US").format(value);

export const formatCompact = (value: number): string =>
  new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

export const formatCurrency = (value: number): string => {
  if (value === 0) return "$0.00";
  if (value < 0.01) return `$${value.toFixed(6)}`;
  if (value < 1) return `$${value.toFixed(4)}`;
  return `$${value.toFixed(2)}`;
};

export const formatTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--:--";
  return date.toLocaleTimeString("en-US", { hour12: false });
};

export const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export const relativeTime = (value: string): string => {
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "—";
  const seconds = Math.max(0, Math.floor((Date.now() - time) / 1000));
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const safeJson = (value: unknown): string => {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
};
