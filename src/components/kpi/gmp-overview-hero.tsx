"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import {
  ActivityIcon,
  BadgeCheckIcon,
  CalendarClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClipboardCheckIcon,
  FileWarningIcon,
  InfinityIcon,
  ShieldCheckIcon,
  TargetIcon,
} from "lucide-react";
import { useGMPOverview } from "@/hooks/useGMPReports";
import { cn } from "@/lib/utils";
import type { GMPOverviewGroup, GMPOverviewItem } from "@/types/gmp-api";

type Scope = GMPOverviewItem["scope"];

const scopeStyles: Record<Scope, { label: string; short: string; description: string; icon: ReactNode; chip: string; dot: string; bar: string }> = {
  Local: {
    label: "Local",
    short: "Local manufacturers",
    description: "Local pharmaceutical manufacturing facilities",
    icon: <TargetIcon className="size-4" />,
    chip: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
  },
  Abroad: {
    label: "Abroad",
    short: "Manufacturers abroad",
    description: "Pharmaceutical manufacturing facilities abroad",
    icon: <ShieldCheckIcon className="size-4" />,
    chip: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
    dot: "bg-emerald-500",
    bar: "bg-emerald-500",
  },
  Waiver: {
    label: "Abroad waiver",
    short: "Inspection waiver",
    description: "GMP inspection waiver applications for facilities abroad",
    icon: <ClipboardCheckIcon className="size-4" />,
    chip: "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-300",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
  },
};

const groupIcons: Record<string, ReactNode> = {
  approved: <BadgeCheckIcon className="size-5" />,
  assigned: <CalendarClockIcon className="size-5" />,
  capa: <FileWarningIcon className="size-5" />,
};

const formatCount = (value: number) => new Intl.NumberFormat("en").format(Math.round(value));

const reducedMotionQuery = "(prefers-reduced-motion: reduce)";
const subscribeReducedMotion = (onChange: () => void) => {
  const query = window.matchMedia(reducedMotionQuery);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeReducedMotion, () => window.matchMedia(reducedMotionQuery).matches, () => false);
}

/** Counts up from zero on mount; remount it (via key) to replay. */
function AnimatedCount({ value, animate }: { value: number; animate: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!animate) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - start) / 900, 1);
      setShown(value * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, value]);
  return <>{formatCount(animate ? shown : value)}</>;
}

