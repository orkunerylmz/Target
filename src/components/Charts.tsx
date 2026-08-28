import React, { useState } from "react";
import { Goal } from "../types/goal";
import { formatCurrency, CurrencyCode, convertCurrency, DEFAULT_RATES_IN_TRY } from "../utils/currency";
import { getMonthlySavingsTrend } from "../utils/calculations";
import { TrendUpIcon, BarChartIcon } from "./Icons";

interface ChartsProps {
  goals: Goal[];
  currency: CurrencyCode;
  ratesInTry?: Record<CurrencyCode, number>;
}

const PALETTE = [
  "#8b5cf6", // Purple
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#6366f1", // Indigo
  "#14b8a6", // Teal
];

export const OverallProgressChart: React.FC<ChartsProps> = ({
  goals,
  currency,
  ratesInTry = DEFAULT_RATES_IN_TRY,
}) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  const totalTarget = goals.reduce(
    (acc, g) => acc + convertCurrency(g.targetAmount, (g.currency || "TRY") as CurrencyCode, currency, ratesInTry),
    0
  );
  const totalSaved = goals.reduce(
    (acc, g) => acc + convertCurrency(g.savedAmount, (g.currency || "TRY") as CurrencyCode, currency, ratesInTry),
    0
  );
  const overallPercentage = totalTarget > 0 ? Math.min(100, Math.round((totalSaved / totalTarget) * 100)) : 0;

  // Selected goal details (or overall if null)
  const selectedGoal = selectedGoalId ? goals.find((g) => g.id === selectedGoalId) : null;
  const activePct = selectedGoal
    ? selectedGoal.targetAmount > 0
      ? Math.min(100, Math.round((selectedGoal.savedAmount / selectedGoal.targetAmount) * 100))
      : 0
    : overallPercentage;

  const activeSaved = selectedGoal
    ? convertCurrency(selectedGoal.savedAmount, (selectedGoal.currency || "TRY") as CurrencyCode, currency, ratesInTry)
    : totalSaved;
  const activeName = selectedGoal ? selectedGoal.name : "Tüm Hedefler";

  // Selected goal index for color
  const selectedIndex = selectedGoal ? goals.findIndex((g) => g.id === selectedGoal.id) : -1;
  const activeColor = selectedIndex >= 0 ? PALETTE[selectedIndex % PALETTE.length] : "var(--color-primary)";

  // Donut geometry
  const size = 140;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (activePct / 100) * circumference;

  const handleToggleGoal = (id: string) => {
    setSelectedGoalId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-row">
          <span className="chart-icon">
            <TrendUpIcon size={18} />
          </span>
          <div>
            <h3 className="chart-title">Birikim İlerleme Analizi</h3>
            <p className="chart-subtitle">
              {selectedGoal ? `"${selectedGoal.name}" hedefine odaklanıldı` : "Tüm hedeflerin genel birikim durumu"}
            </p>
          </div>
        </div>
        <div className="chart-header-actions">
          {selectedGoalId && (
            <button className="btn btn-secondary btn-sm" onClick={() => setSelectedGoalId(null)}>
              Genel Duruma Dön
            </button>
          )}
          <span className="chart-badge" style={{ borderColor: activeColor, color: activeColor }}>
            %{activePct} Tamamlandı
          </span>
        </div>
      </div>

      <div className="chart-body">
        {/* Interactive Donut Circle */}
        <div className="donut-wrapper">
          <svg width={size} height={size} className="donut-svg">
            <defs>
              <linearGradient id="interactiveDonutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={activeColor} />
                <stop offset="100%" stopColor={activeColor} stopOpacity="0.8" />
              </linearGradient>
              <filter id="interactiveDonutGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={activeColor} floodOpacity="0.35" />
              </filter>
            </defs>
            {/* Background Track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--bg-tertiary)"
              strokeWidth={strokeWidth}
            />
            {/* Animated Progress Ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={activeColor}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              filter="url(#interactiveDonutGlow)"
              style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.4s ease" }}
            />
          </svg>
          <div className="donut-center-text">
            <span className="donut-pct" style={{ color: activeColor }}>%{activePct}</span>
            <span className="donut-label" title={activeName}>
              {selectedGoal ? activeName : "Genel Ortalama"}
            </span>
            <span className="donut-sub-amount">
              {formatCurrency(activeSaved, currency)}
            </span>
          </div>
        </div>

        {/* Goals Interactive Breakdown Section */}
        <div className="chart-breakdown">
          {/* 1. SEPARATED ALL GOALS SUMMARY CONTAINER */}
          <div
            className={`breakdown-summary-card ${selectedGoalId === null ? "active" : ""}`}
            onClick={() => setSelectedGoalId(null)}
            title="Tüm hedeflerin genel durumunu görüntüle"
          >
            <div className="summary-card-header">
              <div className="summary-card-left">
                <span className="summary-tag">GENEL ÖZET</span>
                <span className="summary-card-title">Tüm Hedefler</span>
              </div>
              <span className="summary-card-amount">
                {formatCurrency(totalSaved, currency)}
              </span>
            </div>

            <div className="summary-card-progress-row">
              <div className="breakdown-bar-track summary-track">
                <div
                  className="breakdown-bar-fill"
                  style={{ width: `${overallPercentage}%`, background: "var(--color-primary)" }}
                />
              </div>
              <span className="summary-card-pct">%{overallPercentage}</span>
            </div>
          </div>

          {/* 2. INDIVIDUAL GOALS SECTION HEADER */}
          <div className="breakdown-subheading">
            <span className="breakdown-subheading-title">Tekil Hedefler ({goals.length})</span>
            <span className="breakdown-subheading-hint">Grafiğe odaklamak için tıklayın</span>
          </div>

          {/* 3. INDIVIDUAL GOALS LIST */}
          <div className="breakdown-list">
            {goals.map((goal, idx) => {
              const pct = goal.targetAmount > 0 ? Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100)) : 0;
              const color = PALETTE[idx % PALETTE.length];
              const isSelected = selectedGoalId === goal.id;
              const goalSavedInView = convertCurrency(
                goal.savedAmount,
                (goal.currency || "TRY") as CurrencyCode,
                currency,
                ratesInTry
              );

              return (
                <div
                  key={goal.id}
                  className={`breakdown-item ${isSelected ? "active" : ""}`}
                  onClick={() => handleToggleGoal(goal.id)}
                  title={`"${goal.name}" hedefine odaklan`}
                >
                  <div className="breakdown-name-wrapper">
                    <span className="breakdown-dot" style={{ background: color }} />
                    <span className="breakdown-name" title={goal.name}>
                      {goal.name}
                    </span>
                  </div>
                  <div className="breakdown-bar-container">
                    <div className="breakdown-bar-track">
                      <div
                        className="breakdown-bar-fill"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                    <span className="breakdown-pct">%{pct}</span>
                  </div>
                  <div className="breakdown-amount">
                    <span className="breakdown-saved">{formatCurrency(goalSavedInView, currency)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MonthlyTrendChart: React.FC<ChartsProps> = ({
  goals,
  currency,
  ratesInTry = DEFAULT_RATES_IN_TRY,
}) => {
  const points = getMonthlySavingsTrend(goals, currency, ratesInTry, 6);
  const maxAmount = Math.max(...points.map((p) => Math.max(p.depositAmount, 100)), 1000);

  return (
    <div className="chart-card">
      <div className="chart-header">
        <div className="chart-title-row">
          <span className="chart-icon">
            <BarChartIcon size={18} />
          </span>
          <div>
            <h3 className="chart-title">Aylık Birikim Hızı (Son 6 Ay)</h3>
            <p className="chart-subtitle">İşlem kayıtlarına göre aylık net birikim hacmi</p>
          </div>
        </div>
      </div>

      <div className="chart-body">
        <div className="trend-bars-container">
          {points.map((p) => {
            const heightPct = Math.min(100, Math.round((p.depositAmount / maxAmount) * 100));
            return (
              <div key={p.monthKey} className="trend-bar-col">
                <div className="trend-bar-value-top">
                  {p.depositAmount > 0 ? formatCurrency(p.depositAmount, currency) : "-"}
                </div>
                <div className="trend-bar-track">
                  <div
                    className="trend-bar-fill"
                    style={{ height: `${Math.max(heightPct, 4)}%` }}
                    title={`${p.label}: +${formatCurrency(p.depositAmount, currency)}`}
                  />
                </div>
                <span className="trend-bar-label">{p.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
