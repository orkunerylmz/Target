import React, { useState, useEffect } from "react";
import { Goal } from "../types/goal";
import {
  calculateRemaining,
  calculatePercentage,
  calculateDaysRemaining,
  calculateMonthlyRequired,
} from "../utils/calculations";
import {
  formatCurrency,
  CurrencyCode,
  convertCurrency,
  DEFAULT_RATES_IN_TRY,
} from "../utils/currency";
import {
  PlusIcon,
  EditIcon,
  TrashIcon,
  TargetIcon,
  PinIcon,
  SparklesIcon,
  RefreshIcon,
  CloseIcon,
  HistoryIcon,
  CalculatorIcon,
  TrophyIcon,
} from "./Icons";
import ProgressBar from "./ProgressBar";
import { aiService } from "../services/aiService";
import { FormattedAiMessage } from "./FormattedAiMessage";
import { formatTurkishDate } from "../utils/date";

interface GoalCardProps {
  goal: Goal;
  currency?: CurrencyCode;
  ratesInTry?: Record<CurrencyCode, number>;
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onAddSavings: (goal: Goal) => void;
  onToggleDashboard?: (goal: Goal) => void;
  onOpenTransactions?: (goal: Goal) => void;
  onOpenSimulation?: (goal: Goal) => void;
  variant?: "default" | "featured";
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currency,
  ratesInTry = DEFAULT_RATES_IN_TRY,
  onEdit,
  onDelete,
  onAddSavings,
  onToggleDashboard,
  onOpenTransactions,
  onOpenSimulation,
  variant = "default",
}) => {
  const goalCurrency = (goal.currency || "TRY") as CurrencyCode;
  const viewCurrency = currency || goalCurrency;

  const rawRemaining = calculateRemaining(goal);
  const percentage = calculatePercentage(goal);
  const daysLeft = calculateDaysRemaining(goal.targetDate);
  const rawMonthlyRequired = calculateMonthlyRequired(rawRemaining, goal.targetDate);
  const isPinned = goal.showOnDashboard === true;
  const isCompleted = goal.savedAmount >= goal.targetAmount && goal.targetAmount > 0;

  // Amounts converted to viewCurrency
  const displaySaved = convertCurrency(goal.savedAmount, goalCurrency, viewCurrency, ratesInTry);
  const displayTarget = convertCurrency(goal.targetAmount, goalCurrency, viewCurrency, ratesInTry);
  const displayRemaining = convertCurrency(rawRemaining, goalCurrency, viewCurrency, ratesInTry);
  const displayMonthly =
    rawMonthlyRequired !== null
      ? convertCurrency(rawMonthlyRequired, goalCurrency, viewCurrency, ratesInTry)
      : null;

  const isConverted = viewCurrency !== goalCurrency;

  // Goal-Specific AI State connected to background AiService
  const [showAiAdvice, setShowAiAdvice] = useState<boolean>(() => {
    return localStorage.getItem(`target_ai_goal_open_${goal.id}`) === "true";
  });
  const [aiAdvice, setAiAdvice] = useState<string>(() => {
    return localStorage.getItem(`target_ai_goal_${goal.id}`) || "";
  });
  const [aiLoading, setAiLoading] = useState<boolean>(() => {
    return aiService.isLoading(`goal_${goal.id}`);
  });

  // Subscribe to background AI analysis events for this goal
  useEffect(() => {
    const unsubscribe = aiService.subscribe(`goal_${goal.id}`, (loading, text) => {
      setAiLoading(loading);
      setAiAdvice(text);
    });

    setAiLoading(aiService.isLoading(`goal_${goal.id}`));
    const saved = localStorage.getItem(`target_ai_goal_${goal.id}`);
    if (saved) setAiAdvice(saved);

    return () => unsubscribe();
  }, [goal.id]);

  // Sync AI advice text when viewCurrency or goal changes
  useEffect(() => {
    const cached =
      localStorage.getItem(`target_ai_goal_${goal.id}_${viewCurrency}`) ||
      localStorage.getItem(`target_ai_goal_${goal.id}`) ||
      "";
    if (cached) {
      setAiAdvice(cached);
    }
  }, [goal.id, viewCurrency]);

  const handleToggleAi = () => {
    if (!showAiAdvice) {
      setShowAiAdvice(true);
      localStorage.setItem(`target_ai_goal_open_${goal.id}`, "true");
      const currentCached = localStorage.getItem(`target_ai_goal_${goal.id}_${viewCurrency}`);
      if (!currentCached && !aiLoading) {
        aiService.requestGoalAiAdvice(goal, viewCurrency, displayTarget, displaySaved);
      }
    } else {
      setShowAiAdvice(false);
      localStorage.setItem(`target_ai_goal_open_${goal.id}`, "false");
    }
  };

  const handleRefreshAi = () => {
    aiService.requestGoalAiAdvice(goal, viewCurrency, displayTarget, displaySaved);
  };

  const handleCloseAi = () => {
    setShowAiAdvice(false);
    localStorage.setItem(`target_ai_goal_open_${goal.id}`, "false");
  };

  return (
    <div className={`goal-card ${variant === "featured" ? "goal-card-featured" : ""} ${isCompleted ? "goal-completed" : ""}`}>
      {isCompleted && (
        <div className="completed-ribbon">
          <TrophyIcon size={13} />
          <span>Hedefe Ulaşıldı!</span>
        </div>
      )}

      <div className="goal-card-header">
        <div className="goal-card-title-row">
          <span className="goal-card-icon">
            <TargetIcon size={20} />
          </span>
          <div className="goal-card-name-group">
            <h3 className="goal-card-name">{goal.name}</h3>
          </div>
          {isPinned && <span className="pinned-badge">Dashboard</span>}
        </div>
        <div className="goal-card-actions">
          {/* AI Strategy Advice */}
          <button
            className={`btn-icon btn-ai ${showAiAdvice ? "active" : ""}`}
            onClick={handleToggleAi}
            title="Target AI Hedef Analizi"
          >
            <SparklesIcon size={15} />
          </button>

          {/* Simulation Trigger */}
          {onOpenSimulation && (
            <button
              className="btn-icon btn-sim"
              onClick={() => onOpenSimulation(goal)}
              title="Hedef Simülasyonu"
            >
              <CalculatorIcon size={15} />
            </button>
          )}

          {/* Transaction Ledger Trigger */}
          {onOpenTransactions && (
            <button
              className="btn-icon btn-history"
              onClick={() => onOpenTransactions(goal)}
              title={`İşlem Geçmişi (${goal.transactions?.length || 0})`}
            >
              <HistoryIcon size={15} />
            </button>
          )}

          {/* Pin to Dashboard */}
          {onToggleDashboard && (
            <button
              className={`btn-icon btn-pin ${isPinned ? "active" : ""}`}
              onClick={() => onToggleDashboard(goal)}
              title={isPinned ? "Dashboard'dan Kaldır" : "Dashboard'a Sabitle"}
            >
              <PinIcon size={15} filled={isPinned} />
            </button>
          )}

          {/* Add Savings */}
          <button
            className="btn-icon btn-add"
            onClick={() => onAddSavings(goal)}
            title="Birikim Ekle"
          >
            <PlusIcon size={16} />
          </button>

          {/* Edit */}
          <button
            className="btn-icon btn-edit"
            onClick={() => onEdit(goal)}
            title="Düzenle"
          >
            <EditIcon size={15} />
          </button>

          {/* Delete */}
          <button
            className="btn-icon btn-delete"
            onClick={() => onDelete(goal.id)}
            title="Sil"
          >
            <TrashIcon size={15} />
          </button>
        </div>
      </div>

      <div className="goal-card-amounts">
        <span className="goal-card-saved">{formatCurrency(displaySaved, viewCurrency)}</span>
        <span className="goal-card-separator"> / </span>
        <span className="goal-card-target">{formatCurrency(displayTarget, viewCurrency)}</span>
        {isConverted && (
          <span className="goal-card-native-hint" title="Orijinal hedef para birimi">
            (Orijinal: {formatCurrency(goal.targetAmount, goalCurrency)})
          </span>
        )}
      </div>

      <ProgressBar percentage={percentage} height={variant === "featured" ? 14 : 10} showLabel />

      <div className="goal-card-footer">
        <div className="goal-card-remaining">
          <span className="label">Kalan</span>
          <span className="value">{formatCurrency(displayRemaining, viewCurrency)}</span>
        </div>
        {daysLeft !== null && (
          <div className="goal-card-days">
            <span className="label">Kalan Süre</span>
            <span className="value">{daysLeft} gün</span>
          </div>
        )}
        {displayMonthly !== null && (
          <div className="goal-card-monthly">
            <span className="label">Aylık Gerekli</span>
            <span className="value">~{formatCurrency(displayMonthly, viewCurrency)}</span>
          </div>
        )}
        {goal.targetDate && (
          <div className="goal-card-target-date">
            <span className="label">Hedef Tarih</span>
            <span className="value">{formatTurkishDate(goal.targetDate)}</span>
          </div>
        )}
      </div>

      {/* Goal-Specific Target AI Advice Tray */}
      {showAiAdvice && (
        <div className="goal-ai-tray">
          <div className="goal-ai-tray-header">
            <div className="goal-ai-tray-title">
              <span className="ai-icon">
                <SparklesIcon size={14} />
              </span>
              <span>Target AI • {goal.name} Stratejisi</span>
            </div>
            <div className="goal-ai-tray-actions">
              <button
                className="btn-icon btn-icon-xs"
                onClick={handleRefreshAi}
                disabled={aiLoading}
                title="Yeni Tavsiye İste"
              >
                <RefreshIcon size={12} />
              </button>
              <button
                className="btn-icon btn-icon-xs"
                onClick={handleCloseAi}
                title="Kapat"
              >
                <CloseIcon size={12} />
              </button>
            </div>
          </div>
          <div className="goal-ai-tray-body">
            {aiLoading ? (
              <div className="goal-ai-loading">
                <span className="loading-shimmer" />
                <span>Target AI hedefinizi analiz ediyor ve strateji oluşturuyor...</span>
              </div>
            ) : (
              <FormattedAiMessage text={aiAdvice} />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalCard;
