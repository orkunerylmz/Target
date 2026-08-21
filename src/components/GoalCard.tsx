import React from "react";
import { Goal } from "../types/goal";
import {
  calculateRemaining,
  calculatePercentage,
  calculateDaysRemaining,
  calculateMonthlyRequired,
} from "../utils/calculations";
import { formatCurrency } from "../utils/currency";
import { PlusIcon, EditIcon, TrashIcon, TargetIcon } from "./Icons";
import ProgressBar from "./ProgressBar";

interface GoalCardProps {
  goal: Goal;
  currency: "TRY" | "USD" | "EUR";
  onEdit: (goal: Goal) => void;
  onDelete: (goalId: string) => void;
  onAddSavings: (goal: Goal) => void;
  variant?: "default" | "featured";
}

const GoalCard: React.FC<GoalCardProps> = ({
  goal,
  currency,
  onEdit,
  onDelete,
  onAddSavings,
  variant = "default",
}) => {
  const remaining = calculateRemaining(goal);
  const percentage = calculatePercentage(goal);
  const daysLeft = calculateDaysRemaining(goal.targetDate);
  const monthlyRequired = calculateMonthlyRequired(remaining, goal.targetDate);

  return (
    <div className={`goal-card ${variant === "featured" ? "goal-card-featured" : ""}`}>
      <div className="goal-card-header">
        <div className="goal-card-title-row">
          <span className="goal-card-icon">
            <TargetIcon size={20} />
          </span>
          <h3 className="goal-card-name">{goal.name}</h3>
        </div>
        <div className="goal-card-actions">
          <button
            className="btn-icon btn-add"
            onClick={() => onAddSavings(goal)}
            title="Birikim Ekle"
          >
            <PlusIcon size={16} />
          </button>
          <button
            className="btn-icon btn-edit"
            onClick={() => onEdit(goal)}
            title="Düzenle"
          >
            <EditIcon size={15} />
          </button>
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
        <span className="goal-card-saved">{formatCurrency(goal.savedAmount, currency)}</span>
        <span className="goal-card-separator"> / </span>
        <span className="goal-card-target">{formatCurrency(goal.targetAmount, currency)}</span>
      </div>

      <ProgressBar percentage={percentage} height={variant === "featured" ? 14 : 10} showLabel />

      <div className="goal-card-footer">
        <div className="goal-card-remaining">
          <span className="label">Kalan</span>
          <span className="value">{formatCurrency(remaining, currency)}</span>
        </div>
        {daysLeft !== null && (
          <div className="goal-card-days">
            <span className="label">Kalan Süre</span>
            <span className="value">{daysLeft} gün</span>
          </div>
        )}
        {monthlyRequired !== null && (
          <div className="goal-card-monthly">
            <span className="label">Aylık Gerekli</span>
            <span className="value">~{formatCurrency(monthlyRequired, currency)}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoalCard;
