import { Goal, GOAL_CATEGORIES } from "../types/goal";
import { AppSettings } from "../types/settings";

export interface BackupData {
  version: string;
  exportedAt: string;
  goals: Goal[];
  settings: AppSettings;
}

/**
 * Export all app data as a JSON file download.
 */
export function exportBackupToJson(goals: Goal[], settings: AppSettings) {
  const data: BackupData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    goals,
    settings,
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `target-backup-${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export goals as Excel-compatible UTF-8 CSV.
 */
export function exportGoalsToCsv(goals: Goal[]) {
  const headers = [
    "Hedef Adı",
    "Kategori",
    "Hedef Tutarı",
    "Mevcut Birikim",
    "Kalan Tutar",
    "Tamamlanma Oranı (%)",
    "Para Birimi",
    "Hedef Tarihi",
    "Dashboard'da Göster",
    "İşlem Sayısı",
  ];

  const rows = goals.map((g) => {
    const catName =
      GOAL_CATEGORIES.find((c) => c.id === g.category)?.name || g.category || "Diğer";
    const remaining = Math.max(0, g.targetAmount - g.savedAmount);
    const pct = g.targetAmount > 0 ? ((g.savedAmount / g.targetAmount) * 100).toFixed(1) : "0";
    const txCount = g.transactions?.length || 0;

    return [
      escapeCsv(g.name),
      escapeCsv(catName),
      g.targetAmount,
      g.savedAmount,
      remaining,
      `%${pct}`,
      g.currency || "TRY",
      g.targetDate || "Belirtilmemiş",
      g.showOnDashboard ? "Evet" : "Hayır",
      txCount,
    ].join(";");
  });

  // UTF-8 BOM for proper Excel rendering of Turkish characters
  const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = `target-hedefler-${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function escapeCsv(val: string): string {
  if (val.includes(";") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/**
 * Read and validate JSON file uploaded by the user.
 */
export function parseBackupJson(file: File): Promise<BackupData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        // Validate basic structure
        if (!parsed || typeof parsed !== "object") {
          throw new Error("Geçersiz yedek dosyası yapısı.");
        }

        if (!Array.isArray(parsed.goals)) {
          throw new Error("Yedek dosyası 'goals' listesini içermiyor.");
        }

        resolve(parsed as BackupData);
      } catch (err: any) {
        reject(new Error(err.message || "Yedek dosyası okunamadı."));
      }
    };
    reader.onerror = () => reject(new Error("Dosya okuma hatası oluştu."));
    reader.readAsText(file);
  });
}
