"use client";

import Image from "next/image";
import { LockKeyholeIcon } from "lucide-react";
import { LANDING_PRODUCTS, LANDING_PROGRAMS, SIGN_IN_STEPS } from "./landing-content";
import { AuthorityMark, FlagStripe, SignInButton, SignInMessages } from "./landing-parts";
import { FrameworkComposition, ProgramRegisterCard } from "./landing-register";
import type { SignInState } from "./use-sign-in";

/** Variant A — B + C: the indicator register on the left, a dedicated sign-in card on the right. One screen on desktop. */
export function LandingHybrid({ state }: { state: SignInState }) {
  return (
    <div className="flex min-h-viewport flex-col bg-[#F5F8FB] text-slate-900">
      <FlagStripe />

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 gap-6 px-5 py-5 sm:px-8 lg:grid-cols-[minmax(0,1fr)_400px] xl:gap-8">
        <section aria-label="About the EFDA KPI Dashboard" className="flex flex-col">
          <AuthorityMark />

          <div className="my-auto pt-6 pb-1">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0072BC]">KPI Dashboard · Regulatory performance</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-[#0A2540] xl:text-4xl">Regulatory Performance Dashboard</h2>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 [@media(max-height:860px)]:hidden">
              Timeliness and quality of EFDA’s regulatory decisions for medicines, medical devices, food and cosmetics, measured against
              the Authority’s signed-off KPI framework.
            </p>

            <FrameworkComposition className="mt-6 max-w-3xl rounded-xl border border-slate-200 bg-white p-5" />

            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {LANDING_PROGRAMS.map((program) => (
                <ProgramRegisterCard key={program.key} program={program} />
              ))}
            </div>
          </div>

          <p className="mt-4 text-[11px] text-slate-500">
            © {new Date().getFullYear()} Ethiopian Food and Drug Authority · Secured by EFDA Identity Server
          </p>
        </section>

        <aside className="order-first flex flex-col lg:order-none">
          <div className="flex flex-1 flex-col rounded-xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-8">
            <Image src="/efda-logo.png" alt="" width={52} height={52} className="size-13 object-contain" />
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-[#0A2540]">Sign in</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use your EFDA account to access program dashboards, indicator drill-downs and reports.
            </p>

            <SignInMessages state={state} className="mt-5" />
            <SignInButton state={state} label="Continue to secure sign-in" className="mt-6 w-full" />

            <ol className="mt-6 space-y-3 border-t border-slate-100 pt-5" aria-label="How sign-in works">
              {SIGN_IN_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-3 text-[13px] text-slate-600">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#B3E3F8] bg-[#F0FAFE] text-[11px] font-semibold text-[#005A94]">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            <div className="mt-auto pt-6">
              <p className="border-t border-slate-100 pt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Product lines covered</p>
              <ul className="mt-3 space-y-2">
                {LANDING_PRODUCTS.map((product) => (
                  <li key={product.key} className="flex items-center gap-3">
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#00AEEF] text-white">
                      <product.icon className="size-4" strokeWidth={1.8} aria-hidden="true" />
                    </span>
                    <span className="flex-1 text-sm font-semibold text-[#0A2540]">{product.title}</span>
                    <span className="font-mono text-[11px] text-slate-500">{product.abbreviation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
            <LockKeyholeIcon className="size-3.5" aria-hidden="true" />
            For authorized EFDA personnel only. Access is monitored.
          </p>        </aside>
      </div>
    </div>
  );
}
