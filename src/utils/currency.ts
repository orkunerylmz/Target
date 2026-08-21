type CurrencyCode = "TRY" | "USD" | "EUR";

const CURRENCY_CONFIG: Record<CurrencyCode, { locale: string; currency: string; symbol: string }> = {
  TRY: { locale: "tr-TR", currency: "TRY", symbol: "₺" },
  USD: { locale: "en-US", currency: "USD", symbol: "$" },
  EUR: { locale: "de-DE", currency: "EUR", symbol: "€" },
};

export function formatCurrency(amount: number, currencyCode: CurrencyCode = "TRY"): string {
  const config = CURRENCY_CONFIG[currencyCode];
  return new Intl.NumberFormat(config.locale, {
    style: "currency",
    currency: config.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getCurrencySymbol(currencyCode: CurrencyCode = "TRY"): string {
  return CURRENCY_CONFIG[currencyCode].symbol;
}
