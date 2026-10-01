"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRightIcon,
  CircleAlertIcon,
  ClipboardCheck,
  FlaskConical,
  KeyRoundIcon,
  Loader2Icon,
  LockKeyholeIcon,
  ShieldCheck,
  ShieldCheckIcon,
  UserRoundCheckIcon,
  LayoutDashboardIcon,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { authService, safeReturnPath } from "@/lib/services/auth.service";
import { useSessionStore } from "@/lib/stores/session.store";
import { createSessionFromUser } from "@/lib/models/session.model";
import { cn } from "@/lib/utils";

const PROGRAMS = [
  {
    title: "Clinical Trials",
    href: "/clinical-trials",
    icon: FlaskConical,
    description: "Clinical trial applications and compliance",
    tile: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300",
  },
  {
    title: "GMP Inspections",
    href: "/gmp-inspections",
    icon: ShieldCheck,
    description: "Manufacturing inspections and certifications",
    tile: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
  },
  {
    title: "Market Authorizations",
    href: "/market-authorizations",
    icon: ClipboardCheck,
    description: "Drug authorization and approvals",
    tile: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300",
  },
];

const PRODUCT_LINES = ["Medicine", "Medical Device", "Food", "Cosmetics"];

const STEPS = [
  { icon: LockKeyholeIcon, label: "Continue to the EFDA Identity Server" },
  { icon: KeyRoundIcon, label: "Enter your username and password" },
  { icon: LayoutDashboardIcon, label: "Return straight to your dashboard" },
];

function destinationLabel(returnPath: string): string | null {
  if (returnPath === "/") return null;
  const program = PROGRAMS.find((item) => returnPath.startsWith(item.href));
  return program ? program.title : "the page you requested";
}

