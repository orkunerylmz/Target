const TURKISH_MONTHS = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/**
 * Converts ISO date strings like "2026-08-22" into verbal Turkish dates like "22 Ağustos 2026"
 */
export function formatTurkishDate(dateStr?: string | null): string {
  if (!dateStr) return "";

  try {
    const clean = dateStr.trim();
    const parts = clean.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      if (monthIndex >= 0 && monthIndex < 12 && !isNaN(day) && !isNaN(year)) {
        return `${day} ${TURKISH_MONTHS[monthIndex]} ${year}`;
      }
    }

    const d = new Date(clean);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("tr-TR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  } catch {
    // Fallback to original
  }

  return dateStr;
}

/**
 * Returns today's date formatted in full verbal Turkish: e.g. "22 Ağustos 2026, Cumartesi"
 */
export function getTodayVerbalDate(): string {
  return new Date().toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    weekday: "long",
  });
}
