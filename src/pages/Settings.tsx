import React, { useState, useEffect, useRef } from "react";
import { AppSettings } from "../types/settings";
import { Goal } from "../types/goal";
import {
  MoonIcon,
  SunIcon,
  SparklesIcon,
  RefreshIcon,
  DownloadIcon,
  UploadIcon,
  CheckIcon,
} from "../components/Icons";
import { fetchExchangeRatesInTRY, ExchangeRateInfo, CurrencyCode, DEFAULT_RATES_IN_TRY } from "../utils/currency";
import { exportBackupToJson, exportGoalsToCsv, parseBackupJson } from "../utils/exportImport";
import { invoke } from "@tauri-apps/api/core";

interface SettingsProps {
  settings: AppSettings;
  goals?: Goal[];
  onSettingsChange: (settings: AppSettings) => void;
  onGoalsChange?: (goals: Goal[]) => void;
}

const Settings: React.FC<SettingsProps> = ({
  settings,
  goals = [],
  onSettingsChange,
  onGoalsChange,
}) => {
  const [converting, setConverting] = useState(false);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateInfo | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Backup & Import states
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRates = async () => {
    setRatesLoading(true);
    try {
      const data = await fetchExchangeRatesInTRY();
      setExchangeRates(data);
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, []);

  const saveSettings = async (updated: AppSettings) => {
    await invoke("save_settings", { settings: updated });
    onSettingsChange(updated);
  };

  const handleThemeChange = async (theme: "light" | "dark") => {
    await saveSettings({ ...settings, theme });
  };

  const handleCurrencyChange = async (newCurrency: CurrencyCode) => {
    if (newCurrency === settings.currency || converting) return;

    setConverting(true);
    try {
      await saveSettings({ ...settings, currency: newCurrency });
    } finally {
      setConverting(false);
    }
  };

  const handleNotificationsToggle = async () => {
    await saveSettings({
      ...settings,
      notificationsEnabled: !settings.notificationsEnabled,
    });
  };

  // Export handlers
  const handleExportJson = () => {
    exportBackupToJson(goals, settings);
  };

  const handleExportCsv = () => {
    exportGoalsToCsv(goals);
  };

  // Import handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus(null);
    setImportError(null);

    const confirmed = window.confirm(
      "Yedek dosyasını içe aktarmak üzeresiniz. Mevcut verileriniz bu yedekteki verilerle güncellenecektir. Onaylıyor musunuz?"
    );

    if (!confirmed) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      const backup = await parseBackupJson(file);

      // Save goals
      await invoke("save_goals", { goals: backup.goals });
      if (onGoalsChange) onGoalsChange(backup.goals);

      // Save settings if present
      if (backup.settings) {
        await invoke("save_settings", { settings: backup.settings });
        onSettingsChange(backup.settings);
      }

      setImportStatus(`Yedek başarıyla yüklendi! (${backup.goals.length} hedef aktarıldı)`);
    } catch (err: any) {
      setImportError(err.message || "Yedek dosyası yüklenirken bir hata oluştu.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h2 className="page-title">Ayarlar</h2>
      </div>

      {/* Theme */}
      <div className="settings-section">
        <h3 className="settings-section-title">Görünüm ve Tema</h3>
        <div className="settings-options">
          <button
            className={`option-btn ${settings.theme === "dark" ? "active" : ""}`}
            onClick={() => handleThemeChange("dark")}
          >
            <span className="option-icon">
              <MoonIcon size={16} />
            </span>
            <span>Koyu Tema</span>
          </button>
          <button
            className={`option-btn ${settings.theme === "light" ? "active" : ""}`}
            onClick={() => handleThemeChange("light")}
          >
            <span className="option-icon">
              <SunIcon size={16} />
            </span>
            <span>Açık Tema</span>
          </button>
        </div>
      </div>

      {/* Currency with In-Button Rates */}
      <div className="settings-section">
        <div className="settings-section-header">
          <h3 className="settings-section-title">Para Birimi</h3>
          <div className="currency-status-pill">
            <span className="live-dot" />
            <span>Canlı Kurlar</span>
            <button
              className="btn-icon btn-icon-xs"
              onClick={loadRates}
              disabled={ratesLoading}
              title="Kurları Yenile"
            >
              <RefreshIcon size={12} />
            </button>
          </div>
        </div>

        <div className="currency-cards-grid">
          {/* TRY Card */}
          <button
            className={`currency-card-btn ${settings.currency === "TRY" ? "active" : ""}`}
            onClick={() => handleCurrencyChange("TRY")}
            disabled={converting}
          >
            <div className="currency-card-top">
              <span className="currency-card-symbol">₺</span>
              <span className="currency-card-code">TRY</span>
            </div>
            <span className="currency-card-rate">Ana Para Birimi</span>
          </button>

          {/* USD Card */}
          <button
            className={`currency-card-btn ${settings.currency === "USD" ? "active" : ""}`}
            onClick={() => handleCurrencyChange("USD")}
            disabled={converting}
          >
            <div className="currency-card-top">
              <span className="currency-card-symbol">$</span>
              <span className="currency-card-code">USD</span>
            </div>
            <span className="currency-card-rate">
              1 $ ≈ {exchangeRates ? exchangeRates.usdInTry.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : DEFAULT_RATES_IN_TRY.USD.toFixed(2)} ₺
            </span>
          </button>

          {/* EUR Card */}
          <button
            className={`currency-card-btn ${settings.currency === "EUR" ? "active" : ""}`}
            onClick={() => handleCurrencyChange("EUR")}
            disabled={converting}
          >
            <div className="currency-card-top">
              <span className="currency-card-symbol">€</span>
              <span className="currency-card-code">EUR</span>
            </div>
            <span className="currency-card-rate">
              1 € ≈ {exchangeRates ? exchangeRates.eurInTry.toLocaleString("tr-TR", { minimumFractionDigits: 2 }) : DEFAULT_RATES_IN_TRY.EUR.toFixed(2)} ₺
            </span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div className="settings-section">
        <h3 className="settings-section-title">Bildirimler</h3>
        <div className="toggle-wrapper">
          <span className="toggle-label">
            {settings.notificationsEnabled
              ? "Bildirimler açık"
              : "Bildirimler kapalı"}
          </span>
          <button
            className={`toggle-btn ${settings.notificationsEnabled ? "active" : ""}`}
            onClick={handleNotificationsToggle}
            aria-label="Bildirimleri aç/kapat"
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </div>

      {/* Data Management & Backup */}
      <div className="settings-section">
        <h3 className="settings-section-title">Veri Yönetimi & Yedekleme</h3>
        <p className="settings-description">
          Hedeflerinizi, birikim geçmişinizi ve tercihlerinizi cihazınızda güvenle saklamak veya başka bir cihaza aktarmak için dışa/içe aktarabilirsiniz.
        </p>

        <div className="backup-actions-grid">
          {/* JSON Export */}
          <div className="backup-card">
            <div className="backup-card-info">
              <span className="backup-card-title">Tüm Verileri Yedekle (JSON)</span>
              <span className="backup-card-sub">Hedefler, ayarlar ve tüm işlem geçmişini içerir</span>
            </div>
            <button className="btn btn-secondary backup-action-btn" onClick={handleExportJson}>
              <DownloadIcon size={16} />
              <span>JSON İndir</span>
            </button>
          </div>

          {/* CSV Export */}
          <div className="backup-card">
            <div className="backup-card-info">
              <span className="backup-card-title">Hedefleri Tablo Olarak İndir (CSV)</span>
              <span className="backup-card-sub">Excel ve Numbers uyumlu Türkçe tablo</span>
            </div>
            <button className="btn btn-secondary backup-action-btn" onClick={handleExportCsv}>
              <DownloadIcon size={16} />
              <span>CSV İndir</span>
            </button>
          </div>

          {/* JSON Import */}
          <div className="backup-card">
            <div className="backup-card-info">
              <span className="backup-card-title">Yedekten Geri Yükle</span>
              <span className="backup-card-sub">Daha önce indirdiğiniz bir JSON yedeğini yükleyin</span>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              className="btn btn-secondary backup-action-btn"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadIcon size={16} />
              <span>Yedek Dosyası Seç</span>
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="status-banner status-success">
            <CheckIcon size={16} />
            <span>{importStatus}</span>
          </div>
        )}

        {importError && (
          <div className="status-banner status-error">
            <span>{importError}</span>
          </div>
        )}
      </div>

      {/* About Application */}
      <div className="settings-section">
        <h3 className="settings-section-title">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <SparklesIcon size={16} />
            Uygulama Hakkında
          </span>
        </h3>
        <p className="settings-description">
          <strong>Target</strong>, birikimlerinizi planlamanızı sağlayan yapay zeka (AI) destekli akıllı masaüstü hedef takip uygulamasıdır. Hedeflerinize göre otomatik motivasyon ve stratejik tasarruf önerileri üretir.
        </p>
        <div className="about-badges">
          <span className="badge-pill">v0.1.0</span>
          <span className="badge-pill badge-ai">
            <SparklesIcon size={13} />
            AI Destekli Asistan
          </span>
          <span className="badge-pill">Klavye Kısayolları (⌘K)</span>
          <span className="badge-pill">Yerel & Güvenli</span>
        </div>
      </div>
    </div>
  );
};

export default Settings;