export function LoginLanding() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useSessionStore((state) => state.setSession);
  const returnPath = safeReturnPath(searchParams.get("return"));
  const reason = searchParams.get("reason");
  const [status, setStatus] = useState<"checking" | "idle" | "redirecting">("checking");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const user = await authService?.getUser();
      if (!active) return;
      if (user && !user.expired) {
        setSession(createSessionFromUser(user));
        router.replace(returnPath);
        return;
      }
      setStatus("idle");
    })();
    return () => {
      active = false;
    };
  }, [returnPath, router, setSession]);

  const handleSignIn = async () => {
    if (!authService) return;
    setError(null);
    setStatus("redirecting");
    try {
      await authService.login(returnPath);
    } catch (err) {
      console.error("Authentication error:", err);
      setError(err instanceof Error ? err.message : "Unable to reach the sign-in service.");
      setStatus("idle");
    }
  };

  const destination = destinationLabel(returnPath);
  const notice =
    reason === "signed-out"
      ? "You have been signed out. Sign in again to continue."
      : destination
        ? `Your session has ended or you are not signed in. Sign in to continue to ${destination}.`
        : null;

  return (
    <main className="relative isolate flex min-h-viewport w-full bg-efda-background lg:h-viewport lg:overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_10%,rgba(124,58,237,0.10),transparent_45%),radial-gradient(circle_at_70%_95%,rgba(37,99,235,0.08),transparent_40%)]"
      />

      <section
        aria-label="About the EFDA KPI Dashboard"
        className="relative isolate m-4 hidden w-[52%] max-w-[860px] flex-col overflow-hidden rounded-[2rem] border border-violet-200/70 bg-[linear-gradient(135deg,#ffffff_0%,#faf8ff_48%,#f1edff_100%)] p-8 shadow-[0_30px_80px_-55px_rgba(76,29,149,0.7)] dark:border-violet-900/60 dark:bg-[linear-gradient(135deg,#0f172a_0%,#111024_52%,#18112e_100%)] lg:flex xl:p-10"
      >
        <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 -z-10 size-[28rem] rounded-full border-[56px] border-violet-200/25 dark:border-violet-800/15" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-24 -z-10 size-[26rem] rounded-full border-[40px] border-blue-200/20 dark:border-blue-900/15" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35] [background-image:linear-gradient(to_right,rgba(124,58,237,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(124,58,237,0.08)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_70%)]"
        />

        <div className="ma-enter flex items-center gap-3">
          <Image src="/efda-logo.png" alt="EFDA logo" width={44} height={44} priority className="size-11 rounded-xl object-contain shadow-sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-slate-950 dark:text-white">EFDA KPI Dashboard</p>
            <p className="text-xs text-muted-foreground">Ethiopian Food and Drug Authority</p>
          </div>
        </div>

        <div className="ma-enter ma-enter-delay my-auto py-6">
          <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.16em] text-violet-700 dark:text-violet-300">
            <ShieldCheckIcon className="size-4 shrink-0" aria-hidden="true" /> Regulatory performance
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-[-0.045em] text-slate-950 dark:text-white xl:text-5xl">
            Every program.
            <br />
            <span className="text-violet-600 dark:text-violet-400">One clear perspective.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
            Move from regulatory priorities to the indicators behind them, across clinical trials, manufacturing inspections, and market authorizations.
          </p>

          <ul className="mt-7 grid max-w-lg gap-2.5 [@media(max-height:680px)]:hidden">
            {PROGRAMS.map((program) => (
              <li
                key={program.title}
                className="flex items-center gap-3.5 rounded-2xl border border-violet-200/60 bg-white/70 p-3 backdrop-blur-sm dark:border-violet-900/60 dark:bg-slate-950/50"
              >
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl border", program.tile)}>
                  <program.icon className="size-5" strokeWidth={1.7} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">{program.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{program.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-violet-200/60 pt-5 dark:border-violet-900/60">
          <div className="flex flex-wrap gap-1.5">
            {PRODUCT_LINES.map((line) => (
              <span key={line} className="rounded-md border border-violet-200/60 bg-white/60 px-2 py-1 text-[11px] text-muted-foreground dark:border-violet-900/60 dark:bg-slate-900/60">
                {line}
              </span>
            ))}
          </div>
          <span className="text-[11px] text-muted-foreground">Product lines covered</span>
        </div>
      </section>

      <section className="relative flex flex-1 flex-col px-5 py-5 sm:px-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 lg:invisible">
            <Image src="/efda-logo.png" alt="" width={36} height={36} className="size-9 rounded-lg object-contain shadow-sm" />
            <span className="text-sm font-semibold tracking-tight">EFDA KPI Dashboard</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-6">
          <div className="ma-enter rounded-[1.75rem] border bg-card p-7 shadow-[0_24px_70px_-45px_rgba(15,23,42,0.45)] sm:p-8">
            <span className="grid size-12 place-items-center rounded-2xl border border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950/50 dark:text-violet-300">
              <UserRoundCheckIcon className="size-6" strokeWidth={1.7} aria-hidden="true" />
            </span>
            <p className="mt-5 text-[10px] font-semibold uppercase tracking-[.18em] text-violet-600 dark:text-violet-400">Welcome back</p>
            <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Sign in to your workspace</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Use your EFDA account to access regulatory KPIs and program dashboards.
            </p>

            {notice && !error && (
              <p role="status" className="mt-5 flex gap-2.5 rounded-xl border border-violet-200/80 bg-violet-50/70 px-3.5 py-3 text-xs leading-5 text-violet-900 dark:border-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
                <ShieldCheckIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {notice}
              </p>
            )}

            {error && (
              <div role="alert" className="mt-5 flex gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold">Unable to start sign-in</p>
                  <p className="mt-0.5 break-words">{error}</p>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleSignIn}
              disabled={status !== "idle"}
              aria-busy={status !== "idle"}
              className="group mt-6 inline-flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white shadow-[0_12px_30px_-12px_rgba(124,58,237,0.8)] transition-colors hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-80"
            >
              {status === "idle" ? (
                <>
                  Log in
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
                </>
              ) : (
                <>
                  <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  {status === "checking" ? "Checking your session…" : "Redirecting to secure sign-in…"}
                </>
              )}
            </button>

            <ol className="mt-6 space-y-3 border-t pt-5 [@media(max-height:600px)]:hidden" aria-label="How sign-in works">
              {STEPS.map((step, index) => (
                <li key={step.label} className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-muted text-foreground/80">
                    <step.icon className="size-3.5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="sr-only">Step {index + 1}: </span>
                    {step.label}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-[11px] text-muted-foreground">
            <LockKeyholeIcon className="size-3.5" aria-hidden="true" />
            For authorized EFDA personnel only
          </p>
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <span>© {new Date().getFullYear()} Ethiopian Food and Drug Authority</span>
          <span>Secured by EFDA Identity Server</span>
        </footer>
      </section>
    </main>
  );
}
