import React, { useState, useEffect } from "react";
import { AppSettings } from "../types/settings";
import { MoonIcon, SunIcon, SparklesIcon, CheckIcon, InfoIcon } from "../components/Icons";
import { invoke } from "@tauri-apps/api/core";

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
  const [aiAvailable, setAiAvailable] = useState<boolean>(false);

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

  const saveSettings = async (updated: AppSettings) => {
    await invoke("save_settings", { settings: updated });
    onSettingsChange(updated);
  };

  const handleThemeChange = async (theme: "light" | "dark") => {
    await saveSettings({ ...settings, theme });
  };

  const handleCurrencyChange = async (currency: "TRY" | "USD" | "EUR") => {
    await saveSettings({ ...settings, currency });
  };

  const handleNotificationsToggle = async () => {
    await saveSettings({
      ...settings,
      notificationsEnabled: !settings.notificationsEnabled,
    });
  };

  return (
    <div className="page settings-page">
      <div className="page-header">
        <h2 className="page-title">Ayarlar</h2>
      </div>

      {/* Theme */}
      <div className="settings-section">
        <h3 className="settings-section-title">Tema</h3>
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

      {/* Currency */}
      <div className="settings-section">
        <h3 className="settings-section-title">Para Birimi</h3>
        <div className="settings-options">
          {(["TRY", "USD", "EUR"] as const).map((cur) => (
            <button
              key={cur}
              className={`option-btn ${settings.currency === cur ? "active" : ""}`}
              onClick={() => handleCurrencyChange(cur)}
            >
              <span className="option-icon">
                {cur === "TRY" ? "TL" : cur === "USD" ? "$" : "€"}
              </span>
              <span>{cur}</span>
            </button>
          ))}
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

      {/* Gemini AI Status */}
      <div className="settings-section">
        <h3 className="settings-section-title">
          <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            <SparklesIcon size={18} />
            Gemini AI Entegrasyonu
          </span>
        </h3>
        <p className="settings-description">
          Motivasyon ve hedef tavsiyeleri için Gemini AI API anahtarı doğrudan .env dosyasından okunur.
        </p>
        <div className="ai-status-box">
          {aiAvailable ? (
            <div className="ai-status-badge ai-status-active">
              <CheckIcon size={16} />
              <span>Gemini AI Aktif (.env dosyasından yüklendi)</span>
            </div>
          ) : (
            <div className="ai-status-badge ai-status-inactive">
              <InfoIcon size={16} />
              <span>.env dosyasında GEMINI_API_KEY tanımlanmamış.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
