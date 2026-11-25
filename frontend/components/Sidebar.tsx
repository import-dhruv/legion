"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/services/api";
import { useAppStore } from "@/lib/store";
import { usePolling } from "@/hooks/usePolling";
import { cn } from "@/lib/utils";
import {
  ActivityIcon,
  DashboardIcon,
  FolderIcon,
  PlusIcon,
  ShieldIcon,
  SparkIcon,
  UsersIcon,
} from "@/components/Icons";
import { AuroraText } from "@/components/ui/aurora-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { Dock, DockIcon } from "@/components/ui/dock";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const NAV = [
  { href: "/", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/agents", label: "Agents", icon: UsersIcon },
  { href: "/approvals", label: "Approvals", icon: ShieldIcon },
];

const DOCK = [
  { href: "/", label: "Dashboard", icon: DashboardIcon, exact: true },
  { href: "/projects", label: "Projects", icon: FolderIcon },
  { href: "/projects/new", label: "New Project", icon: PlusIcon },
  { href: "/agents", label: "Agents", icon: UsersIcon },
  { href: "/approvals", label: "Approvals", icon: ShieldIcon },
];

function isCurrent(pathname: string, href: string, exact?: boolean) {
  return exact ? pathname === href : pathname.startsWith(href);
}

export function AppSidebar() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();
  const health = usePolling(() => api.health(), 5000, "health");
  const approvalVersion = useAppStore((state) => state.approvalVersion);
  const pending = usePolling(() => api.approvals("pending"), 5000, `approvals-${approvalVersion}`);
  const pendingCount = pending.data?.length ?? 0;
  const healthOk = health.data?.status === "ok" && !health.error;

  return (
    <Sidebar variant="inset" collapsible="icon" className="border-r border-sidebar-border bg-sidebar">
      <SidebarHeader className="group-data-[collapsible=icon]:justify-center">
        <div className="relative flex h-14 items-center overflow-hidden rounded-lg px-2">
          <span className="pointer-events-none absolute -left-10 -top-12 h-28 w-28 rounded-full bg-black/[0.04] blur-3xl" />
          <Tooltip>
            <TooltipTrigger
              render={
                <Link
                  href="/"
                  onClick={() => setOpenMobile(false)}
                  className="group relative flex items-center gap-3"
                />
              }
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-black/10 bg-foreground text-background shadow-sm transition-transform duration-300 group-hover:scale-105">
                <SparkIcon className="h-[18px] w-[18px]" />
              </span>
              <span className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
                <AuroraText
                  colors={["#171717", "#525252", "#737373", "#171717"]}
                  speed={0.6}
                  className="text-[15px] font-bold tracking-[0.14em]"
                >
                  AI-SE
                </AuroraText>
                <span className="text-[10px] text-muted-foreground">Engineering control plane</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="right">AI-SE control center</TooltipContent>
          </Tooltip>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map((item, index) => {
                const Icon = item.icon;
                const active = isCurrent(pathname, item.href, item.exact);
                return (
                  <BlurFade key={item.href} delay={index * 0.05} direction="right" offset={8} blur="4px">
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        render={<Link href={item.href} onClick={() => setOpenMobile(false)} />}
                        isActive={active}
                        tooltip={item.label}
                        className={cn(
                          "relative",
                          active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground",
                        )}
                      >
                        {active && (
                          <span className="absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-foreground" />
                        )}
                        <Icon className={cn("relative", active ? "text-foreground" : "text-muted-foreground")} />
                        <span className="relative flex-1 group-data-[collapsible=icon]:hidden">{item.label}</span>
                      </SidebarMenuButton>
                      {item.href === "/approvals" && pendingCount > 0 && (
                        <SidebarMenuBadge className="rounded-full bg-foreground px-1 text-[10px] font-semibold text-background">
                          {pendingCount}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  </BlurFade>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Actions</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <BlurFade delay={0.2} direction="right" offset={8} blur="4px">
                <SidebarMenuItem>
                  <SidebarMenuButton
                    render={<Link href="/projects/new" onClick={() => setOpenMobile(false)} />}
                    isActive={isCurrent(pathname, "/projects/new")}
                    tooltip="New Project"
                  >
                    <PlusIcon />
                    <span className="group-data-[collapsible=icon]:hidden">New Project</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </BlurFade>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:px-0">
        {/* Animated Magic UI quick-nav — kept on top of the shadcn sidebar. */}
        <div className="flex justify-center group-data-[collapsible=icon]:hidden">
          <Dock
            className="mt-2 h-12 w-max gap-0.5 border-black/[0.07] bg-white p-1.5 shadow-panel"
            iconSize={30}
            iconMagnification={34}
            iconDistance={80}
          >
            {DOCK.map((item) => {
              const Icon = item.icon;
              const active = isCurrent(pathname, item.href, item.exact);
              return (
                <DockIcon
                  key={item.href}
                  label={item.label}
                  className={cn(active ? "bg-accent" : "hover:bg-muted")}
                >
                  <Link
                    href={item.href}
                    onClick={() => setOpenMobile(false)}
                    aria-label={item.label}
                  >
                    <Icon className={cn("h-4 w-4", active ? "text-foreground" : "text-muted-foreground")} />
                  </Link>
                </DockIcon>
              );
            })}
          </Dock>
        </div>

        <div className="relative mt-3 overflow-hidden rounded-xl border border-border bg-card p-3.5 shadow-panel group-data-[collapsible=icon]:hidden">
          <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full bg-black/[0.04] blur-2xl" />
          <div className="relative flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs font-medium text-foreground">
              <span className="relative flex h-2 w-2 shrink-0 items-center justify-center">
                {healthOk && (
                  <span aria-hidden="true" className="absolute inset-0 animate-pulse-ring rounded-full bg-foreground" />
                )}
                <span className={cn("relative h-2 w-2 rounded-full", healthOk ? "bg-foreground" : "bg-muted-foreground")} />
              </span>
              {healthOk ? "System operational" : health.loading ? "Checking API…" : "API unreachable"}
            </span>
            <ActivityIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="relative mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="truncate capitalize">{health.data?.llm_provider ?? "unknown provider"}</span>
            <Badge
              variant={health.data?.mock_mode ? "outline" : "secondary"}
              className="px-1.5 py-0 text-[10px] font-semibold uppercase tracking-wider"
            >
              {health.data?.mock_mode ? "Mock" : "Production"}
            </Badge>
          </div>
          <p className="relative mt-2 text-[10px] text-muted-foreground">
            {health.data?.agents ?? "—"} agents registered · control plane v1
          </p>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
