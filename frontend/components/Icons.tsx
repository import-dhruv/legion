import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
}

const Svg = ({ className, children }: IconProps & { children: ReactNode }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={cn("shrink-0", className ?? "h-4 w-4")}
    aria-hidden="true"
  >
    {children}
  </svg>
);

export const DashboardIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </Svg>
);

export const UsersIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </Svg>
);

export const FolderIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
  </Svg>
);

export const PlusIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);

export const ShieldIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const ActivityIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M3 12h4l3-8 4 16 3-8h4" />
  </Svg>
);

export const ChevronRightIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m9 18 6-6-6-6" />
  </Svg>
);

export const ChevronDownIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
);

export const ArrowLeftIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m12 19-7-7 7-7M19 12H5" />
  </Svg>
);

export const PauseIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M9 5v14M15 5v14" />
  </Svg>
);

export const PlayIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m7 4 13 8-13 8V4Z" />
  </Svg>
);

export const StopIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="5" y="5" width="14" height="14" rx="2" />
  </Svg>
);

export const TerminalIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m4 17 6-6-6-6M12 19h8" />
  </Svg>
);

export const FileIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z" />
    <path d="M14 2v6h6" />
  </Svg>
);

export const MessageIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
  </Svg>
);

export const GitIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="6" cy="6" r="2.5" />
    <circle cx="6" cy="18" r="2.5" />
    <circle cx="18" cy="12" r="2.5" />
    <path d="M6 8.5v7M8.5 6c4 0 3.5 6 7 6" />
  </Svg>
);

export const CheckIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m5 13 4 4L19 7" />
  </Svg>
);

export const XIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Svg>
);

export const ClockIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);

export const BoltIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </Svg>
);

export const CpuIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" />
  </Svg>
);

export const CoinIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="12" cy="12" r="9" />
    <path d="M14.5 9.5a3 3 0 0 0-5 2c0 2 6 1 6 3a3 3 0 0 1-5 2M12 6.5v11" />
  </Svg>
);

export const SparkIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 17l.7 2.3L22 20l-2.3.7L19 23l-.7-2.3L16 20l2.3-.7L19 17Z" />
  </Svg>
);

export const SearchIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </Svg>
);

export const RefreshIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5" />
  </Svg>
);

export const LayersIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
  </Svg>
);

export const MenuIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
);

export const LinkIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.1-1.1" />
  </Svg>
);

export const AlertIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M12 9v4M12 17h.01M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
  </Svg>
);

export const DocIcon = ({ className }: IconProps) => (
  <Svg className={className}>
    <path d="M4 4h11l5 5v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4ZM8 13h8M8 17h5" />
  </Svg>
);
