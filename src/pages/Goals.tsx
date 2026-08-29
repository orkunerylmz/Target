import React, { useState, useEffect } from "react";
import { Goal } from "../types/goal";
import { AppSettings } from "../types/settings";
import GoalCard from "../components/GoalCard";
import Modal from "../components/Modal";
import { PlusIcon, TargetIcon } from "../components/Icons";
import {
  formatCurrency,
  formatInputNumber,
  parseInputNumber,
  CurrencyCode,
  convertCurrency,
  DEFAULT_RATES_IN_TRY,
  fetchExchangeRatesInTRY,
} from "../utils/currency";
import { formatTurkishDate } from "../utils/date";
import { triggerConfetti } from "../utils/confetti";
import { TransactionModal } from "../components/TransactionModal";
import { SimulationModal } from "../components/SimulationModal";
import { invoke } from "@tauri-apps/api/core";

interface GoalsProps {
  goals: Goal[];
  settings: AppSettings;
  onGoalsChange: (goals: Goal[]) => void;
}

const emptyGoal: Omit<Goal, "id"> = {
  name: "",
  targetAmount: 0,
  savedAmount: 0,
  currency: "TRY",
  targetDate: undefined,
  showOnDashboard: true,
};

const Goals: React.FC<GoalsProps> = ({ goals, settings, onGoalsChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<Omit<Goal, "id">>(emptyGoal);

  // Live Exchange Rates
  const [ratesInTry, setRatesInTry] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES_IN_TRY);

  useEffect(() => {
    fetchExchangeRatesInTRY().then((info) => {
      setRatesInTry({
        TRY: 1.0,
        USD: info.usdInTry,
        EUR: info.eurInTry,
      });
    });
  }, []);

  // Split-field states for Create / Edit Modal
  const [targetMain, setTargetMain] = useState<number | "">("");
  const [targetCents, setTargetCents] = useState<string>("");
  const [savedMain, setSavedMain] = useState<number | "">("");
  const [savedCents, setSavedCents] = useState<string>("");

  // Add Savings Modal State
  const [savingsGoal, setSavingsGoal] = useState<Goal | null>(null);
  const [savingsMain, setSavingsMain] = useState<string>("");
  const [savingsCents, setSavingsCents] = useState<string>("");
  const [savingsNote, setSavingsNote] = useState<string>("");

  // Transaction Ledger Modal State
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);

  // Simulation Modal State
  const [showSimulation, setShowSimulation] = useState<boolean>(false);
  const [simulationGoalId, setSimulationGoalId] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormData({
      ...emptyGoal,
      currency: (settings.currency || "TRY") as CurrencyCode,
    });
    setTargetMain("");
    setTargetCents("");
    setSavedMain("");
    setSavedCents("");
    setShowModal(true);
  };

  const openEditModal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      name: goal.name,
      targetAmount: goal.targetAmount,
      savedAmount: goal.savedAmount,
      currency: goal.currency || "TRY",
      targetDate: goal.targetDate,
      showOnDashboard: goal.showOnDashboard !== false,
      category: goal.category,
      transactions: goal.transactions,
    });

    const targetVal = goal.targetAmount;
    setTargetMain(Math.floor(targetVal));
    const targetCentsVal = Math.round((targetVal % 1) * 100);
    setTargetCents(targetCentsVal > 0 ? targetCentsVal.toString().padStart(2, "0") : "");

    const savedVal = goal.savedAmount;
    setSavedMain(Math.floor(savedVal));
    const savedCentsVal = Math.round((savedVal % 1) * 100);
    setSavedCents(savedCentsVal > 0 ? savedCentsVal.toString().padStart(2, "0") : "");

    setShowModal(true);
  };

  const handleCurrencySwitch = (newCurrency: CurrencyCode) => {
    const oldCurrency = (formData.currency || "TRY") as CurrencyCode;
    if (oldCurrency === newCurrency) return;

    const currentTarget = (typeof targetMain === "number" ? targetMain : 0) + (parseFloat(targetCents) || 0) / 100;
    const currentSaved = (typeof savedMain === "number" ? savedMain : 0) + (parseFloat(savedCents) || 0) / 100;

    const convertedTarget = convertCurrency(currentTarget, oldCurrency, newCurrency, ratesInTry);
    const convertedSaved = convertCurrency(currentSaved, oldCurrency, newCurrency, ratesInTry);

    setFormData({ ...formData, currency: newCurrency });

    if (currentTarget > 0) {
      setTargetMain(Math.floor(convertedTarget));
      const cents = Math.round((convertedTarget % 1) * 100);
      setTargetCents(cents > 0 ? cents.toString().padStart(2, "0") : "");
    }

    if (currentSaved > 0) {
      setSavedMain(Math.floor(convertedSaved));
      const cents = Math.round((convertedSaved % 1) * 100);
      setSavedCents(cents > 0 ? cents.toString().padStart(2, "0") : "");
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    const finalTarget = (typeof targetMain === "number" ? targetMain : 0) + (parseFloat(targetCents) || 0) / 100;
    const finalSaved = (typeof savedMain === "number" ? savedMain : 0) + (parseFloat(savedCents) || 0) / 100;

    let updated: Goal[];
    if (editingGoal) {
      updated = goals.map((g) =>
        g.id === editingGoal.id
          ? {
              ...g,
              ...formData,
              targetAmount: finalTarget,
              savedAmount: finalSaved,
            }
          : g
      );
    } else {
      const newGoal: Goal = {
        ...formData,
        id: `goal_${Date.now()}`,
        targetAmount: finalTarget,
        savedAmount: finalSaved,
        transactions: finalSaved > 0 ? [
          {
            id: `tx_${Date.now()}`,
            date: new Date().toISOString(),
            amount: finalSaved,
            type: "deposit",
            note: "Başlangıç birikimi",
          }
        ] : [],
      };
      updated = [...goals, newGoal];
    }

    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    setShowModal(false);
  };

  const handleDelete = async (id: string) => {
    const updated = goals.filter((g) => g.id !== id);
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
  };

  const handleAddSavings = async () => {
    if (!savingsGoal) return;
    const mainPart = parseFloat(savingsMain) || 0;
    const centsPart = (parseFloat(savingsCents) || 0) / 100;
    const addAmount = mainPart + centsPart;
    if (addAmount <= 0) return;

    const prevSaved = savingsGoal.savedAmount;
    const newSaved = prevSaved + addAmount;

    const newTx = {
      id: `tx_${Date.now()}`,
      date: new Date().toISOString(),
      amount: addAmount,
      type: "deposit" as const,
      note: savingsNote.trim() || undefined,
    };

    const updated = goals.map((g) =>
      g.id === savingsGoal.id
        ? {
            ...g,
            savedAmount: newSaved,
            transactions: [newTx, ...(g.transactions || [])],
          }
        : g
    );

    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);

    if (prevSaved < savingsGoal.targetAmount && newSaved >= savingsGoal.targetAmount) {
      triggerConfetti();
    }

    setSavingsGoal(null);
    setSavingsMain("");
    setSavingsCents("");
    setSavingsNote("");
  };

  const handleToggleDashboard = async (goal: Goal) => {
    const updated = goals.map((g) =>
      g.id === goal.id
        ? { ...g, showOnDashboard: g.showOnDashboard === false ? true : false }
        : g
    );
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
  };

  const handleUpdateGoalFromTx = async (updatedGoal: Goal) => {
    const updated = goals.map((g) => (g.id === updatedGoal.id ? updatedGoal : g));
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    if (historyGoal && historyGoal.id === updatedGoal.id) {
      setHistoryGoal(updatedGoal);
    }
  };

  const activeCurrency = formData.currency || settings.currency || "TRY";

  return (
    <div className="page goals-page">
      <div className="page-header">
        <h2 className="page-title">Hedefler</h2>
        {goals.length > 0 && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            <PlusIcon size={16} />
            <span>Yeni Hedef</span>
          </button>
        )}
      </div>

      {goals.length === 0 ? (
        <div className="empty-state-banner" onClick={openCreateModal}>
          <div className="empty-state-banner-left">
            <span className="empty-state-banner-icon">
              <TargetIcon size={20} />
            </span>
            <div className="empty-state-banner-text">
              <span className="empty-state-banner-title">Henüz bir hedef oluşturmadınız</span>
              <span className="empty-state-banner-desc">İlk hedefinizi ekleyerek birikimlerinizi planlamaya hemen başlayın.</span>
            </div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); openCreateModal(); }}>
            <PlusIcon size={14} />
            <span>Yeni Hedef</span>
          </button>
        </div>
      ) : (
        <div className="goals-list">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              currency={goal.currency || "TRY"}
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
            />
          ))}
        </div>
      )}

      {/* Create / Edit Goal Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setFormData(emptyGoal);
          setEditingGoal(null);
          setTargetMain("");
          setTargetCents("");
          setSavedMain("");
          setSavedCents("");
        }}
        title={editingGoal ? "Hedefi Düzenle" : "Yeni Hedef"}
      >
        <div className="form-group">
          <label>Hedef Adı</label>
          <input
            type="text"
            className="form-input"
            placeholder="Hedef adını girin"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                className={`modal-currency-btn ${activeCurrency === curr ? "active" : ""}`}
                onClick={() => handleCurrencySwitch(curr)}
              >
                {curr === "TRY" ? "₺ TRY" : curr === "USD" ? "$ USD" : "€ EUR"}
              </button>
            ))}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Hedef Tutarı ({activeCurrency})</label>
            <div className="amount-combined-input">
              <input
                type="text"
                inputMode="numeric"
                className="amount-main-field"
                placeholder="0"
                value={targetMain !== "" ? formatInputNumber(targetMain, activeCurrency) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setTargetMain(val === "" ? "" : parseInputNumber(val));
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
                  const clean = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setTargetCents(clean);
                }}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Mevcut Birikim ({activeCurrency})</label>
            <div className="amount-combined-input">
              <input
                type="text"
                inputMode="numeric"
                className="amount-main-field"
                placeholder="0"
                value={savedMain !== "" ? formatInputNumber(savedMain, activeCurrency) : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setSavedMain(val === "" ? "" : parseInputNumber(val));
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
                  const clean = e.target.value.replace(/\D/g, "").slice(0, 2);
                  setSavedCents(clean);
                }}
              />
            </div>
          </div>
        </div>

        <div className="form-group">
          <div className="form-label-row">
            <label>Hedef Tarihi (İsteğe Bağlı)</label>
            {formData.targetDate && (
              <span className="verbal-date-hint">{formatTurkishDate(formData.targetDate)}</span>
            )}
          </div>
          <input
            type="date"
            className="form-input"
            value={formData.targetDate || ""}
            onChange={(e) =>
              setFormData({ ...formData, targetDate: e.target.value || undefined })
            }
          />
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={formData.showOnDashboard !== false}
              onChange={(e) =>
                setFormData({ ...formData, showOnDashboard: e.target.checked })
              }
            />
            <span>Bu hedefi Dashboard'da göster</span>
          </label>
        </div>

        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setShowModal(false);
              setFormData(emptyGoal);
              setEditingGoal(null);
              setTargetMain("");
              setTargetCents("");
              setSavedMain("");
              setSavedCents("");
            }}
          >
            İptal
          </button>
          <button className="btn btn-primary" onClick={handleSave}>
            {editingGoal ? "Güncelle" : "Kaydet"}
          </button>
        </div>
      </Modal>

      {/* Add Savings Modal */}
      <Modal
        isOpen={savingsGoal !== null}
        onClose={() => {
          setSavingsGoal(null);
          setSavingsMain("");
          setSavingsCents("");
          setSavingsNote("");
        }}
        title={`Birikim Ekle – ${savingsGoal?.name || ""}`}
      >
        <div className="form-group">
          <label>Eklenecek Tutar ({savingsGoal?.currency || settings.currency || "TRY"})</label>
          <div className="amount-combined-input">
            <input
              type="text"
              inputMode="numeric"
              className="amount-main-field"
              placeholder="0"
              value={savingsMain ? formatInputNumber(savingsMain, savingsGoal?.currency || settings.currency || "TRY") : ""}
              onChange={(e) => setSavingsMain(parseInputNumber(e.target.value).toString())}
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
                const clean = e.target.value.replace(/\D/g, "").slice(0, 2);
                setSavingsCents(clean);
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label>İşlem Notu (Opsiyonel)</label>
          <input
            type="text"
            className="form-input"
            placeholder="Örn: Maaş günü aktarımı, Ekstra prim geliri"
            value={savingsNote}
            onChange={(e) => setSavingsNote(e.target.value)}
          />
        </div>

        {savingsGoal && (
          <div className="savings-preview">
            <div className="savings-preview-row">
              <span>Mevcut Birikim:</span>
              <span className="value">
                {formatCurrency(savingsGoal.savedAmount, (savingsGoal.currency || "TRY") as CurrencyCode)}
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
                  (savingsGoal.currency || "TRY") as CurrencyCode
                )}
              </span>
            </div>
          </div>
        )}

        <div className="form-actions">
          <button
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
          <button className="btn btn-primary" onClick={handleAddSavings}>
            Ekle
          </button>
        </div>
      </Modal>

      {/* Transaction History Modal */}
      <TransactionModal
        goal={historyGoal}
        isOpen={historyGoal !== null}
        onClose={() => setHistoryGoal(null)}
        onUpdateGoal={handleUpdateGoalFromTx}
      />

      {/* Simulation Modal */}
      <SimulationModal
        isOpen={showSimulation}
        onClose={() => setShowSimulation(false)}
        goals={goals}
        initialGoalId={simulationGoalId || undefined}
        defaultCurrency={settings.currency as CurrencyCode}
        ratesInTry={ratesInTry}
      />
    </div>
  );
};

export default Goals;
