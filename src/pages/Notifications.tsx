import React, { useState, useEffect, useRef } from "react";
import { AppSettings, NotificationSchedule } from "../types/settings";
import { Goal } from "../types/goal";
import { formatCurrency, CurrencyCode } from "../utils/currency";
import {
  BellIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  InfoIcon,
  CloseIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CheckIcon,
} from "../components/Icons";
import { invoke } from "@tauri-apps/api/core";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

interface NotificationsProps {
  settings: AppSettings;
  goals: Goal[];
  onSettingsChange: (settings: AppSettings) => void;
}

const PRESET_TIMES = [
  { label: "Sabah", time: "09:00" },
  { label: "Öğle", time: "13:00" },
  { label: "Akşam", time: "18:30" },
  { label: "Gece", time: "21:00" },
];

const REPEAT_OPTIONS = ["Her gün", "Hafta içi", "Hafta sonu"];

const REPEAT_CYCLES = 7;
const MIDDLE_CYCLE = Math.floor(REPEAT_CYCLES / 2); // 3

// Repeated 7 times consecutively (0-23 repeated 7 times, 0-59 repeated 7 times)
const TOTAL_HOURS = Array.from({ length: 24 * REPEAT_CYCLES }, (_, i) => i % 24);
const TOTAL_MINUTES = Array.from({ length: 60 * REPEAT_CYCLES }, (_, i) => i % 60);
const ITEM_HEIGHT = 44; // px per number item

