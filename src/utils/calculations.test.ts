import { describe, it, expect } from "vitest";
import {
  calculateRemaining,
  calculatePercentage,
  getConvertedTotalStats,
  getCategoryDistribution,
  calculateSimulation,
} from "./calculations";
import { Goal } from "../types/goal";

describe("calculation utilities", () => {
  const mockGoals: Goal[] = [
    {
      id: "1",
      name: "Araba",
      targetAmount: 500000,
      savedAmount: 250000,
      category: "vehicles",
      currency: "TRY",
    },
    {
      id: "2",
      name: "Ev",
      targetAmount: 2000000,
      savedAmount: 500000,
      category: "housing",
      currency: "TRY",
    },
  ];

  it("calculates remaining amount correctly", () => {
    expect(calculateRemaining(mockGoals[0])).toBe(250000);
    expect(calculateRemaining(mockGoals[1])).toBe(1500000);
  });

  it("calculates progress percentage correctly", () => {
    expect(calculatePercentage(mockGoals[0])).toBe(50);
    expect(calculatePercentage(mockGoals[1])).toBe(25);
  });

  it("calculates total portfolio stats", () => {
    const stats = getConvertedTotalStats(mockGoals, "TRY");
    expect(stats.totalGoals).toBe(2);
    expect(stats.totalTarget).toBe(2500000);
    expect(stats.totalSaved).toBe(750000);
    expect(stats.totalRemaining).toBe(1750000);
  });

  it("computes category distribution breakdown", () => {
    const dist = getCategoryDistribution(mockGoals, "TRY");
    expect(dist.length).toBe(2);
    expect(dist[0].category).toBe("housing");
    expect(dist[0].totalSaved).toBe(500000);
    expect(dist[1].category).toBe("vehicles");
    expect(dist[1].totalSaved).toBe(250000);
  });

  it("computes what-if simulation accurately", () => {
    const sim = calculateSimulation(120000, "2027-08-26", 10000);
    expect(sim.simulatedMonthsRemaining).toBe(12);
    expect(sim.remainingAmount).toBe(120000);
  });
});
