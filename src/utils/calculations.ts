import { Goal, GoalCategory, GOAL_CATEGORIES, Transaction } from "../types/goal";
import { CurrencyCode, convertCurrency, DEFAULT_RATES_IN_TRY } from "./currency";

export function calculateRemaining(goal: Goal): number {
  return Math.max(goal.targetAmount - goal.savedAmount, 0);
}

export function calculatePercentage(goal: Goal): number {
  if (goal.targetAmount <= 0) return 0;
  return Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
}

export function calculateDaysRemaining(targetDate?: string): number | null {
  if (!targetDate) return null;
  const target = new Date(targetDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - today.getTime();
  return Math.max(Math.ceil(diffMs / (1000 * 60 * 60 * 24)), 0);
}

export function calculateMonthsRemaining(targetDate?: string): number | null {
  if (!targetDate) return null;
  const days = calculateDaysRemaining(targetDate);
  if (days === null || days <= 0) return 0;
  return Math.max(days / 30.4, 1.0);
}

export function calculateMonthlyRequired(
  remaining: number,
  targetDate?: string
): number | null {
  const days = calculateDaysRemaining(targetDate);
  if (days === null || days <= 0) return null;
  const months = Math.max(days / 30.4, 1.0);
  return remaining / months;
}

export function getConvertedTotalStats(
  goals: Goal[],
  viewCurrency: CurrencyCode = "TRY",
  ratesInTry: Record<CurrencyCode, number> = DEFAULT_RATES_IN_TRY
) {
  let totalTarget = 0;
  let totalSaved = 0;
  let totalRemaining = 0;

  for (const g of goals) {
    const goalCurrency = (g.currency || "TRY") as CurrencyCode;
    const targetInView = convertCurrency(g.targetAmount, goalCurrency, viewCurrency, ratesInTry);
    const savedInView = convertCurrency(g.savedAmount, goalCurrency, viewCurrency, ratesInTry);
    const rem = Math.max(g.targetAmount - g.savedAmount, 0);
    const remInView = convertCurrency(rem, goalCurrency, viewCurrency, ratesInTry);

    totalTarget += targetInView;
    totalSaved += savedInView;
    totalRemaining += remInView;
  }

  return {
    totalGoals: goals.length,
    totalTarget: Math.round(totalTarget * 100) / 100,
    totalSaved: Math.round(totalSaved * 100) / 100,
    totalRemaining: Math.round(totalRemaining * 100) / 100,
  };
}

export function getTotalStats(goals: Goal[]) {
  return getConvertedTotalStats(goals, "TRY");
}

// ── Category Distribution ──
export interface CategoryStat {
  category: GoalCategory | string;
  name: string;
  icon: string;
  color: string;
  goalCount: number;
  totalSaved: number;
  totalTarget: number;
  percentage: number;
}

export function getCategoryDistribution(
  goals: Goal[],
  viewCurrency: CurrencyCode = "TRY",
  ratesInTry: Record<CurrencyCode, number> = DEFAULT_RATES_IN_TRY
): CategoryStat[] {
  const map = new Map<string, { saved: number; target: number; count: number }>();

  for (const g of goals) {
    const cat = g.category || "other";
    const goalCurrency = (g.currency || "TRY") as CurrencyCode;
    const saved = convertCurrency(g.savedAmount, goalCurrency, viewCurrency, ratesInTry);
    const target = convertCurrency(g.targetAmount, goalCurrency, viewCurrency, ratesInTry);

    const curr = map.get(cat) || { saved: 0, target: 0, count: 0 };
    map.set(cat, {
      saved: curr.saved + saved,
      target: curr.target + target,
      count: curr.count + 1,
    });
  }

  const results: CategoryStat[] = [];
  const totalAllSaved = Array.from(map.values()).reduce((acc, v) => acc + v.saved, 0);

  for (const [catId, data] of map.entries()) {
    const meta = GOAL_CATEGORIES.find((c) => c.id === catId) || {
      id: catId as GoalCategory,
      name: catId === "other" ? "Diğer" : catId,
      icon: "🎯",
      color: "#6b7280",
    };

    results.push({
      category: catId,
      name: meta.name,
      icon: meta.icon,
      color: meta.color,
      goalCount: data.count,
      totalSaved: data.saved,
      totalTarget: data.target,
      percentage: totalAllSaved > 0 ? Math.round((data.saved / totalAllSaved) * 100) : 0,
    });
  }

  return results.sort((a, b) => b.totalSaved - a.totalSaved);
}

// ── Monthly Savings Trend ──
export interface MonthlyTrendPoint {
  monthKey: string; // YYYY-MM
  label: string; // "Ağu 2026"
  depositAmount: number;
  withdrawAmount: number;
  netAmount: number;
}

const TURKISH_MONTH_SHORT = [
  "Oca", "Şub", "Mar", "Nis", "May", "Haz",
  "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"
];

export function getMonthlySavingsTrend(
  goals: Goal[],
  viewCurrency: CurrencyCode = "TRY",
  ratesInTry: Record<CurrencyCode, number> = DEFAULT_RATES_IN_TRY,
  monthsCount: number = 6
): MonthlyTrendPoint[] {
  // Aggregate all transactions from all goals
  const allTxs: { tx: Transaction; goalCurrency: CurrencyCode }[] = [];
  for (const g of goals) {
    const gCur = (g.currency || "TRY") as CurrencyCode;
    if (g.transactions) {
      for (const tx of g.transactions) {
        allTxs.push({ tx, goalCurrency: gCur });
      }
    }
  }

  // Generate last N month keys
  const now = new Date();
  const points: MonthlyTrendPoint[] = [];

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${y}-${m}`;
    const label = `${TURKISH_MONTH_SHORT[d.getMonth()]} ${y}`;

    let deposit = 0;
    let withdraw = 0;

    for (const item of allTxs) {
      if (item.tx.date && item.tx.date.startsWith(key)) {
        const converted = convertCurrency(
          item.tx.amount,
          item.goalCurrency,
          viewCurrency,
          ratesInTry
        );
        if (item.tx.type === "withdraw") {
          withdraw += converted;
        } else {
          deposit += converted;
        }
      }
    }

    points.push({
      monthKey: key,
      label,
      depositAmount: Math.round(deposit * 100) / 100,
      withdrawAmount: Math.round(withdraw * 100) / 100,
      netAmount: Math.round((deposit - withdraw) * 100) / 100,
    });
  }

  return points;
}

// ── What-If Simulation ──
export interface SimulationResult {
  currentMonthlyPace: number;
  simulatedMonthlyPace: number;
  remainingAmount: number;
  originalTargetDate?: string;
  originalMonthsRemaining: number;
  simulatedMonthsRemaining: number;
  monthsSaved: number;
  projectedCompletionDate: string; // Verbal Turkish
  isEarlier: boolean;
}

export function calculateSimulation(
  remainingAmount: number,
  currentTargetDate: string | undefined,
  simulatedMonthlyPace: number
): SimulationResult {
  const currentMonths = calculateMonthsRemaining(currentTargetDate) || 12;
  const currentMonthlyRequired = remainingAmount > 0 ? remainingAmount / currentMonths : 0;

  const validMonthly = Math.max(simulatedMonthlyPace, 1);
  const simulatedMonths = Math.max(Math.ceil(remainingAmount / validMonthly), 1);

  const monthsSaved = Math.round((currentMonths - simulatedMonths) * 10) / 10;

  // Project completion date
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + Math.round(simulatedMonths * 30.4));
  const day = projectedDate.getDate();
  const month = TURKISH_MONTH_SHORT[projectedDate.getMonth()];
  const year = projectedDate.getFullYear();
  const projectedVerbal = `${day} ${month} ${year}`;

  return {
    currentMonthlyPace: Math.round(currentMonthlyRequired * 100) / 100,
    simulatedMonthlyPace,
    remainingAmount,
    originalTargetDate: currentTargetDate,
    originalMonthsRemaining: Math.round(currentMonths * 10) / 10,
    simulatedMonthsRemaining: simulatedMonths,
    monthsSaved,
    projectedCompletionDate: projectedVerbal,
    isEarlier: monthsSaved > 0,
  };
}

// ── Attention Detection ──
export function getGoalsNeedingAttention(goals: Goal[]): Goal[] {
  return goals.filter((g) => {
    if (g.savedAmount >= g.targetAmount) return false;
    if (!g.targetDate) return false;
    const days = calculateDaysRemaining(g.targetDate);
    if (days === null) return false;
    // Overdue or less than 30 days remaining with < 70% completed
    const pct = calculatePercentage(g);
    return (days <= 0) || (days <= 30 && pct < 70);
  });
}
