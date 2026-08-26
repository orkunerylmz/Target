export type TransactionType = "deposit" | "withdraw";

export interface Transaction {
  id: string;
  date: string; // ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ) or YYYY-MM-DD
  amount: number;
  type: TransactionType;
  note?: string;
}

export type GoalCategory =
  | "vehicles"
  | "housing"
  | "vacation"
  | "tech"
  | "emergency"
  | "investment"
  | "education"
  | "other";

export interface CategoryInfo {
  id: GoalCategory;
  name: string;
  icon: string;
  color: string;
}

export const GOAL_CATEGORIES: CategoryInfo[] = [
  { id: "vehicles", name: "Taşıt & Araç", icon: "🚗", color: "#3b82f6" },
  { id: "housing", name: "Konut & Emlak", icon: "🏠", color: "#10b981" },
  { id: "vacation", name: "Tatil & Seyahat", icon: "✈️", color: "#f59e0b" },
  { id: "tech", name: "Teknoloji & Ekipman", icon: "💻", color: "#8b5cf6" },
  { id: "emergency", name: "Acil Durum Fonu", icon: "🛡️", color: "#ef4444" },
  { id: "investment", name: "Yatırım & Portföy", icon: "📈", color: "#06b6d4" },
  { id: "education", name: "Eğitim & Gelişim", icon: "🎓", color: "#ec4899" },
  { id: "other", name: "Diğer Hedefler", icon: "🎯", color: "#6b7280" },
];

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  savedAmount: number;
  targetDate?: string;
  icon?: string;
  category?: GoalCategory | string;
  showOnDashboard?: boolean;
  currency?: "TRY" | "USD" | "EUR";
  transactions?: Transaction[];
}
