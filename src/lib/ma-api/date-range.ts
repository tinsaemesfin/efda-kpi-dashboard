export type MADatePreset = "this-quarter" | "last-quarter" | "last-30" | "ytd";

export interface MAIsoDateRange {
  from: string;
  to: string;
}

/** Formats a Date as YYYY-MM-DD using the user's local calendar date. */
export function toLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getLocalTodayIso(now = new Date()): string {
  return toLocalIsoDate(now);
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * Returns an MA dashboard preset whose end never extends beyond today.
 * "Last 30 days" is inclusive of today.
 */
export function getMADatePresetRange(
  preset: MADatePreset,
  now = new Date()
): MAIsoDateRange {
  const today = startOfLocalDay(now);
  const year = today.getFullYear();
  const month = today.getMonth();

  if (preset === "this-quarter") {
    const quarterStartMonth = Math.floor(month / 3) * 3;
    return {
      from: toLocalIsoDate(new Date(year, quarterStartMonth, 1)),
      to: toLocalIsoDate(today),
    };
  }

  if (preset === "last-quarter") {
    const currentQuarterStartMonth = Math.floor(month / 3) * 3;
    const currentQuarterStart = new Date(year, currentQuarterStartMonth, 1);
    const previousQuarterEnd = new Date(
      currentQuarterStart.getFullYear(),
      currentQuarterStart.getMonth(),
      0
    );
    const previousQuarterStart = new Date(
      previousQuarterEnd.getFullYear(),
      Math.floor(previousQuarterEnd.getMonth() / 3) * 3,
      1
    );
    return {
      from: toLocalIsoDate(previousQuarterStart),
      to: toLocalIsoDate(previousQuarterEnd),
    };
  }

  if (preset === "last-30") {
    const from = new Date(today);
    from.setDate(from.getDate() - 29);
    return { from: toLocalIsoDate(from), to: toLocalIsoDate(today) };
  }

  return {
    from: `${year}-01-01`,
    to: toLocalIsoDate(today),
  };
}

export function clampIsoDateToToday(value: string, today: string): string {
  return value && value > today ? today : value;
}
