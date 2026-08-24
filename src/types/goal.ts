export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  icon?: string;
  showOnDashboard?: boolean;
  currency?: "TRY" | "USD" | "EUR";
}
