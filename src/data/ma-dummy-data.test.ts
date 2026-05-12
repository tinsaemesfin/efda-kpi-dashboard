import { describe, expect, it } from "vitest";
import {
  DEFAULT_FOOD_SUB_TAB,
  getMAProductKpiSeedForView,
  maProductKpiSeed,
} from "./ma-dummy-data";

describe("MA product KPI food sub-tabs", () => {
  it("defaults Food to the Food subsection", () => {
    expect(DEFAULT_FOOD_SUB_TAB).toBe("food");
  });

  it("reuses the same 8 Food KPI values for Food Notification", () => {
    const foodSeed = getMAProductKpiSeedForView("food", "food");
    const notificationSeed = getMAProductKpiSeedForView("food", "foodNotification");

    expect(notificationSeed.cards).toHaveLength(8);
    expect(notificationSeed.cards).toEqual(foodSeed.cards);
    expect(notificationSeed.cards).toEqual(maProductKpiSeed.food.cards);
  });
});
