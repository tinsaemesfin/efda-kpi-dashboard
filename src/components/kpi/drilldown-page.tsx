"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import AuthGuard from "@/components/auth/AuthGuard";
import { DashboardLayout } from "@/components/layout";

export function DrilldownPage({ backHref, label, children }: {
  backHref: string;
  label: string;
  children: React.ReactNode;
}) {
  return <AuthGuard><DrilldownFrame backHref={backHref} label={label}>{children}</DrilldownFrame></AuthGuard>;
}

export function DrilldownFrame({ backHref, label, children }: {
  backHref: string;
  label: string;
  children: React.ReactNode;
}) {
  const heading = useRef<HTMLDivElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <DashboardLayout>
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-5">
      <div ref={heading} tabIndex={-1} className="sticky -top-4 z-20 flex flex-wrap items-center gap-3 border-b bg-background/95 py-3 backdrop-blur outline-none md:-top-6 lg:-top-8">
        <Link href={backHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border bg-card px-4 text-sm font-semibold shadow-sm transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-violet-500">
          <ArrowLeftIcon className="size-4" aria-hidden="true" /> Back to dashboard
        </Link>
        <span className="text-sm text-muted-foreground">{label} <span aria-hidden="true">/</span> KPI details</span>
      </div>
      {children}
    </div>
  </DashboardLayout>;
}