function ScopeTile({ item, total, loading, active, animate }: { item: GMPOverviewItem; total?: number; loading: boolean; active: boolean; animate: boolean }) {
  const style = scopeStyles[item.scope];
  const share = item.value !== undefined && total ? (item.value / total) * 100 : 0;
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/60">
      <p className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <span className={cn("size-2 rounded-full", style.dot)} aria-hidden="true" />
        {style.label}
      </p>
      {loading ? (
        <div className="mt-1 h-9 w-20 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800" />
      ) : item.value !== undefined ? (
        <p className="mt-1 text-3xl font-bold tracking-tight text-slate-950 tabular-nums dark:text-white">
          <AnimatedCount key={active ? "active" : "idle"} value={item.value} animate={active && animate} />
        </p>
      ) : (
        <p className="mt-1 text-3xl font-bold text-slate-500 dark:text-slate-400" title={item.error}>
          —<span className="ml-2 align-middle text-xs font-medium text-slate-600 dark:text-slate-300">Unavailable</span>
        </p>
      )}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden="true">
        <div className={cn("h-full rounded-full transition-[width] duration-700 motion-reduce:transition-none", style.bar)} style={{ width: loading ? "0%" : `${share}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-slate-600 tabular-nums dark:text-slate-300">{loading || item.value === undefined || !total ? " " : `${share.toFixed(0)}% of total`}</p>
    </div>
  );
}

function OverviewSlide({ group, loading, active, animate }: { group: GMPOverviewGroup; loading: boolean; active: boolean; animate: boolean }) {
  return (
    <div className="w-full shrink-0 px-0.5" aria-hidden={!active} inert={!active}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/25">{groupIcons[group.id]}</span>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950 dark:text-white">{group.title}</h2>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">{group.caption}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Total</p>
          {loading ? (
            <div className="mt-1 ml-auto h-10 w-24 animate-pulse rounded-lg bg-violet-100 dark:bg-violet-950" />
          ) : (
            <p className="text-4xl font-bold tracking-[-0.04em] text-violet-700 tabular-nums dark:text-violet-300">
              {group.total !== undefined ? <AnimatedCount key={active ? "active" : "idle"} value={group.total} animate={active && animate} /> : "—"}
            </p>
          )}
        </div>
      </div>
      <div className={cn("mt-4 grid gap-3", group.items.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2")}>
        {group.items.map((item) => (
          <ScopeTile key={item.reportId} item={item} total={group.total} loading={loading} active={active} animate={animate} />
        ))}
      </div>
    </div>
  );
}

/** GMP page hero: rotating all-time overview counts. Independent of the page date filters. */
export function GMPOverviewHero() {
  const { groups, loading } = useGMPOverview();
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const paused = hovered || focused;
  const count = groups.length;
  const activeGroup = groups[index];
  const activeScopes = new Set(activeGroup?.items.map((item) => item.scope));

  const go = (next: number) => setIndex(((next % count) + count) % count);

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-violet-200/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_48%,#f1edff_100%)] shadow-[0_30px_80px_-55px_rgba(76,29,149,0.7)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111024_52%,#18112e_100%)]">
      <div className="pointer-events-none absolute -right-24 -top-32 size-[26rem] rounded-full border border-violet-300/30" />
      <div className="pointer-events-none absolute -right-6 -top-24 size-[20rem] rounded-full border border-fuchsia-300/20" />
      <div className="relative grid lg:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col justify-between gap-5 border-b border-violet-100 p-5 sm:p-6 lg:border-b-0 lg:border-r dark:border-violet-900/50">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-700 shadow-sm backdrop-blur dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300"><ActivityIcon className="size-3.5" /> GMP inspections</div>
            <h1 className="max-w-xl text-2xl font-bold tracking-[-0.04em] text-slate-950 sm:text-3xl dark:text-white">From inspection plan to <span className="text-violet-600 dark:text-violet-400">regulatory outcome.</span></h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600 dark:text-slate-300">Approvals, active inspections, and CAPA requests across all application types.</p>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">Application types</p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(scopeStyles) as Scope[]).map((scope) => {
                const style = scopeStyles[scope];
                const inSlide = activeScopes.has(scope);
                return (
                  <li
                    key={scope}
                    title={style.description}
                    className={cn(
                      "flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-2 transition-colors duration-500",
                      inSlide ? style.chip : "border-dashed border-slate-300 bg-transparent text-slate-600 dark:border-slate-700 dark:text-slate-300"
                    )}
                  >
                    <span className="shrink-0">{style.icon}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-bold">{style.label}</span>
                      <span className="block truncate text-[11px]">{inSlide ? style.short : "Not in this view"}</span>
                      <span className="sr-only">{style.description}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div
          className="relative flex flex-col p-5 sm:p-6"
          role="region"
          aria-roledescription="carousel"
          aria-label="GMP overview"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
        >
          <p className="mb-3 inline-flex items-center gap-1.5 self-start rounded-full bg-white/70 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-slate-950/50 dark:text-slate-400 dark:ring-slate-800">
            <InfinityIcon className="size-3.5 text-violet-500" /> All-time totals · not affected by filters
          </p>
          <div className="overflow-hidden" aria-live={paused || reducedMotion ? "polite" : "off"}>
            <div className="flex transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none" style={{ transform: `translateX(-${index * 100}%)` }}>
              {groups.map((group, groupIndex) => (
                <OverviewSlide key={group.id} group={group} loading={loading} active={groupIndex === index} animate={!reducedMotion} />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-4">
            <div className="flex items-center gap-2">
              {groups.map((group, groupIndex) => (
                <button
                  key={group.id}
                  type="button"
                  aria-label={`Show ${group.title}`}
                  aria-current={groupIndex === index}
                  onClick={() => setIndex(groupIndex)}
                  className={cn("relative h-2 overflow-hidden rounded-full transition-all duration-300", groupIndex === index ? "w-10 bg-violet-200 ring-1 ring-violet-600 dark:bg-violet-950 dark:ring-violet-400" : "w-2 bg-slate-500 hover:bg-violet-600 dark:bg-slate-400")}
                >
                  {groupIndex === index && (
                    <span
                      key={index}
                      className="gmp-slide-progress absolute inset-0 rounded-full bg-violet-700 dark:bg-violet-400"
                      style={{ animationPlayState: paused || loading ? "paused" : "running" }}
                      onAnimationEnd={() => go(index + 1)}
                    />
                  )}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 tabular-nums dark:text-slate-300">{index + 1} / {count}</span>
              <button type="button" aria-label="Previous overview" onClick={() => go(index - 1)} className="grid size-8 place-items-center rounded-lg border border-slate-500 bg-white/80 text-slate-700 transition hover:border-violet-600 hover:text-violet-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"><ChevronLeftIcon className="size-4" /></button>
              <button type="button" aria-label="Next overview" onClick={() => go(index + 1)} className="grid size-8 place-items-center rounded-lg border border-slate-500 bg-white/80 text-slate-700 transition hover:border-violet-600 hover:text-violet-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-300"><ChevronRightIcon className="size-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
