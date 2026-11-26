"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ArrowLeftIcon, BoltIcon, CheckIcon, ChevronRightIcon, SparkIcon } from "@/components/Icons";
import { ErrorBanner, Panel } from "@/components/ui";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { AuroraText } from "@/components/ui/aurora-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { PHASES } from "@/components/PhasePipeline";
import { cn, titleize } from "@/lib/utils";
import { api } from "@/services/api";

const EXAMPLES = [
  "Build a task management app with user authentication, a REST API, and a responsive React frontend",
  "Create a CLI tool that scans a codebase for secrets and generates a markdown security report",
  "Implement a real-time analytics dashboard with WebSocket updates and charts",
];

export default function NewProjectPage() {
  const router = useRouter();
  const [requirement, setRequirement] = useState("");
  const [name, setName] = useState("");
  const [autoStart, setAutoStart] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = requirement.trim().length >= 10;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const project = await api.createProject({
        requirement: requirement.trim(),
        ...(name.trim() ? { name: name.trim() } : {}),
        auto_start: autoStart,
      });
      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in">
      <Link href="/projects" className="mb-4 inline-flex items-center gap-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeftIcon className="h-3.5 w-3.5" /> Back to projects
      </Link>

      <BlurFade delay={0.05} offset={10}>
        <div className="relative mb-5 overflow-hidden rounded-2xl border border-black/[0.07] bg-surface/50 p-4 sm:mb-6 sm:p-6">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-muted blur-[90px]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_100%_at_0%_0%,rgba(0, 0, 0,0.12),transparent_70%)]" />
          <p className="relative mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">New project · intake</p>
          <h1 className="relative text-2xl font-semibold tracking-tight sm:text-[28px]">
            <AuroraText colors={["#171717", "#404040", "#737373", "#171717"]} speed={0.6}>
              Describe what you want built.
            </AuroraText>
          </h1>
          <p className="relative mt-2 max-w-2xl text-[13px] leading-relaxed text-muted-foreground">
            Your requirement becomes a full engineering plan. Specialized agents handle discovery, architecture, implementation, testing, review and delivery.
          </p>
        </div>
      </BlurFade>

      {error && <div className="mb-4"><ErrorBanner message={error} /></div>}

      <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Project requirement" subtitle="Be specific about features, constraints and desired outcomes" beam>
          <div className="space-y-5">
            <div>
              <label htmlFor="requirement" className="mb-2 block text-xs font-medium text-foreground">
                What should the organization build? <span className="text-muted-foreground">*</span>
              </label>
              <textarea
                id="requirement"
                value={requirement}
                onChange={(event) => setRequirement(event.target.value)}
                rows={9}
                placeholder="e.g. Build a REST API for a booking system with JWT auth, PostgreSQL storage, rate limiting, tests and Docker deployment…"
                className="w-full resize-y rounded-lg border border-line bg-canvas/70 p-3 text-[13px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:border-border focus:outline-none focus:ring-1 focus:ring-ring/30"
              />
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span className={cn(valid ? "text-muted-foreground" : "text-muted-foreground")}>
                  {valid ? <CheckIcon className="mr-1 inline h-3 w-3" /> : null}
                  {valid ? "Ready to submit" : "At least 10 characters required"}
                </span>
                <span className="tabular-nums text-muted-foreground">{requirement.trim().length} chars</span>
              </div>
            </div>

            <div>
              <label htmlFor="name" className="mb-2 block text-xs font-medium text-foreground">
                Project name <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Auto-generated from your requirement"
                className="h-10 bg-white text-[13px]"
              />
            </div>

            <div className="flex w-full items-center justify-between gap-4 rounded-lg border border-border bg-muted/40 p-3 text-left">
              <span>
                <span className="block text-xs font-medium text-foreground">Start automatically</span>
                <span className="mt-0.5 block text-[11px] text-muted-foreground">Agents begin working as soon as the project is created.</span>
              </span>
              <Switch
                checked={autoStart}
                onCheckedChange={setAutoStart}
                aria-label="Start automatically"
                className="bg-input data-[checked]:bg-foreground"
              />
            </div>

            <ShimmerButton
              type="submit"
              disabled={!valid || submitting}
              shimmerColor="#d4d4d4"
              shimmerDuration="3.5s"
              background="linear-gradient(135deg, #171717, #404040 55%, #a3a3a3)"
              className="w-full py-3 text-[13px] font-semibold shadow-[0_10px_30px_-12px_rgba(0, 0, 0,0.9)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? (
                <><span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-black/30 border-t-white" /> Creating project…</>
              ) : (
                <><SparkIcon className="mr-2 h-4 w-4" /> Create project {autoStart ? "& start agents" : "without starting"}</>
              )}
            </ShimmerButton>
          </div>
        </Panel>

        <BlurFade delay={0.12} offset={12}>
        <div className="space-y-5">
          <Panel title="Try an example" subtitle="Click to fill the requirement field">
            <div className="space-y-2">
              {EXAMPLES.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setRequirement(example)}
                  className="group flex w-full items-start gap-2 rounded-lg border border-line bg-canvas/40 px-3 py-2.5 text-left text-[11px] leading-relaxed text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-accent hover:text-foreground"
                >
                  <ChevronRightIcon className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="flex-1">{example}</span>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="What happens next" subtitle="The organization follows a fixed phase pipeline">
            <ol className="space-y-2.5">
              {PHASES.slice(0, 8).map((phase, index) => (
                <li key={phase} className="flex items-center gap-3 text-[11px]">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-line bg-elevated font-mono text-[9px] text-muted-foreground">
                    {index + 1}
                  </span>
                  <span className="text-muted-foreground">{titleize(phase)}</span>
                  {index === 3 && <BoltIcon className="h-3 w-3 text-muted-foreground" />}
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-line/70 pt-3 text-[10px] leading-relaxed text-muted-foreground">
              Human approval gates are enforced before architecture and deployment. You can pause, resume or stop a run at any time.
            </p>
          </Panel>
        </div>
        </BlurFade>
      </form>
    </div>
  );
}
