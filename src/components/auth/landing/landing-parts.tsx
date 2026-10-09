"use client";

import Image from "next/image";
import { ArrowRightIcon, CircleAlertIcon, InfoIcon, Loader2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EFDA_BRAND } from "./landing-content";
import type { SignInState } from "./use-sign-in";

/** Thin green / yellow / red band used by Ethiopian federal institutions. */
export function FlagStripe({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("flex h-1 w-full", className)}>
      <span className="flex-1" style={{ background: EFDA_BRAND.flagGreen }} />
      <span className="flex-1" style={{ background: EFDA_BRAND.flagYellow }} />
      <span className="flex-1" style={{ background: EFDA_BRAND.flagRed }} />
    </div>
  );
}

export function AuthorityMark({ inverted = false, size = 44 }: { inverted?: boolean; size?: number }) {
  return (
    <div className="flex items-center gap-3">
      <span className={cn("grid shrink-0 place-items-center rounded-full", inverted ? "bg-white p-1" : "")}>
        <Image src="/efda-logo.png" alt="EFDA emblem" width={size} height={size} priority style={{ width: size, height: size }} className="object-contain" />
      </span>
      <div className="min-w-0 leading-tight">
        <p className={cn("text-[15px] font-semibold tracking-tight", inverted ? "text-white" : "text-[#0A2540]")}>Ethiopian Food and Drug Authority</p>
        <p className={cn("text-xs", inverted ? "text-white/70" : "text-slate-500")}>Federal Democratic Republic of Ethiopia</p>
      </div>
    </div>
  );
}

export function SignInButton({
  state,
  className,
  label = "Sign in to the dashboard",
  variant = "primary",
}: {
  state: SignInState;
  className?: string;
  label?: string;
  variant?: "primary" | "light";
}) {
  const busy = state.status !== "idle";
  return (
    <button
      type="button"
      onClick={state.signIn}
      disabled={busy}
      aria-busy={busy}
      className={cn(
        "group inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-lg px-6 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 disabled:cursor-not-allowed disabled:opacity-80",
        variant === "primary"
          ? "bg-[#0072BC] text-white hover:bg-[#005A94] focus-visible:outline-[#0072BC]"
          : "bg-white text-[#0A2540] hover:bg-[#E6F6FD] focus-visible:outline-white",
        className
      )}
    >
      {busy ? (
        <>
          <Loader2Icon className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {state.status === "checking" ? "Checking your session…" : "Redirecting to secure sign-in…"}
        </>
      ) : (
        <>
          {label}
          <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden="true" />
        </>
      )}
    </button>
  );
}

export function SignInMessages({ state, className }: { state: SignInState; className?: string }) {
  if (state.error) {
    return (
      <div role="alert" className={cn("flex gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-xs leading-5 text-red-800", className)}>
        <CircleAlertIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold">Unable to start sign-in</p>
          <p className="mt-0.5 break-words">{state.error}</p>
        </div>
      </div>
    );
  }
  if (!state.notice) return null;
  return (
    <p role="status" className={cn("flex gap-2.5 rounded-lg border border-[#B3E3F8] bg-[#E6F6FD] px-3.5 py-3 text-xs leading-5 text-[#0A2540]", className)}>
      <InfoIcon className="mt-0.5 size-4 shrink-0 text-[#0072BC]" aria-hidden="true" />
      {state.notice}
    </p>
  );
}
