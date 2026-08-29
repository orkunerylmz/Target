import { describe, it, expect } from "vitest";
import {
  formatCurrency,
  convertCurrency,
  formatInputNumber,
  parseInputNumber,
} from "./currency";

describe("currency utilities", () => {
  it("formats TRY currency correctly", () => {
    const formatted = formatCurrency(12500, "TRY");
    expect(formatted).toContain("12.500");
    expect(formatted).toContain("₺");
  });

  it("formats USD and EUR correctly", () => {
    expect(formatCurrency(2500, "USD")).toBe("$2,500");
    expect(formatCurrency(3000, "EUR")).toBe("3.000 €");
  });

  it("converts currency between TRY, USD and EUR accurately", () => {
    const customRates = { TRY: 1.0, USD: 35.0, EUR: 38.0 };

    // USD to TRY
    expect(convertCurrency(100, "USD", "TRY", customRates)).toBe(3500);

    // TRY to USD
    expect(convertCurrency(3500, "TRY", "USD", customRates)).toBe(100);

    // EUR to USD
    // 100 EUR = 3800 TRY -> 3800 / 35 ≈ 108.57
    const eurToUsd = convertCurrency(100, "EUR", "USD", customRates);
    expect(Math.round(eurToUsd * 100) / 100).toBe(108.57);
  });

  it("parses and formats user input numbers", () => {
    expect(parseInputNumber("1.250.000")).toBe(1250000);
    expect(formatInputNumber(1250000)).toBe("1.250.000");
  });
});
