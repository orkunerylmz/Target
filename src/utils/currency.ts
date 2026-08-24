export type CurrencyCode = "TRY" | "USD" | "EUR";

export interface ExchangeRateInfo {
  usdInTry: number;
  eurInTry: number;
  lastUpdated: string;
}

export const DEFAULT_RATES_IN_TRY: Record<CurrencyCode, number> = {
  TRY: 1.0,
  USD: 48.00,
  EUR: 56.00,
};

export async function fetchExchangeRatesInTRY(): Promise<ExchangeRateInfo> {
  const fallback: ExchangeRateInfo = {
    usdInTry: DEFAULT_RATES_IN_TRY.USD,
    eurInTry: DEFAULT_RATES_IN_TRY.EUR,
    lastUpdated: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
  };

  try {
    const res = await fetch("https://open.er-api.com/v6/latest/USD");
    if (res.ok) {
      const data = await res.json();
      if (data && data.rates && data.rates.TRY && data.rates.EUR) {
        const usdToTry = data.rates.TRY;
        const eurToTry = (1 / data.rates.EUR) * data.rates.TRY;

        return {
          usdInTry: Math.round(usdToTry * 100) / 100,
          eurInTry: Math.round(eurToTry * 100) / 100,
          lastUpdated: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
        };
      }
    }
  } catch (err) {
    console.log("Using default fallback exchange rates in TRY", err);
  }
  return fallback;
}

export function convertCurrency(
  amount: number,
  from: CurrencyCode,
  to: CurrencyCode,
  ratesInTry: Record<CurrencyCode, number> = DEFAULT_RATES_IN_TRY
): number {
  if (from === to || !amount || isNaN(amount)) return amount;

  const fromRate = ratesInTry[from] || 1;
  const toRate = ratesInTry[to] || 1;

  // Convert source currency to TL base, then to target currency
  const inTRY = amount * fromRate;
  const inTarget = inTRY / toRate;

  // Round to 2 decimal places
  return Math.round(inTarget * 100) / 100;
}

export function formatCurrency(amount: number, currencyCode: CurrencyCode = "TRY"): string {
  const val = isNaN(amount) ? 0 : amount;
  const hasDecimals = val % 1 !== 0;

  if (currencyCode === "TRY") {
    // Turkish standard: 1.250.000 ₺ or 1.250.000,50 ₺
    const formatted = val.toLocaleString("tr-TR", {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return `${formatted} ₺`;
  }
  if (currencyCode === "USD") {
    // US standard: $1,250,000 or $1,250,000.50
    const formatted = val.toLocaleString("en-US", {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return `$${formatted}`;
  }
  if (currencyCode === "EUR") {
    // European standard: 1.250.000 € or 1.250.000,50 €
    const formatted = val.toLocaleString("de-DE", {
      minimumFractionDigits: hasDecimals ? 2 : 0,
      maximumFractionDigits: 2,
    });
    return `${formatted} €`;
  }
  return `${val.toLocaleString("tr-TR")} ₺`;
}

export function formatNumber(amount: number, currencyCode: CurrencyCode = "TRY"): string {
  const val = isNaN(amount) ? 0 : amount;
  const hasDecimals = val % 1 !== 0;
  const locale = currencyCode === "USD" ? "en-US" : "tr-TR";
  return val.toLocaleString(locale, {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
}

// Formats raw integer digits with thousand separator dots in real-time inside input fields
export function formatInputNumber(value: string | number | undefined, currencyCode: CurrencyCode = "TRY"): string {
  if (value === "" || value === undefined || value === null) return "";
  const clean = value.toString().replace(/\D/g, "");
  if (!clean) return "";
  const num = parseInt(clean, 10);
  if (isNaN(num)) return "";
  const locale = currencyCode === "USD" ? "en-US" : "tr-TR";
  return num.toLocaleString(locale);
}

// Parses formatted string back to raw number
export function parseInputNumber(value: string): number {
  const clean = value.replace(/\D/g, "");
  return clean ? parseInt(clean, 10) : 0;
}

export function getCurrencySymbol(currencyCode: CurrencyCode = "TRY"): string {
  if (currencyCode === "USD") return "$";
  if (currencyCode === "EUR") return "€";
  return "₺";
}
