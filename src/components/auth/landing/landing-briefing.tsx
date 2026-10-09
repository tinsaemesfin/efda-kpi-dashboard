"use client";

import Image from "next/image";
import { CheckIcon, LockKeyholeIcon, MinusIcon } from "lucide-react";
import { LANDING_PRODUCTS, LANDING_PROGRAMS, SIGN_IN_STEPS, TOTAL_KPIS } from "./landing-content";
import { AuthorityMark, FlagStripe, SignInButton, SignInMessages } from "./landing-parts";
import type { SignInState } from "./use-sign-in";

/** Variant B — executive split screen: coverage briefing on the left, sign-in on the right. One screen on desktop. */
export function LandingBriefing({ state }: { state: SignInState }) {
  return (
    <div className="flex min-h-viewport flex-col bg-white text-slate-900">
      <FlagStripe />
      <div className="flex flex-1 flex-col lg:flex-row">
        <section
          aria-label="About the EFDA KPI Dashboard"
          className="relative flex flex-col overflow-hidden border-slate-200 bg-[linear-gradient(160deg,#F0FAFE_0%,#FFFFFF_70%)] lg:w-[58%] lg:border-r"
        >
          <Image
            src="/efda-logo.png"
            alt=""
            aria-hidden="true"
            width={420}
            height={420}
            className="pointer-events-none absolute -bottom-24 -right-24 hidden size-[420px] object-contain opacity-[0.07] mix-blend-multiply lg:block"
          />
          <div className="relative flex flex-1 flex-col px-6 py-7 sm:px-10 xl:px-14">
            <AuthorityMark />

            <div className="my-auto py-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0072BC]">KPI Dashboard · Regulatory performance</p>
              <h2 className="mt-4 max-w-xl text-3xl font-bold leading-tight tracking-tight text-[#0A2540] xl:text-4xl">
                One authoritative view of how the Authority is performing.
              </h2>

              <dl className="mt-8 grid max-w-xl grid-cols-3 gap-6 border-y border-slate-200 py-6">
                {[
                  { value: TOTAL_KPIS, label: "Indicators" },
                  { value: LANDING_PROGRAMS.length, label: "Programs" },
                  { value: LANDING_PRODUCTS.length, label: "Product lines" },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col-reverse">
                    <dt className="mt-1 text-xs text-slate-500">{stat.label}</dt>
                    <dd className="text-4xl font-bold tabular-nums text-[#0072BC] xl:text-5xl">{stat.value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-8 max-w-xl">
                <p className="text-sm font-semibold text-[#0A2540]">Indicator coverage by product line</p>
                <table className="mt-3 w-full border-collapse text-sm">
                  <caption className="sr-only">Number of indicators reported for each product line and program</caption>
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-wider text-slate-500">
                      <th scope="col" className="py-2 pr-3 font-medium">Product line</th>
                      {LANDING_PROGRAMS.map((program) => (
                        <th key={program.key} scope="col" className="px-2 py-2 text-center font-medium">
                          <abbr title={program.title} className="no-underline">{program.code}</abbr>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {LANDING_PRODUCTS.map((product) => (
                      <tr key={product.key} className="border-t border-slate-200">
                        <th scope="row" className="py-2.5 pr-3 text-left font-normal text-slate-800">
                          <span className="flex items-center gap-2.5">
                            <product.icon className="size-4 shrink-0 text-[#0072BC]" aria-hidden="true" />
                            <span>{product.title}</span>
                            <span className="font-mono text-[10px] text-slate-400">{product.abbreviation}</span>
                          </span>
                        </th>
                        {LANDING_PROGRAMS.map((program) => {
                          const covered = product.programs.includes(program.key);
                          const count = program.key === "ma" ? product.maKpis : program.kpiCount;
                          return (
                            <td key={program.key} className="px-2 py-2.5 text-center">
                              {covered ? (
                                <span className="inline-flex items-center gap-1 rounded bg-[#E6F6FD] px-2 py-0.5 text-xs font-semibold tabular-nums text-[#005A94]">
                                  <CheckIcon className="size-3" aria-hidden="true" />
                                  {count}
                                </span>
                              ) : (
                                <>
                                  <MinusIcon className="mx-auto size-3.5 text-slate-300" aria-hidden="true" />
                                  <span className="sr-only">Not applicable</span>
                                </>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <p className="text-[11px] leading-5 text-slate-500">
              MA — Market Authorization · GMP — Good Manufacturing Practice inspection · CT — Clinical Trial
            </p>
          </div>
        </section>

        <section className="order-first flex flex-1 flex-col bg-[#F5F8FB] px-5 py-7 sm:px-10 lg:order-none">
          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
            <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:p-9">
              <Image src="/efda-logo.png" alt="" width={52} height={52} className="size-13 object-contain" />
              <h1 className="mt-6 text-2xl font-bold tracking-tight text-[#0A2540]">Sign in</h1>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use your EFDA account to access program dashboards, indicator drill-downs and reports.
              </p>

              <SignInMessages state={state} className="mt-5" />

              <SignInButton state={state} label="Continue to secure sign-in" className="mt-6 w-full" />

              <ol className="mt-7 space-y-3 border-t border-slate-100 pt-6" aria-label="How sign-in works">
                {SIGN_IN_STEPS.map((step, index) => (
                  <li key={step} className="flex items-center gap-3 text-[13px] text-slate-600">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full border border-[#B3E3F8] bg-[#F0FAFE] text-[11px] font-semibold text-[#005A94]">
                      {index + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-slate-500">
              <LockKeyholeIcon className="size-3.5" aria-hidden="true" />
              For authorized EFDA personnel only. Access is monitored.
            </p>
          </div>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
            <span>© {new Date().getFullYear()} Ethiopian Food and Drug Authority</span>
            <span>Secured by EFDA Identity Server</span>
          </footer>
        </section>
      </div>
    </div>
  );
}
