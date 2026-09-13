/** Preserve text, including commas and line breaks, and prevent spreadsheet formulas. */
export function csvText(rows: Record<string, unknown>[]): string {
  const columns = Array.from(new Set(rows.flatMap(row => Object.keys(row))));
  const cell = (value: unknown) => {
    let text = value == null ? "" : String(value);
    if (typeof value === "string" && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return [columns.map(cell).join(","), ...rows.map(row => columns.map(key => cell(row[key])).join(","))].join("\r\n");
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  const url = URL.createObjectURL(new Blob(["\uFEFF", csvText(rows)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
