import React, { useState } from "react";
import { AppSettings } from "../types/settings";
import { BellIcon, PlusIcon, EditIcon, TrashIcon, InfoIcon } from "../components/Icons";
import { invoke } from "@tauri-apps/api/core";

interface NotificationsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => void;
}

const Notifications: React.FC<NotificationsProps> = ({
  settings,
  onSettingsChange,
}) => {
  const [newTime, setNewTime] = useState("12:00");
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editTime, setEditTime] = useState("");

  const saveSettings = async (updated: AppSettings) => {
    await invoke("save_settings", { settings: updated });
    onSettingsChange(updated);
  };

  const handleAddTime = async () => {
    if (settings.notificationTimes.includes(newTime)) return;
    const updated: AppSettings = {
      ...settings,
      notificationTimes: [...settings.notificationTimes, newTime].sort(),
    };
    await saveSettings(updated);
    setNewTime("12:00");
  };

  const handleDeleteTime = async (idx: number) => {
    const updated: AppSettings = {
      ...settings,
      notificationTimes: settings.notificationTimes.filter((_, i) => i !== idx),
    };
    await saveSettings(updated);
  };

  const handleEditStart = (idx: number) => {
    setEditIdx(idx);
    setEditTime(settings.notificationTimes[idx]);
  };

  const handleEditSave = async () => {
    if (editIdx === null) return;
    const times = [...settings.notificationTimes];
    times[editIdx] = editTime;
    const updated: AppSettings = {
      ...settings,
      notificationTimes: times.sort(),
    };
    await saveSettings(updated);
    setEditIdx(null);
    setEditTime("");
  };

  const handleToggle = async () => {
    const updated: AppSettings = {
      ...settings,
      notificationsEnabled: !settings.notificationsEnabled,
    };
    await saveSettings(updated);
  };

  return (
    <div className="page notifications-page">
      <div className="page-header">
        <h2 className="page-title">Bildirimler</h2>
        <div className="toggle-wrapper">
          <span className="toggle-label">
            {settings.notificationsEnabled ? "Aktif" : "Pasif"}
          </span>
          <button
            className={`toggle-btn ${settings.notificationsEnabled ? "active" : ""}`}
            onClick={handleToggle}
            aria-label="Bildirimleri aç/kapat"
          >
            <span className="toggle-knob" />
          </button>
        </div>
      </div>

      <p className="page-description">
        Uygulama açık veya arka planda çalışırken belirlediğiniz saatlerde motivasyon bildirimleri alırsınız.
      </p>

      {/* Add new time */}
      <div className="notification-add">
        <input
          type="time"
          className="form-input"
          value={newTime}
          onChange={(e) => setNewTime(e.target.value)}
        />
        <button className="btn btn-primary" onClick={handleAddTime}>
          <PlusIcon size={16} />
          <span>Saat Ekle</span>
        </button>
      </div>

      {/* Times list */}
      <div className="notification-list">
        {settings.notificationTimes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">
              <BellIcon size={48} />
            </span>
            <p>Henüz bildirim saati eklenmemiş.</p>
          </div>
        ) : (
          settings.notificationTimes.map((time, idx) => (
            <div key={idx} className="notification-item">
              {editIdx === idx ? (
                <div className="notification-edit-row">
                  <input
                    type="time"
                    className="form-input"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleEditSave}>
                    Kaydet
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditIdx(null)}
                  >
                    İptal
                  </button>
                </div>
              ) : (
                <>
                  <div className="notification-time">
                    <span className="notification-bell">
                      <BellIcon size={18} />
                    </span>
                    <span className="notification-time-value">{time}</span>
                  </div>
                  <div className="notification-actions">
                    <button
                      className="btn-icon btn-edit"
                      onClick={() => handleEditStart(idx)}
                      title="Düzenle"
                    >
                      <EditIcon size={15} />
                    </button>
                    <button
                      className="btn-icon btn-delete"
                      onClick={() => handleDeleteTime(idx)}
                      title="Sil"
                    >
                      <TrashIcon size={15} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      <div className="notification-info">
        <div className="info-card">
          <span className="info-icon">
            <InfoIcon size={20} />
          </span>
          <p>
            Bildirimler tamamen cihazınızda yerel çalışır. Pencereyi kapattığınızda uygulama sistem tepsisinde (tray) arka planda bildirim göndermeye devam eder.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
