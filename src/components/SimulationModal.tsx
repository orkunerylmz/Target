import React, { useState, useEffect } from "react";
import { Goal } from "../types/goal";
import {
  formatCurrency,
  CurrencyCode,
  convertCurrency,
  DEFAULT_RATES_IN_TRY,
  formatInputNumber,
  parseInputNumber,
} from "../utils/currency";
import { calculateMonthsRemaining } from "../utils/calculations";
import {
  SparklesIcon,
  RefreshIcon,
} from "./Icons";
import { FormattedAiMessage } from "./FormattedAiMessage";
import Modal from "./Modal";
import { invoke } from "@tauri-apps/api/core";

interface SimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  goals: Goal[];
  initialGoalId?: string;
  defaultCurrency?: CurrencyCode;
  ratesInTry?: Record<CurrencyCode, number>;
}

const TURKISH_MONTHS = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"
];

export const SimulationModal: React.FC<SimulationModalProps> = ({
  isOpen,
  onClose,
  goals,
  initialGoalId,
  defaultCurrency = "TRY",
  ratesInTry = DEFAULT_RATES_IN_TRY,
}) => {
  const [selectedGoalId, setSelectedGoalId] = useState<string>(initialGoalId || (goals[0]?.id ?? ""));
  const [currency, setCurrency] = useState<CurrencyCode>(defaultCurrency);

  const activeGoal = goals.find((g) => g.id === selectedGoalId) || goals[0];

  const rawTarget = activeGoal ? activeGoal.targetAmount : 100000;
  const rawSaved = activeGoal ? activeGoal.savedAmount : 20000;
  const goalCurrency = (activeGoal?.currency || currency) as CurrencyCode;

  // Currency conversions
  const targetConverted = convertCurrency(rawTarget, goalCurrency, currency, ratesInTry);
  const savedConverted = convertCurrency(rawSaved, goalCurrency, currency, ratesInTry);
  const netRemaining = Math.max(0, targetConverted - savedConverted);

  // Simulated Monthly Contribution State
  const defaultMonthly = Math.max(Math.round(netRemaining / 12), 1000);
  const [monthlyContribution, setMonthlyContribution] = useState<number | "">(defaultMonthly);

  // AI Advisory State
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Sync state when goal or currency changes
  useEffect(() => {
    const rem = Math.max(0, targetConverted - savedConverted);
    const m = Math.max(Math.round(rem / 12), 500);
    setMonthlyContribution(m);
    setAiText("");
  }, [selectedGoalId, currency]);

  // Mathematical Projection
  const calculateProjection = () => {
    const numericMonthly = typeof monthlyContribution === "number" && monthlyContribution > 0
      ? monthlyContribution
      : 0;

    if (netRemaining <= 0) {
      return {
        monthsNeeded: 0,
        projectedDate: "Hedef Tamamlandı",
        dailyPace: 0,
        monthsSaved: 0,
      };
    }

    if (numericMonthly <= 0) {
      return {
        monthsNeeded: 0,
        projectedDate: "Tasarruf Tutarı Girin",
        dailyPace: 0,
        monthsSaved: 0,
      };
    }

    const monthsNeeded = Math.max(1, Math.ceil(netRemaining / numericMonthly));
    const startDate = new Date();
    const finalDate = new Date(startDate.getFullYear(), startDate.getMonth() + monthsNeeded, startDate.getDate());
    const finalDateVerbal = `${finalDate.getDate()} ${TURKISH_MONTHS[finalDate.getMonth()]} ${finalDate.getFullYear()}`;

    const originalMonths = activeGoal?.targetDate
      ? calculateMonthsRemaining(activeGoal.targetDate) || 12
      : Math.round(targetConverted / numericMonthly);

    const monthsSaved = Math.round((originalMonths - monthsNeeded) * 10) / 10;
    const dailyPace = Math.round((numericMonthly / 30.4) * 100) / 100;

    return {
      monthsNeeded,
      projectedDate: finalDateVerbal,
      dailyPace,
      monthsSaved,
    };
  };

  const projection = calculateProjection();

  const handleFetchAiAdvice = async () => {
    if (!activeGoal) return;
    const numericMonthly = typeof monthlyContribution === "number" && monthlyContribution > 0
      ? monthlyContribution
      : 0;

    if (numericMonthly <= 0) return;

    setAiLoading(true);
    setAiText("");

    try {
      const prompt = `Sen Target uygulamasının kişisel finans danışmanısın.
Kullanıcının simülasyon verileri:
- Hedef: ${activeGoal.name}
- Para Birimi: ${currency}
- Hedef Tutarı: ${formatCurrency(targetConverted, currency)}
- Mevcut Birikim: ${formatCurrency(savedConverted, currency)}
- Kalan Tutar: ${formatCurrency(netRemaining, currency)}
- Planlanan Aylık Tasarruf: ${formatCurrency(numericMonthly, currency)}
- Günlük Tasarruf: ${formatCurrency(projection.dailyPace, currency)}
- Tahmini Bitiş Süresi: ${projection.monthsNeeded} ay (${projection.projectedDate})
- Vade Durumu: ${projection.monthsSaved > 0 ? `${projection.monthsSaved} ay daha erken tamamlanıyor` : "Mevcut vadeden daha uzun sürüyor"}

GÖREV:
Bu simülasyon senaryosunu kısaca değerlendir. Aylık ${formatCurrency(numericMonthly, currency)} tasarruf hedefini sürdürebilmesi için 2 somut ve net öneri yaz. Kesinlikle hiçbir emoji kullanma.`;

      const response = await invoke<string>("ask_gemini", { prompt });
      setAiText(response);
    } catch (err: any) {
      setAiText("AI tavsiyesi alınamadı: " + (err.message || String(err)));
    } finally {
      setAiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hedef Simülasyonu"
      size="xl"
    >
      <div className="sim-spacious-modal">
        {/* Top Filter Bar */}
        <div className="sim-filter-row">
          <div className="sim-field-group flex-1">
            <label className="sim-label">Hedef</label>
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="sim-input-select"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({formatCurrency(g.targetAmount, (g.currency || "TRY") as CurrencyCode)})
                </option>
              ))}
            </select>
          </div>

          <div className="sim-field-group">
            <label className="sim-label">Para Birimi</label>
            <div className="sim-pills-bar">
              {(["TRY", "USD", "EUR"] as CurrencyCode[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`sim-pill-btn ${currency === c ? "active" : ""}`}
                  onClick={() => setCurrency(c)}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Clean Overview Stats Strip */}
        <div className="sim-summary-strip">
          <div className="sim-summary-item">
            <span className="sim-summary-label">Hedef Tutarı</span>
            <span className="sim-summary-val">{formatCurrency(targetConverted, currency)}</span>
          </div>
          <div className="sim-summary-divider" />
          <div className="sim-summary-item">
            <span className="sim-summary-label">Mevcut Birikim</span>
            <span className="sim-summary-val color-success">{formatCurrency(savedConverted, currency)}</span>
          </div>
          <div className="sim-summary-divider" />
          <div className="sim-summary-item">
            <span className="sim-summary-label">Kalan Tutar</span>
            <span className="sim-summary-val color-warning">{formatCurrency(netRemaining, currency)}</span>
          </div>
        </div>

        {/* Main Interactive Control */}
        <div className="sim-main-control-card">
          <div className="sim-control-top">
            <div className="sim-control-heading">
              <span className="sim-control-title">Aylık Tasarruf Tutarı</span>
              <span className="sim-control-desc">Her ay bu hedef için kenara koymayı planladığınız miktar</span>
            </div>

            <div className="sim-amount-input-box">
              <input
                type="text"
                placeholder="0"
                value={monthlyContribution === "" ? "" : formatInputNumber(monthlyContribution, currency)}
                onChange={(e) => {
                  const raw = e.target.value.trim();
                  if (raw === "") {
                    setMonthlyContribution("");
                  } else {
                    const parsed = parseInputNumber(raw);
                    setMonthlyContribution(parsed);
                  }
                }}
                className="sim-amount-field"
              />
              <span className="sim-amount-currency">{currency} / ay</span>
            </div>
          </div>

          <input
            type="range"
            min={Math.max(500, Math.round(netRemaining / 48))}
            max={Math.max(10000, Math.round(netRemaining * 1.5))}
            step={250}
            value={typeof monthlyContribution === "number" ? monthlyContribution : 0}
            onChange={(e) => setMonthlyContribution(Number(e.target.value))}
            className="sim-range-input"
          />
        </div>

        {/* Outcome Display Card */}
        <div className="sim-outcome-panel">
          <div className="sim-outcome-main">
            <div className="sim-outcome-item">
              <span className="sim-outcome-meta">Tahmini Tamamlanma</span>
              <h3 className="sim-outcome-highlight">{projection.projectedDate}</h3>
              <span className="sim-outcome-sub">
                Toplam <strong>{projection.monthsNeeded} ay</strong> sürecek
              </span>
            </div>

            <div className="sim-outcome-separator-v" />

            <div className="sim-outcome-item">
              <span className="sim-outcome-meta">Günlük Ortalama Yük</span>
              <h4 className="sim-outcome-daily-pace">{formatCurrency(projection.dailyPace, currency)} / gün</h4>
              <span className="sim-outcome-sub">
                {projection.monthsSaved > 0
                  ? `Orijinal plandan ${projection.monthsSaved} ay daha erken bitiyor`
                  : `Planlanan vadeyle uyumlu tempo`}
              </span>
            </div>
          </div>
        </div>

        {/* AI Advisory Section */}
        <div className="sim-ai-block">
          <div className="sim-ai-top">
            <div className="sim-ai-label-group">
              <span className="sim-ai-title">Target AI Değerlendirmesi</span>
              <span className="sim-ai-subtitle">Bu tasarruf temposu için yapay zeka stratejisi alın</span>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleFetchAiAdvice}
              disabled={aiLoading}
            >
              {aiLoading ? (
                <>
                  <RefreshIcon size={13} className="spin" />
                  <span>Analiz Ediliyor...</span>
                </>
              ) : (
                <>
                  <SparklesIcon size={13} />
                  <span>{aiText ? "Yeniden Analiz Et" : "Senaryoyu Yorumla"}</span>
                </>
              )}
            </button>
          </div>

          {aiText && (
            <div className="sim-ai-result-body">
              <FormattedAiMessage text={aiText} />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
