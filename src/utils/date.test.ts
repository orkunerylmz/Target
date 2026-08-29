import { describe, it, expect } from "vitest";
import { formatTurkishDate } from "./date";

describe("date utilities", () => {
  it("formats ISO dates to verbal Turkish string", () => {
    const formatted = formatTurkishDate("2026-10-29");
    expect(formatted).toBe("29 Ekim 2026");
  });

  it("handles empty or invalid dates gracefully", () => {
    expect(formatTurkishDate("")).toBe("");
    expect(formatTurkishDate(undefined)).toBe("");
  });
});
