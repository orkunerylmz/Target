import React, { useState, useEffect } from "react";
import { Goal } from "../types/goal";
import { AppSettings } from "../types/settings";
import { getTotalStats } from "../utils/calculations";
import { formatCurrency } from "../utils/currency";
import GoalCard from "../components/GoalCard";
import Modal from "../components/Modal";
import {
  TargetIcon,
  MoneyIcon,
  TrendUpIcon,
  TrendDownIcon,
  SparklesIcon,
  PlusIcon,
} from "../components/Icons";
import { invoke } from "@tauri-apps/api/core";

interface DashboardProps {
  goals: Goal[];
  settings: AppSettings;
  onGoalsChange: (goals: Goal[]) => void;
  onNavigate: (page: "goals") => void;
}

const Dashboard: React.FC<DashboardProps> = ({
  goals,
  settings,
  onGoalsChange,
  onNavigate,
}) => {
  const stats = getTotalStats(goals);
  const featuredGoal = goals.length > 0 ? goals[0] : null;

  const [savingsGoal, setSavingsGoal] = useState<Goal | null>(null);
  const [savingsAmount, setSavingsAmount] = useState("");

  // AI Motivation
  const [aiMessage, setAiMessage] = useState<string>("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);

  useEffect(() => {
    const checkAi = async () => {
      try {
        const available = await invoke<boolean>("check_gemini_available");
        setAiAvailable(available);
      } catch {
        setAiAvailable(false);
      }
    };
    checkAi();
  }, []);

  const handleDelete = async (goalId: string) => {
    const updated = goals.filter((g) => g.id !== goalId);
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
  };

  const handleAddSavings = async () => {
    if (!savingsGoal || !savingsAmount) return;
    const amount = parseFloat(savingsAmount);
    if (isNaN(amount) || amount <= 0) return;

    const updated = goals.map((g) =>
      g.id === savingsGoal.id
        ? { ...g, savedAmount: g.savedAmount + amount }
        : g
    );
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    setSavingsGoal(null);
    setSavingsAmount("");
  };

  const handleGetAiMotivation = async () => {
    setAiLoading(true);
    setAiMessage("");
    try {
      const response = await invoke<string>("get_ai_motivation");
      setAiMessage(response);
    } catch (err: any) {
      setAiMessage(err?.toString() || "AI yanıt veremedi.");
    }
    setAiLoading(false);
  };

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h2 className="page-title">Dashboard</h2>
        <button className="btn btn-primary" onClick={() => onNavigate("goals")}>
          <PlusIcon size={16} />
          <span>Yeni Hedef</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <TargetIcon size={24} />
          </span>
          <div className="stat-info">
            <span className="stat-value">{stats.totalGoals}</span>
            <span className="stat-label">Toplam Hedef</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <MoneyIcon size={24} />
          </span>
          <div className="stat-info">
            <span className="stat-value">
              {formatCurrency(stats.totalTarget, settings.currency)}
            </span>
            <span className="stat-label">Toplam Hedef Tutarı</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <TrendUpIcon size={24} />
          </span>
          <div className="stat-info">
            <span className="stat-value">
              {formatCurrency(stats.totalSaved, settings.currency)}
            </span>
            <span className="stat-label">Toplam Birikim</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <TrendDownIcon size={24} />
          </span>
          <div className="stat-info">
            <span className="stat-value">
              {formatCurrency(stats.totalRemaining, settings.currency)}
            </span>
            <span className="stat-label">Toplam Kalan</span>
          </div>
        </div>
      </div>

      {/* AI Motivation Section */}
      {aiAvailable && (
        <div className="ai-section">
          <div className="ai-header">
            <span className="ai-icon">
              <SparklesIcon size={22} />
            </span>
            <h3>Gemini AI Motivasyon</h3>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleGetAiMotivation}
              disabled={aiLoading}
            >
              {aiLoading ? "Düşünülüyor..." : "Motive Et"}
            </button>
          </div>
          {aiMessage && (
            <div className="ai-message">
              <p>{aiMessage}</p>
            </div>
          )}
        </div>
      )}

      {/* Featured Goal */}
      {featuredGoal && (
        <div className="featured-section">
          <h3 className="section-title">Ana Hedef</h3>
          <GoalCard
            goal={featuredGoal}
            currency={settings.currency}
            onEdit={() => onNavigate("goals")}
            onDelete={handleDelete}
            onAddSavings={setSavingsGoal}
            variant="featured"
          />
        </div>
      )}

      {goals.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">
            <TargetIcon size={48} />
          </span>
          <p>Henüz bir hedef oluşturmadınız.</p>
          <button className="btn btn-primary" onClick={() => onNavigate("goals")}>
            <PlusIcon size={16} />
            <span>İlk Hedefinizi Oluşturun</span>
          </button>
        </div>
      )}

      {/* Add Savings Modal */}
      <Modal
        isOpen={savingsGoal !== null}
        onClose={() => {
          setSavingsGoal(null);
          setSavingsAmount("");
        }}
        title={`Birikim Ekle – ${savingsGoal?.name || ""}`}
      >
        <div className="form-group">
          <label>Eklenecek Tutar</label>
          <input
            type="number"
            className="form-input"
            placeholder="Örn: 2500"
            value={savingsAmount}
            onChange={(e) => setSavingsAmount(e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSavingsGoal(null);
              setSavingsAmount("");
            }}
          >
            İptal
          </button>
          <button className="btn btn-primary" onClick={handleAddSavings}>
            Ekle
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Dashboard;
