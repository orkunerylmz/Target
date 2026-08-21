export interface AppSettings {
  theme: "light" | "dark";
  currency: "TRY" | "USD" | "EUR";
  notificationsEnabled: boolean;
  notificationTimes: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  currency: "TRY",
  notificationsEnabled: true,
  notificationTimes: ["09:00", "14:00", "21:30"],
};
