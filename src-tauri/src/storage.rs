use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

// ── Data Models ──

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Goal {
    pub id: String,
    pub name: String,
    pub target_amount: f64,
    pub saved_amount: f64,
    pub target_date: Option<String>,
    pub icon: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub currency: String,
    pub notifications_enabled: bool,
    pub notification_times: Vec<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            currency: "TRY".to_string(),
            notifications_enabled: true,
            notification_times: vec![
                "09:00".to_string(),
                "14:00".to_string(),
                "21:30".to_string(),
            ],
        }
    }
}

// ── File Paths ──

fn get_data_dir(app: &AppHandle) -> PathBuf {
    let data_dir = app
        .path()
        .app_data_dir()
        .expect("Failed to get app data dir");
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
