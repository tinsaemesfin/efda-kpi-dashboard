"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LandingBriefing } from "@/components/auth/landing/landing-briefing";
import { LandingHybrid } from "@/components/auth/landing/landing-hybrid";
import { LandingRegister } from "@/components/auth/landing/landing-register";
import { useSignIn, type SignInState } from "@/components/auth/landing/use-sign-in";
import { cn } from "@/lib/utils";

const VARIANTS = {
  hybrid: { label: "A · Split register (B + C)", component: LandingHybrid },
  briefing: { label: "B · Executive split", component: LandingBriefing },
  register: { label: "C · Indicator register", component: LandingRegister },
} satisfies Record<string, { label: string; component: (props: { state: SignInState }) => React.JSX.Element }>;

type VariantKey = keyof typeof VARIANTS;

/** The design shipped to users. Change this once a variant is chosen. */
const DEFAULT_VARIANT: VariantKey = "briefing";

/** Design comparison bar: always on in development, opt-in elsewhere via NEXT_PUBLIC_LANDING_PREVIEW=true. */
const SHOW_VARIANT_SWITCHER =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_LANDING_PREVIEW === "true";

function isVariantKey(value: string | null): value is VariantKey {
  return value !== null && Object.hasOwn(VARIANTS, value);
}

function VariantSwitcher({ active }: { active: VariantKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const select = (key: VariantKey) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("landing", key);
    router.replace(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-xl bg-slate-900/95 px-3 py-2 text-xs text-slate-300 shadow-lg">
      <span className="font-medium">Design preview:</span>
      <div role="radiogroup" aria-label="Landing page design" className="flex flex-wrap gap-1">
        {(Object.keys(VARIANTS) as VariantKey[]).map((key) => (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={key === active}
            onClick={() => select(key)}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-1 font-medium transition-colors",
              key === active ? "bg-white text-slate-900" : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            {VARIANTS[key].label}
          </button>
        ))}
      </div>
      <span className="hidden text-slate-500 md:inline">(development only)</span>
    </div>
  );
}

export function LoginLanding() {
  const searchParams = useSearchParams();
  const signIn = useSignIn();
  const requested = searchParams.get("landing");
  const active: VariantKey = SHOW_VARIANT_SWITCHER && isVariantKey(requested) ? requested : DEFAULT_VARIANT;
  const Variant = VARIANTS[active].component;

  return (
    <>
      {SHOW_VARIANT_SWITCHER && <VariantSwitcher active={active} />}
      <Variant state={signIn} />
    </>
  );
}
