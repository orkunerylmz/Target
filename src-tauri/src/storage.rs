use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

// ── Data Models ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Transaction {
    pub id: String,
    pub date: String,
    pub amount: f64,
    #[serde(rename = "type")]
    pub tx_type: String,
    #[serde(default)]
    pub note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: String,
    pub name: String,
    pub target_amount: f64,
    pub saved_amount: f64,
    pub target_date: Option<String>,
    pub icon: Option<String>,
    #[serde(default)]
    pub category: Option<String>,
    #[serde(default)]
    pub show_on_dashboard: Option<bool>,
    #[serde(default)]
    pub currency: Option<String>,
    #[serde(default)]
    pub transactions: Option<Vec<Transaction>>,
}

fn default_true() -> bool {
    true
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSchedule {
    pub time: String,
    #[serde(default = "default_true")]
    pub enabled: bool,
    #[serde(default)]
    pub label: Option<String>,
    #[serde(default)]
    pub repeat: Option<String>,
    #[serde(default)]
    pub goal_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub currency: String,
    pub notifications_enabled: bool,
    #[serde(default)]
    pub notification_times: Vec<String>,
    #[serde(default)]
    pub notification_schedules: Option<Vec<NotificationSchedule>>,
    #[serde(default = "default_true")]
    pub notify_goal_progress: bool,
    #[serde(default = "default_true")]
    pub notify_motivation_tips: bool,
    #[serde(default = "default_true")]
    pub notify_daily_summary: bool,
    #[serde(default)]
    pub disabled_goal_notification_ids: Option<Vec<String>>,
    #[serde(default)]
    pub gemini_api_key: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            currency: "TRY".to_string(),
            notifications_enabled: true,
            notify_goal_progress: true,
            notify_motivation_tips: true,
            notify_daily_summary: true,
            disabled_goal_notification_ids: Some(Vec::new()),
            gemini_api_key: None,
            notification_times: vec![
                "09:00".to_string(),
                "14:00".to_string(),
                "21:30".to_string(),
            ],
            notification_schedules: Some(vec![
                NotificationSchedule {
                    time: "09:00".to_string(),
                    enabled: true,
                    label: Some("Sabah Motivasyonu".to_string()),
                    repeat: Some("Her gün".to_string()),
                    goal_id: Some("all".to_string()),
                },
                NotificationSchedule {
                    time: "14:00".to_string(),
                    enabled: true,
                    label: Some("Öğle Hedef Kontrolü".to_string()),
                    repeat: Some("Her gün".to_string()),
                    goal_id: Some("all".to_string()),
                },
                NotificationSchedule {
                    time: "21:30".to_string(),
                    enabled: true,
                    label: Some("Günün Birikim Özeti".to_string()),
                    repeat: Some("Her gün".to_string()),
                    goal_id: Some("all".to_string()),
                },
            ]),
        }
    }
}

// ── File Paths ──

fn get_data_dir(app: &AppHandle) -> PathBuf {
    let base_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");

    let data_dir = if cfg!(debug_assertions) {
        base_dir.join("dev_data")
    } else {
        base_dir
    };

    if !data_dir.exists() {
        fs::create_dir_all(&data_dir).expect("Failed to create app data dir");
    }
    data_dir
}

fn goals_path(app: &AppHandle) -> PathBuf {
    get_data_dir(app).join("goals.json")
}

fn settings_path(app: &AppHandle) -> PathBuf {
    get_data_dir(app).join("settings.json")
}

// ── Goals CRUD ──

pub fn read_goals(app: &AppHandle) -> Vec<Goal> {
    let path = goals_path(app);
    if !path.exists() {
        let empty: Vec<Goal> = vec![];
        let json = serde_json::to_string_pretty(&empty).unwrap_or_else(|_| "[]".to_string());
        let _ = fs::write(&path, json);
        return empty;
    }
    let content = fs::read_to_string(&path).unwrap_or_else(|_| "[]".to_string());
    serde_json::from_str(&content).unwrap_or_else(|_| vec![])
}

pub fn write_goals(app: &AppHandle, goals: &[Goal]) -> Result<(), String> {
    let path = goals_path(app);
    let json =
        serde_json::to_string_pretty(goals).map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("File write error: {}", e))?;
    Ok(())
}

// ── Settings CRUD ──

pub fn read_settings(app: &AppHandle) -> AppSettings {
    let path = settings_path(app);
    if !path.exists() {
        let defaults = AppSettings::default();
        let json = serde_json::to_string_pretty(&defaults).unwrap_or_else(|_| "{}".to_string());
        let _ = fs::write(&path, json);
        return defaults;
    }
    let content = fs::read_to_string(&path).unwrap_or_else(|_| "{}".to_string());
    serde_json::from_str(&content).unwrap_or_else(|_| AppSettings::default())
}

pub fn write_settings(app: &AppHandle, settings: &AppSettings) -> Result<(), String> {
    let path = settings_path(app);
    let json = serde_json::to_string_pretty(settings)
        .map_err(|e| format!("Serialization error: {}", e))?;
    fs::write(&path, json).map_err(|e| format!("File write error: {}", e))?;
    Ok(())
}
