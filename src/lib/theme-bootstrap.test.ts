import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { themeBootstrap } from "./theme-bootstrap";

describe("initial color theme", () => {
  it.each([
    ["dark", false, true],
    ["light", true, false],
    ["system", true, true],
    ["system", false, false],
    [undefined, true, true],
  ])("resolves %s with system dark=%s", (theme, systemDark, expected) => {
    let dark = false;
    const style = { colorScheme: "" };
    runInNewContext(themeBootstrap, {
      localStorage: { getItem: () => JSON.stringify({ state: { theme } }) },
      matchMedia: () => ({ matches: systemDark }),
      document: { documentElement: { style, classList: { toggle: (_name: string, value: boolean) => { dark = value; } } } },
    });
    expect(dark).toBe(expected);
    expect(style.colorScheme).toBe(expected ? "dark" : "light");
  });

  it("does not interrupt startup when storage is inaccessible", () => {
    expect(() => runInNewContext(themeBootstrap, {
      localStorage: { getItem: () => { throw new Error("Storage denied"); } },
    })).not.toThrow();
  });
});
