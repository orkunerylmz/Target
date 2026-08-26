import React, { useState, useEffect } from "react";
import { Goal } from "../types/goal";
import { AppSettings } from "../types/settings";
import GoalCard from "../components/GoalCard";
import Modal from "../components/Modal";
import { PlusIcon, TargetIcon } from "../components/Icons";
import {
  formatInputNumber,
  parseInputNumber,
  CurrencyCode,
  convertCurrency,
  fetchExchangeRatesInTRY,
  DEFAULT_RATES_IN_TRY,
} from "../utils/currency";
import { formatTurkishDate } from "../utils/date";
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
  targetDate: undefined,
  showOnDashboard: true,
  currency: "TRY",
};

const Goals: React.FC<GoalsProps> = ({ goals, settings, onGoalsChange }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [formData, setFormData] = useState<Omit<Goal, "id">>(emptyGoal);
  const [ratesInTry, setRatesInTry] = useState<Record<CurrencyCode, number>>(DEFAULT_RATES_IN_TRY);

  useEffect(() => {
    fetchExchangeRatesInTRY().then((data) => {
      setRatesInTry({
        TRY: 1.0,
        USD: data.usdInTry,
        EUR: data.eurInTry,
      });
    });
  }, []);

  // Split amount states for Create / Edit Modal (Main + Cents/Kuruş)
  const [targetMain, setTargetMain] = useState<number | "">("");
  const [targetCents, setTargetCents] = useState<string>("");
  const [savedMain, setSavedMain] = useState<number | "">("");
  const [savedCents, setSavedCents] = useState<string>("");

  // Savings modal
  const [savingsGoal, setSavingsGoal] = useState<Goal | null>(null);
  const [savingsMain, setSavingsMain] = useState<string>("");
  const [savingsCents, setSavingsCents] = useState<string>("");

  const handleCurrencySwitch = (newCurr: CurrencyCode) => {
    const oldCurr = (formData.currency || "TRY") as CurrencyCode;
    if (newCurr === oldCurr) return;

    // Convert target amount
    const currentTarget = (typeof targetMain === "number" ? targetMain : 0) + (parseInt(targetCents || "0", 10) / 100);
    if (currentTarget > 0) {
      const converted = convertCurrency(currentTarget, oldCurr, newCurr, ratesInTry);
      const tMain = Math.floor(converted);
      const tCents = Math.round((converted % 1) * 100);
      setTargetMain(tMain > 0 ? tMain : "");
      setTargetCents(tCents > 0 ? tCents.toString().padStart(2, "0") : "");
    }

    // Convert saved amount
    const currentSaved = (typeof savedMain === "number" ? savedMain : 0) + (parseInt(savedCents || "0", 10) / 100);
    if (currentSaved > 0) {
      const converted = convertCurrency(currentSaved, oldCurr, newCurr, ratesInTry);
      const sMain = Math.floor(converted);
      const sCents = Math.round((converted % 1) * 100);
      setSavedMain(sMain > 0 ? sMain : "");
      setSavedCents(sCents > 0 ? sCents.toString().padStart(2, "0") : "");
    }

    setFormData({ ...formData, currency: newCurr });
  };

  const openCreateModal = () => {
    setEditingGoal(null);
    setFormData({
      ...emptyGoal,
      currency: settings.currency || "TRY",
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
      targetDate: goal.targetDate,
      icon: goal.icon,
      showOnDashboard: goal.showOnDashboard !== false,
      currency: goal.currency || settings.currency || "TRY",
    });

    const tMain = Math.floor(goal.targetAmount);
    const tCents = Math.round((goal.targetAmount % 1) * 100);
    setTargetMain(tMain > 0 ? tMain : "");
    setTargetCents(tCents > 0 ? tCents.toString().padStart(2, "0") : "");

    const sMain = Math.floor(goal.savedAmount);
    const sCents = Math.round((goal.savedAmount % 1) * 100);
    setSavedMain(sMain > 0 ? sMain : "");
    setSavedCents(sCents > 0 ? sCents.toString().padStart(2, "0") : "");

    setShowModal(true);
  };

  const handleSave = async () => {
    const fullTarget = (typeof targetMain === "number" ? targetMain : 0) + (parseInt(targetCents || "0", 10) / 100);
    const fullSaved = (typeof savedMain === "number" ? savedMain : 0) + (parseInt(savedCents || "0", 10) / 100);

    if (!formData.name || fullTarget <= 0) return;

    const payload = {
      ...formData,
      targetAmount: fullTarget,
      savedAmount: fullSaved,
      currency: formData.currency || settings.currency || "TRY",
    };

    let updated: Goal[];

    if (editingGoal) {
      updated = goals.map((g) =>
        g.id === editingGoal.id ? { ...g, ...payload } : g
      );
    } else {
      const newGoal: Goal = {
        id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        ...payload,
      };
      updated = [...goals, newGoal];
    }

    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    setShowModal(false);
    setFormData(emptyGoal);
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

    const updated = goals.map((g) =>
      g.id === savingsGoal.id
        ? { ...g, savedAmount: g.savedAmount + totalAdd }
        : g
    );
    await invoke("save_goals", { goals: updated });
    onGoalsChange(updated);
    setSavingsGoal(null);
    setSavingsMain("");
    setSavingsCents("");
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
              onAddSavings={(goal) => {
                setSavingsGoal(goal);
                setSavingsMain("");
                setSavingsCents("");
              }}
              onToggleDashboard={handleToggleDashboard}
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
        <div className="form-actions">
          <button
            className="btn btn-secondary"
            onClick={() => {
              setSavingsGoal(null);
              setSavingsMain("");
              setSavingsCents("");
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

export default Goals;
