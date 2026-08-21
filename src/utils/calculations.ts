import { Goal } from "../types/goal";

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
  return Math.max(Math.ceil(days / 30), 1);
}

export function calculateMonthlyRequired(
  remaining: number,
  targetDate?: string
): number | null {
  const months = calculateMonthsRemaining(targetDate);
  if (months === null || months <= 0) return null;
  return remaining / months;
}

export function getTotalStats(goals: Goal[]) {
  return {
    totalGoals: goals.length,
    totalTarget: goals.reduce((sum, g) => sum + g.targetAmount, 0),
    totalSaved: goals.reduce((sum, g) => sum + g.savedAmount, 0),
    totalRemaining: goals.reduce(
      (sum, g) => sum + calculateRemaining(g),
      0
    ),
  };
}
