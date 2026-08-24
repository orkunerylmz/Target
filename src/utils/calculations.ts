import { Goal } from "../types/goal";
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
