import { expect, it } from "vitest";
import { csvText } from "./export-csv";

it("quotes complex category names and guards spreadsheet formulas without changing numbers", () => {
  expect(csvText([{ category: 'A, "B"', days: -2 }, { category: '=HYPERLINK("bad")', days: null }])).toBe('"category","days"\r\n"A, ""B""","-2"\r\n"\'=HYPERLINK(""bad"")",""');
});
