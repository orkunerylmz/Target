export interface NotificationSchedule {
  time: string;
  enabled: boolean;
  label?: string;
  repeat?: string;
  goalId?: string;
}

export interface AppSettings {
  theme: "light" | "dark";
  currency: "TRY" | "USD" | "EUR";
  notificationsEnabled: boolean;
  notificationTimes: string[];
  notificationSchedules?: NotificationSchedule[];
  notifyGoalProgress?: boolean;
  notifyMotivationTips?: boolean;
  notifyDailySummary?: boolean;
  disabledGoalNotificationIds?: string[];
  geminiApiKey?: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  currency: "TRY",
  notificationsEnabled: true,
  notificationTimes: ["09:00", "14:00", "21:30"],
  notificationSchedules: [
    { time: "09:00", enabled: true },
    { time: "14:00", enabled: true },
    { time: "21:30", enabled: true },
  ],
  notifyGoalProgress: true,
  notifyMotivationTips: true,
  notifyDailySummary: true,
};
