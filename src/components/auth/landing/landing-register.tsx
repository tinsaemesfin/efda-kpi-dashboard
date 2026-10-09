"use client";

import { LockKeyholeIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANDING_PRODUCTS, LANDING_PROGRAMS, TOTAL_KPIS } from "./landing-content";
import { AuthorityMark, FlagStripe, SignInButton, SignInMessages } from "./landing-parts";
import type { SignInState } from "./use-sign-in";

/** Composition bar showing how the indicators split across the three programs. */
export function FrameworkComposition({ className }: { className?: string }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between text-sm">
        <p className="font-semibold text-[#0A2540]">KPI framework composition</p>
        <p className="text-slate-500">
          <span className="font-semibold tabular-nums text-[#0A2540]">{TOTAL_KPIS}</span> indicators in total
        </p>
      </div>
      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full"
        role="img"
        aria-label={LANDING_PROGRAMS.map((p) => `${p.title}: ${p.kpiCount} indicators`).join(", ")}
      >
        {LANDING_PROGRAMS.map((program) => (
          <span key={program.key} style={{ flexGrow: program.kpiCount, background: program.accent }} className="border-r-2 border-white last:border-r-0" />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap justify-between gap-x-6 gap-y-2 text-[13px] text-slate-600">
        {LANDING_PROGRAMS.map((program) => (
          <li key={program.key} className="flex items-center gap-2">
            <span aria-hidden="true" className="size-2.5 rounded-sm" style={{ background: program.accent }} />
            {program.title}
            <span className="font-semibold tabular-nums text-[#0A2540]">{program.kpiCount}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ProductTile({ product }: { product: (typeof LANDING_PRODUCTS)[number] }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4">
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[#00AEEF] text-white">
        <product.icon className="size-5" strokeWidth={1.8} aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-[#0A2540]">{product.title}</p>
        <p className="text-xs text-slate-500">
          <span className="font-mono">{product.abbreviation}</span> · {product.maKpis} MA indicators
          {product.programs.length > 1 ? " + GMP & CT" : ""}
        </p>
      </div>
    </li>
  );
}

export function ProgramRegisterCard({ program }: { program: (typeof LANDING_PROGRAMS)[number] }) {
  return (
    <section aria-labelledby={`register-${program.key}`} className="rounded-xl border border-slate-200 bg-white">
      <header className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
        <span className="grid size-9 place-items-center rounded-lg text-white" style={{ background: program.accent }}>
          <program.icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 id={`register-${program.key}`} className="font-semibold text-[#0A2540]">{program.title}</h3>
          <p className="font-mono text-[11px] text-slate-500">
            {program.code}-KPI-1 … {program.code}-KPI-{program.kpiCount}
          </p>
        </div>
        <span className="text-2xl font-bold tabular-nums text-[#0A2540]">{program.kpiCount}</span>
      </header>
      <ol className="divide-y divide-slate-100 px-5">
        {program.indicators.map((indicator, index) => (
          <li
            key={indicator}
            className={cn(
              "flex gap-3 py-2.5 text-[13px] leading-5 text-slate-700",
              // Keeps the page on one screen on shorter laptop displays.
              index === 4 && "[@media(max-height:860px)]:hidden"
            )}
          >
            <span className="w-5 shrink-0 font-mono text-[11px] leading-5 text-slate-400">{String(index + 1).padStart(2, "0")}</span>
            {indicator}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Variant C — formal register: statement and composition on top, indicator register below. One screen on desktop. */
export function LandingRegister({ state }: { state: SignInState }) {
  return (
    <div className="flex min-h-viewport flex-col bg-[#F5F8FB] text-slate-900">
      <FlagStripe />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          <AuthorityMark size={40} />
          <SignInButton state={state} label="Sign in" className="hidden h-10 px-4 sm:inline-flex" />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center gap-6 px-5 py-5 sm:px-8 [@media(max-height:820px)]:gap-4">
        <section className="grid items-center gap-8 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0072BC]">EFDA · Key Performance Indicators</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0A2540] sm:text-4xl">Regulatory Performance Dashboard</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
              Measuring the timeliness and quality of EFDA’s regulatory decisions for medicines, medical devices, food and cosmetics,
              in line with the Authority’s signed-off KPI framework.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <SignInButton state={state} />
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <LockKeyholeIcon className="size-3.5" aria-hidden="true" />
                Restricted to authorized EFDA personnel
              </span>
            </div>
            <SignInMessages state={state} className="mt-5 max-w-xl" />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <FrameworkComposition />
            <ul aria-label="Product lines covered" className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5">
              {LANDING_PRODUCTS.map((product) => (
                <ProductTile key={product.key} product={product} />
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="register-indicators">
          <div className="flex flex-wrap items-baseline justify-between gap-2 [@media(max-height:820px)]:hidden">
            <h2 id="register-indicators" className="text-xl font-bold tracking-tight text-[#0A2540]">
              Indicator register
            </h2>
            <p className="text-sm text-slate-600">Full definitions and drill-downs are available after sign-in.</p>
          </div>
          <div className="mt-4 grid gap-5 md:grid-cols-3 [@media(max-height:820px)]:mt-0">
            {LANDING_PROGRAMS.map((program) => (
              <ProgramRegisterCard key={program.key} program={program} />
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-3 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <span>© {new Date().getFullYear()} Ethiopian Food and Drug Authority</span>
          <span>Secured by EFDA Identity Server · Access is monitored</span>
        </div>
      </footer>
    </div>
  );
}
