import React, { useState, useEffect } from "react";
import { Goal, Transaction } from "../types/goal";
import { AppSettings } from "../types/settings";
import { getConvertedTotalStats, getGoalsNeedingAttention } from "../utils/calculations";
import {
  formatCurrency,
  formatInputNumber,
  parseInputNumber,
  CurrencyCode,
  convertCurrency,
  fetchExchangeRatesInTRY,
  DEFAULT_RATES_IN_TRY,
} from "../utils/currency";
import GoalCard from "../components/GoalCard";
import Modal from "../components/Modal";
import {
  OverallProgressChart,
  MonthlyTrendChart,
} from "../components/Charts";
import { FormattedAiMessage } from "../components/FormattedAiMessage";
import { formatTurkishDate } from "../utils/date";
import { triggerConfetti } from "../utils/confetti";
import { TransactionModal } from "../components/TransactionModal";
import { SimulationModal } from "../components/SimulationModal";
import {
  SparklesIcon,
  PinIcon,
  RefreshIcon,
  CloseIcon,
  PlusIcon,
  TargetIcon,
  CalculatorIcon,
  BarChartIcon,
  TrendUpIcon,
} from "../components/Icons";
import { invoke } from "@tauri-apps/api/core";
import { aiService } from "../services/aiService";

interface DashboardProps {
  goals: Goal[];
  settings: AppSettings;
  onGoalsChange: (goals: Goal[]) => void;
  onNavigate: (page: "goals" | "notifications" | "settings") => void;
  onOpenSimulation?: () => void;
}

const emptyGoal: Omit<Goal, "id"> = {
  name: "",
  targetAmount: 0,
  savedAmount: 0,
  targetDate: undefined,
  showOnDashboard: true,
  currency: "TRY",
  category: "other",
};

const CURRENCIES: CurrencyCode[] = ["TRY", "USD", "EUR"];
type ChartTab = "progress" | "trend";

