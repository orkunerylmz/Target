mod gemini;
mod notifications;
mod storage;

use storage::{AppSettings, Goal};
use tauri::AppHandle;

// ── Goal Commands ──

#[tauri::command]
fn load_goals(app: AppHandle) -> Vec<Goal> {
    storage::read_goals(&app)
}

#[tauri::command]
fn save_goals(app: AppHandle, goals: Vec<Goal>) -> Result<(), String> {
    storage::write_goals(&app, &goals)
}

// ── Settings Commands ──

#[tauri::command]
fn load_settings(app: AppHandle) -> AppSettings {
    storage::read_settings(&app)
}

#[tauri::command]
fn save_settings(app: AppHandle, settings: AppSettings) -> Result<(), String> {
    storage::write_settings(&app, &settings)
}

// ── Gemini AI Command ──

fn get_gemini_api_key() -> Result<String, String> {
    std::env::var("GEMINI_API_KEY")
        .map_err(|_| "GEMINI_API_KEY env degiskeni bulunamadi.".to_string())
        .and_then(|key| {
            if key.is_empty() || key == "your_gemini_api_key_here" {
                Err("GEMINI_API_KEY .env dosyasinda ayarlanmamis.".to_string())
            } else {
                Ok(key)
            }
        })
}

#[tauri::command]
async fn ask_gemini(prompt: String) -> Result<String, String> {
    let api_key = get_gemini_api_key()?;
    gemini::call_gemini(&api_key, &prompt).await
}

#[tauri::command]
async fn get_ai_motivation(app: AppHandle) -> Result<String, String> {
    let api_key = get_gemini_api_key()?;
    let goals = storage::read_goals(&app);

    let goals_info = if goals.is_empty() {
        "Henuz hedef olusturulmamis.".to_string()
    } else {
        goals
            .iter()
            .map(|g| {
                let pct = if g.target_amount > 0.0 {
                    (g.saved_amount / g.target_amount * 100.0).min(100.0)
                } else {
                    0.0
                };
                format!(
                    "- {}: {:.0}/{:.0} TL (%{:.0})",
                    g.name,
                    g.saved_amount,
                    g.target_amount,
                    pct
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let prompt = format!(
        "Sen bir kisisel finans motivasyon asistanisin. Kullanicinin birikim hedefleri sunlar:\n\n{}\n\nKullaniciya kisa (2-3 cumle), samimi, motive edici bir Turkce mesaj yaz. Hedeflerine ozel tavsiyelerde bulun.",
        goals_info
    );

    gemini::call_gemini(&api_key, &prompt).await
}

#[tauri::command]
fn check_gemini_available() -> bool {
    get_gemini_api_key().is_ok()
}

// ── App Entry ──

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file
    let _ = dotenvy::dotenv();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            load_goals,
            save_goals,
            load_settings,
            save_settings,
            ask_gemini,
            get_ai_motivation,
            check_gemini_available,
        ])
        .setup(|app| {
            // Start the notification scheduler
            let handle = app.handle().clone();
            notifications::start_notification_scheduler(handle);

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Hide window instead of closing - keep tray alive
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
