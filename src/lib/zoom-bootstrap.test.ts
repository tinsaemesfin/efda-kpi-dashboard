import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { zoomBootstrap } from "./zoom-bootstrap";

function run(devicePixelRatio: number, innerWidth: number) {
  const props: Record<string, string> = {};
  const attrs: Record<string, string> = {};
  const style = {
    zoom: "",
    setProperty: (name: string, value: string) => { props[name] = value; },
    removeProperty: (name: string) => { if (name === "zoom") style.zoom = ""; delete props[name]; },
  };
  let onResize: (() => void) | undefined;
  const window = {
    devicePixelRatio,
    innerWidth,
    addEventListener: (_type: string, listener: () => void) => { onResize = listener; },
  };
  runInNewContext(zoomBootstrap, {
    window,
    document: {
      documentElement: {
        style,
        setAttribute: (name: string, value: string) => { attrs[name] = value; },
        removeAttribute: (name: string) => { delete attrs[name]; },
      },
    },
  });
  return { style, props, attrs, window, resize: () => onResize?.() };
}

describe("zoom compensation", () => {
  it("restores the 100% layout at 150% zoom on a 1920px screen", () => {
    const { style, props, attrs } = run(1.5, 1280);
    expect(Number(style.zoom)).toBeCloseTo(2 / 3);
    expect(Number(props["--app-zoom"])).toBeCloseTo(2 / 3);
    expect(attrs["data-app-bp"]).toBe("sm md lg xl 2xl");
  });

  it("restores the 100% layout at 125% zoom on a 1366px screen", () => {
    const { style, attrs } = run(1.25, 1093);
    expect(Number(style.zoom)).toBeCloseTo(0.8);
    expect(attrs["data-app-bp"]).toBe("sm md lg xl");
  });

  it("only scales down as far as the 1920px design width on wide screens", () => {
    expect(Number(run(1.5, 1707).style.zoom)).toBeCloseTo(1707 / 1920);
    expect(run(1.5, 2560).style.zoom).toBe("");
  });

  it.each([1, 2, 3])("leaves devicePixelRatio %s untouched", (dpr) => {
    const { style, attrs } = run(dpr, 1280);
    expect(style.zoom).toBe("");
    expect(attrs["data-app-bp"]).toBeUndefined();
  });

  it("follows zoom changes on resize", () => {
    const page = run(1.5, 1280);
    page.window.devicePixelRatio = 1;
    page.window.innerWidth = 1920;
    page.resize();
    expect(page.style.zoom).toBe("");
    expect(page.props["--app-zoom"]).toBeUndefined();
    expect(page.attrs["data-app-bp"]).toBeUndefined();
  });
});