const Dashboard: React.FC<DashboardProps> = ({
  goals,
  settings,
  onGoalsChange,
  onNavigate,
}) => {
  // Currency state
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencyCode>(settings.currency as CurrencyCode || "TRY");
  const [ratesInTry, setRatesInTry] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES_IN_TRY);
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>("progress");

  // Simulation & Transaction Modal States
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationGoalId, setSimulationGoalId] = useState<string | null>(null);
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);

  useEffect(() => {
    fetchExchangeRatesInTRY().then((data) => {
      setRatesInTry({
        TRY: 1.0,
        USD: data.usdInTry,
        EUR: data.eurInTry,
      });
    });
  }, []);

  useEffect(() => {
    if (settings.currency) {
      setSelectedCurrency(settings.currency as CurrencyCode);
    }
  }, [settings.currency]);

  // Overall calculated portfolio values converted to selected viewing currency
  const stats = getConvertedTotalStats(goals, selectedCurrency, ratesInTry);
  const displaySaved = stats.totalSaved;
  const displayTarget = stats.totalTarget;
  const displayRemaining = stats.totalRemaining;

  const overallPct = stats.totalTarget > 0
    ? Math.min(100, Math.round((stats.totalSaved / stats.totalTarget) * 100))
    : 0;

  // Filter goals pinned to dashboard
  const dashboardGoals = goals.filter((g) => g.showOnDashboard !== false);
  const attentionGoals = getGoalsNeedingAttention(goals);

  // Target AI state
  const [aiMessage, setAiMessage] = useState<string>(
    () => localStorage.getItem(`target_ai_message_${selectedCurrency}`) || localStorage.getItem("target_ai_message") || ""
  );
  const [aiLoading, setAiLoading] = useState<boolean>(() => aiService.isLoading("main"));

  useEffect(() => {
    const unsubscribe = aiService.subscribe("main", (loading, text) => {
      setAiLoading(loading);
      setAiMessage(text);
    });
    setAiLoading(aiService.isLoading("main"));
    const cached = localStorage.getItem(`target_ai_message_${selectedCurrency}`) || localStorage.getItem("target_ai_message") || "";
    setAiMessage(cached);
    return () => unsubscribe();
  }, [selectedCurrency]);

  const handleCloseAi = () => {
    setAiMessage("");
    aiService.clearMainAiAdvice(selectedCurrency);
  };

  const handleGetAiMotivation = async () => {
    aiService.requestMainAiAdvice(selectedCurrency, ratesInTry);
  };

  // Add Savings modal state
  const [savingsGoal, setSavingsGoal] = useState<Goal | null>(null);
  const [savingsMain, setSavingsMain] = useState<string>("");
  const [savingsCents, setSavingsCents] = useState<string>("");
  const [savingsNote, setSavingsNote] = useState<string>("");

  // Edit Goal modal state
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editFormData, setEditFormData] = useState<Omit<Goal, "id">>(emptyGoal);
  const [targetMain, setTargetMain] = useState<number | "">("");
  const [targetCents, setTargetCents] = useState<string>("");
  const [savedMain, setSavedMain] = useState<number | "">("");
  const [savedCents, setSavedCents] = useState<string>("");

  const handleEditCurrencySwitch = (newCurr: CurrencyCode) => {
    const oldCurr = (editFormData.currency || "TRY") as CurrencyCode;
    if (newCurr === oldCurr) return;

    const currentTarget = (typeof targetMain === "number" ? targetMain : 0) + (parseInt(targetCents || "0", 10) / 100);
    if (currentTarget > 0) {
      const converted = convertCurrency(currentTarget, oldCurr, newCurr, ratesInTry);
      const tMain = Math.floor(converted);
      const tCents = Math.round((converted % 1) * 100);
      setTargetMain(tMain > 0 ? tMain : "");
      setTargetCents(tCents > 0 ? tCents.toString().padStart(2, "0") : "");
    }

    const currentSaved = (typeof savedMain === "number" ? savedMain : 0) + (parseInt(savedCents || "0", 10) / 100);
    if (currentSaved > 0) {
      const converted = convertCurrency(currentSaved, oldCurr, newCurr, ratesInTry);
      const sMain = Math.floor(converted);
      const sCents = Math.round((converted % 1) * 100);
      setSavedMain(sMain > 0 ? sMain : "");
      setSavedCents(sCents > 0 ? sCents.toString().padStart(2, "0") : "");
    }

    setEditFormData({ ...editFormData, currency: newCurr });
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setEditFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      targetDate: goal.targetDate,
      icon: goal.icon,
      category: goal.category || "other",
      showOnDashboard: goal.showOnDashboard !== false,
      currency: goal.currency || settings.currency || "TRY",
      transactions: goal.transactions || [],
    });

    const tMain = Math.floor(goal.targetAmount);
    const tCents = Math.round((goal.targetAmount % 1) * 100);
    setTargetMain(tMain > 0 ? tMain : "");
    setTargetCents(tCents > 0 ? tCents.toString().padStart(2, "0") : "");

    const sMain = Math.floor(goal.savedAmount);
    const sCents = Math.round((goal.savedAmount % 1) * 100);
    setSavedMain(sMain > 0 ? sMain : "");
    setSavedCents(sCents > 0 ? sCents.toString().padStart(2, "0") : "");
  };

  const handleSaveEditedGoal = async () => {
    if (!editingGoal) return;
    const fullTarget = (typeof targetMain === "number" ? targetMain : 0) + (parseInt(targetCents || "0", 10) / 100);
    const fullSaved = (typeof savedMain === "number" ? savedMain : 0) + (parseInt(savedCents || "0", 10) / 100);

    if (!editFormData.name || fullTarget <= 0) return;

    const payload = {
      ...editFormData,
      targetAmount: fullTarget,
      savedAmount: fullSaved,
      currency: editFormData.currency || settings.currency || "TRY",
      category: editFormData.category || "other",
    };

    const updated = goals.map((g) =>
      g.id === editingGoal.id ? { ...g, ...payload } : g
    );

    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    setEditingGoal(null);
    setTargetMain("");
    setTargetCents("");
    setSavedMain("");
    setSavedCents("");
  };

  const handleDelete = async (goalId: string) => {
    const updated = goals.filter((g) => g.id !== goalId);
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
  };

  const handleToggleDashboard = async (goal: Goal) => {
    const updated = goals.map((g) =>
      g.id === goal.id
        ? { ...g, showOnDashboard: !g.showOnDashboard }
        : g
    );
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
  };

  const handleAddSavings = async () => {
    if (!savingsGoal) return;
    const mainAmount = parseInputNumber(savingsMain);
    const centsAmount = parseInt(savingsCents || "0", 10) / 100;
    const totalAdd = mainAmount + centsAmount;
    if (totalAdd <= 0) return;

    const newTx: Transaction = {
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      date: new Date().toISOString(),
      amount: totalAdd,
      type: "deposit",
      note: savingsNote.trim() || undefined,
    };

    const newTotal = savingsGoal.savedAmount + totalAdd;
    const wasIncomplete = savingsGoal.savedAmount < savingsGoal.targetAmount;
    const isNowComplete = newTotal >= savingsGoal.targetAmount;

    const updated = goals.map((g) =>
      g.id === savingsGoal.id
        ? {
            ...g,
            savedAmount: newTotal,
            transactions: [...(g.transactions || []), newTx],
          }
        : g
    );

    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);

    if (wasIncomplete && isNowComplete) {
      triggerConfetti();
    }

    setSavingsGoal(null);
    setSavingsMain("");
    setSavingsCents("");
    setSavingsNote("");
  };

  const handleUpdateGoalFromTx = async (updatedGoal: Goal) => {
    const updated = goals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g));
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    setHistoryGoal(updatedGoal);
  };

  return (
    <div className="page dashboard-page clean-dashboard">
      {/* ── Page Header ── */}
      <div className="clean-header">
        <div className="clean-header-left">
          <h2 className="clean-title">Genel Bakış</h2>
          <span className="clean-subtitle">
            {new Date().toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              weekday: "long",
            })}
          </span>
        </div>

        <div className="clean-header-actions">
          {/* Financial Simulation Button */}
          <button
            type="button"
            className="btn btn-secondary btn-sm sim-header-btn"
            onClick={() => {
              setSimulationGoalId(goals[0]?.id || null);
              setShowSimulation(true);
            }}
          >
            <CalculatorIcon size={15} />
            <span>Simülasyon</span>
          </button>

          {/* Currency Switcher */}
          <div className="clean-currency-toggle">
            {CURRENCIES.map((curr) => (
              <button
                key={curr}
                type="button"
                className={`clean-curr-btn ${selectedCurrency === curr ? "active" : ""}`}
                onClick={() => setSelectedCurrency(curr)}
              >
                {curr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3 Primary Metric Cards (Airy, Minimal & Clear) ── */}
      <div className="clean-metrics-grid">
        {/* 1. Toplam Birikim */}
        <div className="clean-metric-card highlight-card">
          <div className="clean-metric-top">
            <span className="clean-metric-label">Toplam Birikim</span>
            <span className="clean-pct-badge">%{overallPct}</span>
          </div>
          <div className="clean-metric-value-row">
            <span className="clean-metric-value">{formatCurrency(displaySaved, selectedCurrency)}</span>
          </div>
          <div className="clean-metric-progress-track">
            <div
              className="clean-metric-progress-fill"
              style={{ width: `${overallPct}%` }}
            />
          </div>
        </div>

        {/* 2. Hedeflenen Tutar */}
        <div className="clean-metric-card">
          <div className="clean-metric-top">
            <span className="clean-metric-label">Hedeflenen Tutar</span>
            <span className="clean-count-badge">{goals.length} Hedef</span>
          </div>
          <div className="clean-metric-value-row">
            <span className="clean-metric-value">{formatCurrency(displayTarget, selectedCurrency)}</span>
          </div>
          <span className="clean-metric-sub">
            {dashboardGoals.length} hedef ana ekrana sabitlendi
          </span>
        </div>

        {/* 3. Kalan Miktar */}
        <div className="clean-metric-card">
          <div className="clean-metric-top">
            <span className="clean-metric-label">Kalan Mesafe</span>
          </div>
          <div className="clean-metric-value-row">
            <span className="clean-metric-value">{formatCurrency(displayRemaining, selectedCurrency)}</span>
          </div>
          <span className="clean-metric-sub">
            Hedeflerin tamamlanmasına kalan bütçe
          </span>
        </div>
      </div>

      {/* ── Target AI Assistant (Quiet & Minimal) ── */}
      <div className="clean-ai-card">
        <div className="clean-ai-header">
          <div className="clean-ai-title-wrap">
            <span className="clean-ai-icon">
              <SparklesIcon size={16} />
            </span>
            <span className="clean-ai-title">Target AI • Portföy Danışmanı</span>
          </div>

          <div className="clean-ai-btn-group">
            <button
              type="button"
              className="btn btn-secondary btn-sm clean-ai-action-btn"
              onClick={handleGetAiMotivation}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <RefreshIcon size={12} className="spin-animate" />
                  <span>Analiz Ediliyor...</span>
                </>
              ) : aiMessage ? (
                <>
                  <RefreshIcon size={12} />
                  <span>Yenile</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={13} />
                  <span>Analiz Et</span>
                </>
              )}
            </button>

            {aiMessage && !aiLoading && (
              <button
                type="button"
                className="btn-icon clean-ai-close"
                onClick={handleCloseAi}
                title="Kapat"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        </div>

        {aiLoading ? (
          <div className="clean-ai-loading">
            <span className="loading-shimmer" />
            <span>Target AI portföyünüzü analiz ediyor ve stratejinizi hazırlıyor...</span>
          </div>
        ) : aiMessage ? (
          <div className="clean-ai-content">
            <FormattedAiMessage text={aiMessage} />
          </div>
        ) : null}
      </div>

      {/* ── Analytics Visualizations with Tab Switcher ── */}
      {goals.length > 0 && (
        <div className="analytics-section-wrapper">
          <div className="analytics-tab-header">
            <div className="analytics-tabs">
              <button
                type="button"
                className={`analytics-tab-btn ${activeChartTab === "progress" ? "active" : ""}`}
                onClick={() => setActiveChartTab("progress")}
              >
                <TrendUpIcon size={15} />
                <span>Birikim İlerlemesi</span>
              </button>
              <button
                type="button"
                className={`analytics-tab-btn ${activeChartTab === "trend" ? "active" : ""}`}
                onClick={() => setActiveChartTab("trend")}
              >
                <BarChartIcon size={15} />
                <span>Aylık Birikim Hızı</span>
              </button>
            </div>
          </div>

          <div className="analytics-tab-body">
            {activeChartTab === "progress" && (
              <OverallProgressChart goals={goals} currency={selectedCurrency} ratesInTry={ratesInTry} />
            )}
            {activeChartTab === "trend" && (
              <MonthlyTrendChart goals={goals} currency={selectedCurrency} ratesInTry={ratesInTry} />
            )}
          </div>
        </div>
      )}

      {/* ── Pinned Goals Section / Empty State ── */}
      <div className="clean-goals-section">
        {goals.length > 0 ? (
          <>
            {attentionGoals.length > 0 && (
              <div className="status-banner status-error" style={{ marginBottom: "16px" }}>
                <span>⚠️ {attentionGoals.length} hedefinizin vadesi yaklaşıyor veya ilerleme temposu geride kaldı.</span>
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ marginLeft: "auto" }}
                  onClick={() => onNavigate("goals")}
                >
                  İncele
                </button>
              </div>
            )}

            <div className="section-header">
              <h3 className="section-title">
                Dashboard Hedefleri ({dashboardGoals.length})
              </h3>
              <button
                className="btn-link"
                onClick={() => onNavigate("goals")}
              >
                Tüm Hedefleri Yönet
              </button>
            </div>

            {dashboardGoals.length > 0 ? (
              <div className="goals-list">
                {dashboardGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    currency={selectedCurrency}
                    ratesInTry={ratesInTry}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onAddSavings={(g) => {
                      setSavingsGoal(g);
                      setSavingsMain("");
                      setSavingsCents("");
                      setSavingsNote("");
                    }}
                    onToggleDashboard={handleToggleDashboard}
                    onOpenTransactions={(g) => setHistoryGoal(g)}
                    onOpenSimulation={(g) => {
                      setSimulationGoalId(g.id);
                      setShowSimulation(true);
                    }}
                    variant="default"
                  />
                ))}
              </div>
            ) : (
              <div className="empty-state-banner" onClick={() => onNavigate("goals")}>
                <div className="empty-state-banner-left">
                  <span className="empty-state-banner-icon">
                    <PinIcon size={18} />
                  </span>
                  <div className="empty-state-banner-text">
                    <span className="empty-state-banner-title">Dashboard için hedef sabitlenmedi</span>
                    <span className="empty-state-banner-desc">Hedefler sayfasındaki raptiye ikonuna tıklayarak hedeflerinizi buraya sabitleyebilirsiniz.</span>
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={(e) => { e.stopPropagation(); onNavigate("goals"); }}>
                  <span>Hedefleri Yönet</span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* High-End Clean Onboarding State */
          <div className="clean-empty-box" onClick={() => onNavigate("goals")}>
            <div className="clean-empty-icon">
              <TargetIcon size={28} />
            </div>
            <h3 className="clean-empty-title">Henüz Birikim Hedefiniz Yok</h3>
            <p className="clean-empty-desc">
              Hedefinizi belirleyin, birikimlerinizi düzenli takip edin ve yapay zeka analizleriyle motive kalın.
            </p>
            <button
              className="btn btn-primary btn-sm clean-empty-btn"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate("goals");
              }}
            >
              <PlusIcon size={15} />
              <span>İlk Hedefinizi Ekleyin</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Edit Goal Modal on Dashboard ── */}
      <Modal
        isOpen={editingGoal !== null}
        onClose={() => {
          setEditingGoal(null);
          setEditFormData(emptyGoal);
          setTargetMain("");
          setTargetCents("");
          setSavedMain("");
          setSavedCents("");
        }}
        title="Hedefi Düzenle"
        size="lg"
      >
        <div className="form-group">
          <label>Hedef Adı</label>
          <input
            type="text"
            className="form-input"
            placeholder="Hedef adını girin"
            value={editFormData.name}
            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
            autoFocus
          />
        </div>

        {/* Currency Selector in Modal */}
        <div className="form-group">
          <label>Hedef Para Birimi</label>
          <div className="modal-currency-selector">
            {(["TRY", "USD", "EUR"] as const).map((curr) => (
              <button
                key={curr}
                type="button"
                className={`modal-currency-btn ${(editFormData.currency || "TRY") === curr ? "active" : ""}`}
                onClick={() => handleEditCurrencySwitch(curr)}
              >
                {curr === "TRY" ? "₺ TRY" : curr === "USD" ? "$ USD" : "€ EUR"}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Hedef Tutar ({editFormData.currency || "TRY"})</label>
            <div className="amount-combined-input">
              <input
                type="text"
                inputMode="numeric"
                className="amount-main-field"
                placeholder="0"
                value={targetMain !== "" ? formatInputNumber(targetMain, editFormData.currency || "TRY") : ""}
                onChange={(e) => {
                  const val = parseInputNumber(e.target.value);
                  setTargetMain(val > 0 ? val : "");
                }}
              />
              <span className="amount-pipe-divider" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                className="amount-cents-field"
                placeholder="00"
                value={targetCents}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setTargetCents(val);
                }}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Mevcut Birikim ({editFormData.currency || "TRY"})</label>
            <div className="amount-combined-input">
              <input
                type="text"
                inputMode="numeric"
                className="amount-main-field"
                placeholder="0"
                value={savedMain !== "" ? formatInputNumber(savedMain, editFormData.currency || "TRY") : ""}
                onChange={(e) => {
                  const val = parseInputNumber(e.target.value);
                  setSavedMain(val > 0 ? val : "");
                }}
              />
              <span className="amount-pipe-divider" />
              <input
                type="text"
                inputMode="numeric"
                maxLength={2}
                className="amount-cents-field"
                placeholder="00"
                value={savedCents}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setSavedCents(val);
                }}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label>Hedef Tarih (İsteğe Bağlı)</label>
            {editFormData.targetDate && (
              <span className="verbal-date-hint">{formatTurkishDate(editFormData.targetDate)}</span>
            )}
          </div>
          <input
            type="date"
            className="form-input"
            value={editFormData.targetDate || ""}
            onChange={(e) => setEditFormData({ ...editFormData, targetDate: e.target.value || undefined })}
          />
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setEditingGoal(null);
              setEditFormData(emptyGoal);
              setTargetMain("");
              setTargetCents("");
              setSavedMain("");
              setSavedCents("");
            }}
          >
            İptal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveEditedGoal}
          >
            Değişiklikleri Kaydet
          </button>
        </div>
      </Modal>

      {/* ── Add Savings Modal ── */}
      <Modal
        isOpen={savingsGoal !== null}
        onClose={() => {
          setSavingsGoal(null);
          setSavingsMain("");
          setSavingsCents("");
          setSavingsNote("");
        }}
        title={`Birikim Ekle: ${savingsGoal?.name || ""}`}
      >
        <div className="form-group">
          <label>Eklenecek Tutar ({savingsGoal?.currency || selectedCurrency || "TRY"})</label>
          <div className="amount-combined-input">
            <input
              type="text"
              inputMode="numeric"
              className="amount-main-field"
              placeholder="0"
              value={formatInputNumber(savingsMain)}
              onChange={(e) => {
                const val = parseInputNumber(e.target.value);
                setSavingsMain(val > 0 ? val.toString() : "");
              }}
              autoFocus
            />
            <span className="amount-pipe-divider" />
            <input
              type="text"
              inputMode="numeric"
              maxLength={2}
              className="amount-cents-field"
              placeholder="00"
              value={savingsCents}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                setSavingsCents(val);
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label>İşlem Notu (Opsiyonel)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: Maaş günü aktarımı, Ek gelir"
            value={savingsNote}
            onChange={(e) => setSavingsNote(e.target.value)}
          />
        </div>

        {savingsGoal && (
          <div className="savings-preview">
            <div className="savings-preview-row">
              <span>Mevcut Birikim:</span>
              <span className="value">
                {formatCurrency(savingsGoal.savedAmount, (savingsGoal.currency || selectedCurrency || "TRY") as CurrencyCode)}
              </span>
            </div>
            <div className="savings-preview-divider" />
            <div className="savings-preview-row">
              <span>Yeni Toplam:</span>
              <span className="value highlight">
                {formatCurrency(
                  savingsGoal.savedAmount +
                    parseInputNumber(savingsMain) +
                    (parseInt(savingsCents || "0", 10) / 100),
                  (savingsGoal.currency || selectedCurrency || "TRY") as CurrencyCode
                )}
              </span>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSavingsGoal(null);
              setSavingsMain("");
              setSavingsCents("");
              setSavingsNote("");
            }}
          >
            İptal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleAddSavings}
          >
            Birikimi Kaydet
          </button>
        </div>
      </Modal>

      {/* ── Transaction Modal ── */}
      <TransactionModal
        goal={historyGoal}
        isOpen={historyGoal !== null}
        onClose={() => setHistoryGoal(null)}
        onUpdateGoal={handleUpdateGoalFromTx}
      />

      {/* ── Simulation Modal ── */}
      <SimulationModal
        isOpen={showSimulation}
        onClose={() => setShowSimulation(false)}
        goals={goals}
        initialGoalId={simulationGoalId || undefined}
        defaultCurrency={selectedCurrency}
        ratesInTry={ratesInTry}
      />
    </div>
  );
};

export default Dashboard;
