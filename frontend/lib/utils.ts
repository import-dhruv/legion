export type Tone = "emerald" | "amber" | "rose" | "indigo" | "cyan" | "violet" | "zinc";

export const toneClasses: Record<Tone, { text: string; bg: string; dot: string; border: string }> = {
  emerald: {
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    dot: "bg-emerald-400",
    border: "border-emerald-500/25",
  },
  amber: {
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    dot: "bg-amber-400",
    border: "border-amber-500/25",
  },
  rose: {
    text: "text-rose-300",
    bg: "bg-rose-500/10",
    dot: "bg-rose-400",
    border: "border-rose-500/25",
  },
  indigo: {
    text: "text-indigo-300",
    bg: "bg-indigo-500/10",
    dot: "bg-indigo-400",
    border: "border-indigo-500/25",
  },
  cyan: {
    text: "text-cyan-300",
    bg: "bg-cyan-500/10",
    dot: "bg-cyan-400",
    border: "border-cyan-500/25",
  },
  violet: {
    text: "text-violet-300",
    bg: "bg-violet-500/10",
    dot: "bg-violet-400",
    border: "border-violet-500/25",
  },
  zinc: {
    text: "text-zinc-300",
    bg: "bg-zinc-500/10",
    dot: "bg-zinc-400",
    border: "border-zinc-500/25",
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
