"use client";

import { StickyNoteIcon } from "lucide-react";

const reminders = [
  "Legacy data — remove from all KPI",
  "Processing time — use ViewMA processing time unified",
] as const;

export function MADevStickyNote() {
  return (
    <aside
      className="fixed top-20 right-6 z-50 w-72 rotate-1 rounded-md border border-amber-300/80 bg-amber-100 p-4 shadow-lg dark:border-amber-700/60 dark:bg-amber-950/40"
      aria-label="MA KPI development reminders"
    >
      <div className="mb-2 flex items-center gap-2 text-amber-900 dark:text-amber-100">
        <StickyNoteIcon className="h-4 w-4 shrink-0" aria-hidden />
        <h2 className="text-sm font-semibold">Don&apos;t forget</h2>
      </div>
      <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-amber-950 dark:text-amber-50">
        {reminders.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ol>
    </aside>
  );
}