const Notifications: React.FC<NotificationsProps> = ({
  settings,
  goals,
  onSettingsChange,
}) => {
  // Normalize schedules
  const schedules: NotificationSchedule[] =
    settings.notificationSchedules && settings.notificationSchedules.length > 0
      ? settings.notificationSchedules
      : settings.notificationTimes.map((t) => ({ time: t, enabled: true }));

  // Active Time Editor State
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [hour, setHour] = useState<number>(9);
  const [minute, setMinute] = useState<number>(0);
  const [repeat, setRepeat] = useState<string>("Her gün");
  const [warning, setWarning] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<boolean | null>(null);

  // Wheel scroll refs
  const hourWheelRef = useRef<HTMLDivElement>(null);
  const minuteWheelRef = useRef<HTMLDivElement>(null);
  const isScrollingFromCode = useRef(false);
  const creatorCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkPerm = async () => {
      try {
        const granted = await isPermissionGranted();
        setPermissionStatus(granted);
      } catch (err) {
        console.error("Permission check error:", err);
      }
    };
    checkPerm();
  }, []);

  // Sync wheel scroll positions to middle cycle
  const scrollToPositions = (h: number, m: number, smooth: boolean = true) => {
    isScrollingFromCode.current = true;
    if (hourWheelRef.current) {
      const targetTop = (MIDDLE_CYCLE * 24 + h) * ITEM_HEIGHT;
      hourWheelRef.current.scrollTo({
        top: targetTop,
        behavior: smooth ? "smooth" : "auto",
      });
    }
    if (minuteWheelRef.current) {
      const targetTop = (MIDDLE_CYCLE * 60 + m) * ITEM_HEIGHT;
      minuteWheelRef.current.scrollTo({
        top: targetTop,
        behavior: smooth ? "smooth" : "auto",
      });
    }
    setTimeout(() => {
      isScrollingFromCode.current = false;
    }, 350);
  };

  // Mount wheel position on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToPositions(hour, minute, false);
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const saveSettings = async (updated: AppSettings) => {
    await invoke("save_settings", { settings: updated });
    onSettingsChange(updated);
  };

  const handleEditAlarm = (idx: number) => {
    setWarning(null);
    setEditingIdx(idx);
    const item = schedules[idx];
    const [h, m] = item.time.split(":").map(Number);
    const parsedH = isNaN(h) ? 9 : h;
    const parsedM = isNaN(m) ? 0 : m;
    setHour(parsedH);
    setMinute(parsedM);
    setRepeat(item.repeat || "Her gün");
    scrollToPositions(parsedH, parsedM, true);

    if (creatorCardRef.current) {
      creatorCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleCancelEdit = () => {
    setWarning(null);
    setEditingIdx(null);
    const now = new Date();
    const defaultH = (now.getHours() + 1) % 24;
    const defaultM = 0;
    setHour(defaultH);
    setMinute(defaultM);
    setRepeat("Her gün");
    scrollToPositions(defaultH, defaultM, true);
  };

  const handleSaveAlarm = async () => {
    const formattedTime = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

    if (
      schedules.some(
        (s, idx) => idx !== editingIdx && s.time === formattedTime
      )
    ) {
      setWarning(`"${formattedTime}" saati için zaten bir bildirim saati mevcut.`);
      setTimeout(() => setWarning(null), 4500);
      return;
    }

    setWarning(null);
    const finalRepeat = repeat || "Her gün";
    let updatedSchedules: NotificationSchedule[];

    if (editingIdx !== null) {
      updatedSchedules = schedules.map((s, idx) =>
        idx === editingIdx
          ? { ...s, time: formattedTime, repeat: finalRepeat }
          : s
      );
      setEditingIdx(null);
    } else {
      updatedSchedules = [
        ...schedules,
        {
          time: formattedTime,
          enabled: true,
          repeat: finalRepeat,
        },
      ];
    }

    updatedSchedules.sort((a, b) => a.time.localeCompare(b.time));

    const updated: AppSettings = {
      ...settings,
      notificationTimes: updatedSchedules.map((s) => s.time),
      notificationSchedules: updatedSchedules,
    };

    await saveSettings(updated);
  };

  const handleDeleteAlarm = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setWarning(null);
    if (editingIdx === idx) {
      handleCancelEdit();
    }
    const updatedSchedules = schedules.filter((_, i) => i !== idx);
    const updated: AppSettings = {
      ...settings,
      notificationTimes: updatedSchedules.map((s) => s.time),
      notificationSchedules: updatedSchedules,
    };
    await saveSettings(updated);
  };

  const handleToggleSchedule = async (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedSchedules = schedules.map((s, i) =>
      i === idx ? { ...s, enabled: !s.enabled } : s
    );
    const updated: AppSettings = {
      ...settings,
      notificationTimes: updatedSchedules.map((s) => s.time),
      notificationSchedules: updatedSchedules,
    };
    await saveSettings(updated);
  };

  const handleToggleGlobal = async () => {
    const nextEnabled = !settings.notificationsEnabled;
    if (nextEnabled) {
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          const res = await requestPermission();
          granted = res === "granted";
        }
        setPermissionStatus(granted);
      } catch (err) {
        console.error("Permission request error:", err);
      }
    }

    const updated: AppSettings = {
      ...settings,
      notificationsEnabled: nextEnabled,
      notificationSchedules: schedules,
    };
    await saveSettings(updated);
  };

  const handleToggleGeneralOption = async (
    key: "notifyGoalProgress" | "notifyMotivationTips" | "notifyDailySummary"
  ) => {
    const currentVal = settings[key] !== false;
    const updated: AppSettings = {
      ...settings,
      [key]: !currentVal,
      notificationSchedules: schedules,
    };
    await saveSettings(updated);
  };

  const handleToggleGoalNotification = async (goalId: string) => {
    const disabledList = settings.disabledGoalNotificationIds || [];
    const isCurrentlyDisabled = disabledList.includes(goalId);
    const nextDisabledList = isCurrentlyDisabled
      ? disabledList.filter((id) => id !== goalId)
      : [...disabledList, goalId];

    const updated: AppSettings = {
      ...settings,
      disabledGoalNotificationIds: nextDisabledList,
      notificationSchedules: schedules,
    };
    await saveSettings(updated);
  };

  const handleSendTestNotification = async () => {
    try {
      setWarning(null);
      try {
        let granted = await isPermissionGranted();
        if (!granted) {
          await requestPermission();
        }
      } catch (_) {}

      await invoke("send_test_notification");
      setSuccessMsg("Bildirim gönderildi! Ekranınızın sağ üst köşesini kontrol edin.");
      setTimeout(() => setSuccessMsg(null), 4500);
    } catch (err: any) {
      setWarning(err?.toString() || "Bildirim gönderilemedi.");
    }
  };

  // Wheel scroll event listeners with cyclic normalization
  const onHourScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingFromCode.current) return;
    const top = e.currentTarget.scrollTop;
    const rawIndex = Math.round(top / ITEM_HEIGHT);
    const normalizedHour = ((rawIndex % 24) + 24) % 24;
    if (normalizedHour !== hour) {
      setHour(normalizedHour);
    }
  };

  const onMinuteScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isScrollingFromCode.current) return;
    const top = e.currentTarget.scrollTop;
    const rawIndex = Math.round(top / ITEM_HEIGHT);
    const normalizedMinute = ((rawIndex % 60) + 60) % 60;
    if (normalizedMinute !== minute) {
      setMinute(normalizedMinute);
    }
  };

  const selectHourByIndex = (index: number) => {
    if (hourWheelRef.current) {
      hourWheelRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
    }
    setHour(index % 24);
  };

  const selectMinuteByIndex = (index: number) => {
    if (minuteWheelRef.current) {
      minuteWheelRef.current.scrollTo({ top: index * ITEM_HEIGHT, behavior: "smooth" });
    }
    setMinute(index % 60);
  };

  const selectPreset = (h: number, m: number) => {
    setHour(h);
    setMinute(m);
    scrollToPositions(h, m, true);
  };

  const stepHour = (delta: number) => {
    if (!hourWheelRef.current) return;
    const currentTop = hourWheelRef.current.scrollTop;
    const currentIndex = Math.round(currentTop / ITEM_HEIGHT);
    const targetIndex = currentIndex + delta;
    hourWheelRef.current.scrollTo({
      top: targetIndex * ITEM_HEIGHT,
      behavior: "smooth",
    });
    setHour(((targetIndex % 24) + 24) % 24);
  };

  const stepMinute = (delta: number) => {
    if (!minuteWheelRef.current) return;
    const currentTop = minuteWheelRef.current.scrollTop;
    const currentIndex = Math.round(currentTop / ITEM_HEIGHT);
    const targetIndex = currentIndex + delta;
    minuteWheelRef.current.scrollTo({
      top: targetIndex * ITEM_HEIGHT,
      behavior: "smooth",
    });
    setMinute(((targetIndex % 60) + 60) % 60);
  };

  return (
    <div className="page notifications-page">
      <div className="page-header">
        <div>
          <h2 className="page-title">Bildirimler</h2>
          <p className="page-subtitle">
            Hedef hatırlatıcı saatlerinizi belirleyin ve bildirim tercihlerinizi yönetin.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleSendTestNotification}
            title="Masaüstünüze anında bir deneme bildirimi gönderir"
          >
            <BellIcon size={14} />
            <span>Test Bildirimi</span>
          </button>
          <div className="toggle-wrapper">
            <span className="toggle-label">
              {settings.notificationsEnabled ? "Aktif" : "Pasif"}
            </span>
            <button
              className={`toggle-btn ${settings.notificationsEnabled ? "active" : ""}`}
              onClick={handleToggleGlobal}
              aria-label="Bildirimleri aç/kapat"
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>
      </div>

      {permissionStatus === false && (
        <div
          className="notification-warning"
          style={{
            background: "rgba(245, 158, 11, 0.15)",
            borderColor: "var(--color-warning)",
            marginBottom: "20px",
          }}
        >
          <div className="notification-warning-left">
            <InfoIcon size={16} />
            <span>
              macOS bildirim izni kapalı. Bildirim alabilmek için lütfen "Test
              Bildirimi"ne tıklayıp izin verin veya Sistem Ayarları'ndan Target
              bildirimlerini açın.
            </span>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom-Right Toast Popups ── */}
      {warning && (
        <div className="toast-popup-bottom-right toast-popup-warning">
          <div className="toast-popup-left">
            <span className="toast-popup-icon toast-icon-warning">
              <InfoIcon size={18} />
            </span>
            <div className="toast-popup-text">
              <span className="toast-popup-title">Saat Zaten Kayıtlı</span>
              <span className="toast-popup-desc">{warning}</span>
            </div>
          </div>
          <button
            className="toast-popup-close"
            onClick={() => setWarning(null)}
            title="Kapat"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* ── Fixed Bottom-Right Success Toast Popup ── */}
      {successMsg && (
        <div className="toast-popup-bottom-right">
          <div className="toast-popup-left">
            <span className="toast-popup-icon">
              <CheckIcon size={18} />
            </span>
            <div className="toast-popup-text">
              <span className="toast-popup-title">Test Bildirimi Gönderildi</span>
              <span className="toast-popup-desc">{successMsg}</span>
            </div>
          </div>
          <button
            className="toast-popup-close"
            onClick={() => setSuccessMsg(null)}
            title="Kapat"
          >
            <CloseIcon size={14} />
          </button>
        </div>
      )}

      {/* ── Active Time Creator Card ── */}
      <div className="apple-creator-card" ref={creatorCardRef}>
        <div className="apple-creator-header">
          <div className="apple-creator-title-wrap">
            <span className="apple-creator-icon">
              <BellIcon size={18} />
            </span>
            <div>
              <h3 className="apple-creator-title">
                {editingIdx !== null ? "Saati Güncelle" : "Yeni Bildirim Saati Belirle"}
              </h3>
              <p className="apple-creator-subtitle">
                Bildirim saatini ve tekrar günlerini seçin.
              </p>
            </div>
          </div>
          {editingIdx !== null && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCancelEdit}
            >
              Vazgeç
            </button>
          )}
        </div>

        <div className="apple-creator-body">
          {/* Cyclic Scrollable Drum Wheels */}
          <div className="apple-wheel-picker-wrapper">
            {/* Hour Wheel */}
            <div className="apple-drum-column">
              <button
                type="button"
                className="apple-wheel-stepper"
                onClick={() => stepHour(-1)}
                title="1 Saat Azalt"
              >
                <ChevronUpIcon size={16} />
              </button>

              <div className="apple-wheel-scroll-frame">
                <div
                  className="apple-wheel-scroll-track"
                  ref={hourWheelRef}
                  onScroll={onHourScroll}
                >
                  <div className="apple-wheel-spacer" />
                  {TOTAL_HOURS.map((val, idx) => {
                    const diff = Math.abs(val - hour);
                    const isSelected = diff === 0;
                    const isNear = diff === 1 || diff === 23;
                    return (
                      <div
                        key={idx}
                        className={`apple-wheel-number ${isSelected ? "active" : isNear ? "near" : "far"}`}
                        onClick={() => selectHourByIndex(idx)}
                      >
                        {String(val).padStart(2, "0")}
                      </div>
                    );
                  })}
                  <div className="apple-wheel-spacer" />
                </div>
                {/* Center Highlight Lens */}
                <div className="apple-wheel-selection-lens" />
                {/* Gradient Fades */}
                <div className="apple-wheel-fade-top" />
                <div className="apple-wheel-fade-bottom" />
              </div>

              <button
                type="button"
                className="apple-wheel-stepper"
                onClick={() => stepHour(1)}
                title="1 Saat Artır"
              >
                <ChevronDownIcon size={16} />
              </button>
              <span className="apple-wheel-label">Saat</span>
            </div>

            {/* Separator Colon */}
            <div className="apple-wheel-colon">:</div>

            {/* Minute Wheel */}
            <div className="apple-drum-column">
              <button
                type="button"
                className="apple-wheel-stepper"
                onClick={() => stepMinute(-1)}
                title="1 Dakika Azalt"
              >
                <ChevronUpIcon size={16} />
              </button>

              <div className="apple-wheel-scroll-frame">
                <div
                  className="apple-wheel-scroll-track"
                  ref={minuteWheelRef}
                  onScroll={onMinuteScroll}
                >
                  <div className="apple-wheel-spacer" />
                  {TOTAL_MINUTES.map((val, idx) => {
                    const diff = Math.abs(val - minute);
                    const isSelected = diff === 0;
                    const isNear = diff === 1 || diff === 59;
                    return (
                      <div
                        key={idx}
                        className={`apple-wheel-number ${isSelected ? "active" : isNear ? "near" : "far"}`}
                        onClick={() => selectMinuteByIndex(idx)}
                      >
                        {String(val).padStart(2, "0")}
                      </div>
                    );
                  })}
                  <div className="apple-wheel-spacer" />
                </div>
                {/* Center Highlight Lens */}
                <div className="apple-wheel-selection-lens" />
                {/* Gradient Fades */}
                <div className="apple-wheel-fade-top" />
                <div className="apple-wheel-fade-bottom" />
              </div>

              <button
                type="button"
                className="apple-wheel-stepper"
                onClick={() => stepMinute(1)}
                title="1 Dakika Artır"
              >
                <ChevronDownIcon size={16} />
              </button>
              <span className="apple-wheel-label">Dakika</span>
            </div>
          </div>

          {/* Creator Controls Right Column */}
          <div className="apple-creator-controls">
            <div className="apple-creator-controls-top">
              {/* Quick Preset Chips */}
              <div className="apple-preset-chips">
                {PRESET_TIMES.map((preset, i) => {
                  const [ph, pm] = preset.time.split(":").map(Number);
                  const isSelected = hour === ph && minute === pm;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`apple-preset-chip ${isSelected ? "active" : ""}`}
                      onClick={() => selectPreset(ph, pm)}
                    >
                      <span className="preset-name">{preset.label}</span>
                      <span className="preset-time">{preset.time}</span>
                    </button>
                  );
                })}
              </div>

              {/* Grouped Table: Repeat */}
              <div className="apple-grouped-table">
                <div className="apple-grouped-row">
                  <span className="apple-row-title">Tekrar</span>
                  <div className="apple-repeat-pills">
                    {REPEAT_OPTIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        className={`apple-repeat-pill ${repeat === r ? "active" : ""}`}
                        onClick={() => setRepeat(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              className="btn btn-primary apple-creator-submit-btn"
              onClick={handleSaveAlarm}
            >
              {editingIdx !== null ? <CheckIcon size={16} /> : <PlusIcon size={16} />}
              <span>
                {editingIdx !== null
                  ? `Saati Güncelle (${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")})`
                  : `Saati Ekle (${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")})`}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Saved Alarms Section ── */}
      <div className="apple-alarm-section-header">
        <h3 className="section-title" style={{ margin: 0, fontSize: "16px" }}>
          Kayıtlı Bildirim Saatleri
        </h3>
        <span className="badge-counter">{schedules.length} Saat</span>
      </div>

      {/* Apple Clock Alarm List */}
      <div className="apple-alarm-list">
        {schedules.length === 0 ? (
          <div className="empty-state-banner">
            <div className="empty-state-banner-left">
              <span className="empty-state-banner-icon">
                <BellIcon size={20} />
              </span>
              <div className="empty-state-banner-text">
                <span className="empty-state-banner-title">
                  Henüz kayıtlı bildirim saati yok
                </span>
                <span className="empty-state-banner-desc">
                  Yukarıdaki saat seçiciden dilediğiniz saati belirleyip "Saati Ekle" butonuna basarak kaydedebilirsiniz.
                </span>
              </div>
            </div>
          </div>
        ) : (
          schedules.map((item, idx) => {
            const isInactive = !item.enabled || !settings.notificationsEnabled;
            const isBeingEdited = editingIdx === idx;
            return (
              <div
                key={idx}
                className={`apple-alarm-card ${isInactive ? "disabled" : ""} ${isBeingEdited ? "is-editing" : ""}`}
                onClick={() => handleEditAlarm(idx)}
                title="Saati yukarıdaki çarkta düzenlemek için tıklayın"
              >
                <div className="apple-alarm-left">
                  <button
                    className={`toggle-btn ${item.enabled && settings.notificationsEnabled ? "active" : ""}`}
                    onClick={(e) => handleToggleSchedule(idx, e)}
                    title={item.enabled ? "Saati Kapat" : "Saati Aç"}
                  >
                    <span className="toggle-knob" />
                  </button>
                  <span className="apple-alarm-time">{item.time}</span>
                  <span className="apple-alarm-repeat">{item.repeat || "Her gün"}</span>
                </div>

                <div className="apple-alarm-right">
                  <button
                    className="btn-icon btn-edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditAlarm(idx);
                    }}
                    title="Düzenle"
                  >
                    <EditIcon size={15} />
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={(e) => handleDeleteAlarm(idx, e)}
                    title="Sil"
                  >
                    <TrashIcon size={15} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── General Notification Preferences ── */}
      <div className="notification-preferences-card" style={{ marginTop: "32px" }}>
        <h3 className="section-title" style={{ fontSize: "16px", marginBottom: "16px" }}>
          Genel Bildirim Ayarları
        </h3>

        <div className="preferences-list">
          {/* Option 1: Goal Progress */}
          <div className="preference-group-wrapper">
            <div className="preference-item">
              <div className="preference-text">
                <span className="preference-title">Hedef İlerleme Bildirimleri</span>
                <span className="preference-desc">
                  Hedeflerinize kalan tutarlar, tamamlanma yüzdeleri ve yaklaşan dönüm noktaları bildirilsin.
                </span>
              </div>
              <button
                className={`toggle-btn ${settings.notifyGoalProgress !== false && settings.notificationsEnabled ? "active" : ""}`}
                onClick={() => handleToggleGeneralOption("notifyGoalProgress")}
                disabled={!settings.notificationsEnabled}
                title="Hedef İlerleme Bildirimlerini Aç/Kapat"
              >
                <span className="toggle-knob" />
              </button>
            </div>

            {/* Sublist of Goals when Goal Progress is enabled */}
            {settings.notifyGoalProgress !== false && settings.notificationsEnabled && (
              <div className="preference-goals-sublist">
                <div className="preference-goals-sublist-header">
                  <span className="preference-goals-sublist-title">
                    İzlenen Hedefler ({goals.filter((g) => !(settings.disabledGoalNotificationIds || []).includes(g.id)).length}/{goals.length})
                  </span>
                </div>
                {goals.length === 0 ? (
                  <div className="preference-goals-empty">
                    Henüz kayıtlı bir hedefiniz bulunmuyor. Hedefler sayfasından yeni hedef ekleyebilirsiniz.
                  </div>
                ) : (
                  <div className="preference-goals-items">
                    {goals.map((g) => {
                      const isEnabled = !(settings.disabledGoalNotificationIds || []).includes(g.id);
                      const goalCurr = (g.currency || "TRY") as CurrencyCode;
                      const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount / g.targetAmount) * 100)) : 0;
                      const remaining = Math.max(0, g.targetAmount - g.savedAmount);
                      return (
                        <div key={g.id} className={`preference-goal-row ${!isEnabled ? "disabled" : ""}`}>
                          <div className="preference-goal-info">
                            <span className="preference-goal-name">{g.name}</span>
                            <div className="preference-goal-meta">
                              <span className="preference-goal-badge">%{pct}</span>
                              <span className="preference-goal-rem">Hedef: {formatCurrency(g.targetAmount, goalCurr)}</span>
                              <span className="preference-goal-rem">Kalan: {formatCurrency(remaining, goalCurr)}</span>
                            </div>
                          </div>
                          <button
                            className={`toggle-btn toggle-btn-sm ${isEnabled ? "active" : ""}`}
                            onClick={() => handleToggleGoalNotification(g.id)}
                            title={isEnabled ? "Bu hedef için bildirimleri kapat" : "Bu hedef için bildirimleri aç"}
                          >
                            <span className="toggle-knob" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Option 2: Financial Motivation */}
          <div className="preference-item">
            <div className="preference-text">
              <span className="preference-title">Finansal Motivasyon & Tavsiyeler</span>
              <span className="preference-desc">
                Tasarruf zihniyeti, 24 saat kuralı ve bütçe disiplini odaklı stratejik motivasyon sözleri gönderilsin.
              </span>
            </div>
            <button
              className={`toggle-btn ${settings.notifyMotivationTips !== false && settings.notificationsEnabled ? "active" : ""}`}
              onClick={() => handleToggleGeneralOption("notifyMotivationTips")}
              disabled={!settings.notificationsEnabled}
              title="Finansal Motivasyon Bildirimlerini Aç/Kapat"
            >
              <span className="toggle-knob" />
            </button>
          </div>

          {/* Option 3: Daily Summary */}
          <div className="preference-item">
            <div className="preference-text">
              <span className="preference-title">Günün Birikim Özeti</span>
              <span className="preference-desc">
                Akşam saatlerindeki bildirimlerde toplam hedef portföyü ve genel birikim durumu özetlensin.
              </span>
            </div>
            <button
              className={`toggle-btn ${settings.notifyDailySummary !== false && settings.notificationsEnabled ? "active" : ""}`}
              onClick={() => handleToggleGeneralOption("notifyDailySummary")}
              disabled={!settings.notificationsEnabled}
              title="Günün Birikim Özeti Bildirimlerini Aç/Kapat"
            >
              <span className="toggle-knob" />
            </button>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="notification-info">
        <div className="info-card">
          <span className="info-icon">
            <InfoIcon size={18} />
          </span>
          <p>
            Bildirimler tamamen cihazınızda yerel çalışır. Pencereyi kapattığınızda uygulama sistem tepsisinde (tray) arka planda bildirim saatlerini takip etmeye devam eder.
          </p>
        </div>
      </div>

      {/* Guaranteed Bottom Scroll Spacer */}
      <div className="page-bottom-spacer" />
    </div>
  );
};

export default Notifications;
