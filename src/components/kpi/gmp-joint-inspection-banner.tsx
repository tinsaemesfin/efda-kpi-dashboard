import { HandshakeIcon } from "lucide-react";

/** Single top-of-drilldown notice that joint GMP inspection data is unavailable. */
export function GMPJointInspectionBanner() {
  return (
    <aside
      aria-label="Joint GMP inspection availability"
      className="relative overflow-hidden rounded-2xl border border-sky-200 bg-linear-to-br from-sky-50 via-white to-indigo-50 p-4 dark:border-sky-900 dark:from-sky-950/40 dark:via-slate-950 dark:to-indigo-950/30 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300">
          <HandshakeIcon className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h2 className="font-semibold">Joint GMP inspections</h2>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
            Joint inspection data is not yet available.
          </p>
        </div>
      </div>
    </aside>
  );
}
