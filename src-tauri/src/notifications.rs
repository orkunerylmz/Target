use crate::storage::{read_goals, read_settings, Goal};
use chrono::Local;
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

/// Generates a motivational notification message based on goals.
fn generate_message(goals: &[Goal]) -> String {
    let generic_messages = vec![
        "Bugun biraz daha biriktirmek ister misin?",
        "Hedefini unutma. Kucuk adimlar da ilerlemedir!",
        "Her gun bir adim daha yakinsin!",
        "Tutarlilik basarinin anahtaridir!",
        "Gelecekteki sen bugunku senin cabasina tesekkur edecek!",
    ];

    if goals.is_empty() {
        let idx = Local::now().timestamp() as usize % generic_messages.len();
        return generic_messages[idx].to_string();
    }

    // Pick a goal based on current time to vary messages
    let idx = Local::now().timestamp() as usize % goals.len();
    let goal = &goals[idx];

    let percentage = if goal.target_amount > 0.0 {
        ((goal.saved_amount / goal.target_amount) * 100.0).min(100.0)
    } else {
        0.0
    };
    let remaining = (goal.target_amount - goal.saved_amount).max(0.0);

    let goal_messages = vec![
        format!(
            "{} hedefine %{:.0} ulastin!",
            goal.name,
            percentage
        ),
        format!(
            "{} hedefine {:.0} TL kaldi.",
            goal.name,
            remaining
        ),
        format!(
            "Bugun {} icin biriktirmeye ne dersin?",
            goal.name
        ),
        format!(
            "{} hedefinle gurur duymalisin! %{:.0} tamamlandi.",
            goal.name,
            percentage
        ),
    ];

    let msg_idx = Local::now().timestamp() as usize % goal_messages.len();
    goal_messages[msg_idx].clone()
}

/// Starts the notification scheduler in a background thread.
/// Checks every 30 seconds if the current time matches any notification time.
pub fn start_notification_scheduler(app: AppHandle) {
    let sent_times: Arc<Mutex<HashSet<String>>> = Arc::new(Mutex::new(HashSet::new()));

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(Duration::from_secs(30));

            let settings = read_settings(&app);

            if !settings.notifications_enabled {
                continue;
            }

            let now = Local::now();
            let current_time = now.format("%H:%M").to_string();
            let current_key = now.format("%Y-%m-%d %H:%M").to_string();

            if settings.notification_times.contains(&current_time) {
                let mut sent = sent_times.lock().unwrap();

                if !sent.contains(&current_key) {
                    sent.insert(current_key.clone());

                    let goals = read_goals(&app);
                    let message = generate_message(&goals);

                    let _ = app
                        .notification()
                        .builder()
                        .title("Goal Tracker")
                        .body(&message)
                        .show();
                }

                // Cleanup old entries (keep only today's)
                let today = now.format("%Y-%m-%d").to_string();
                sent.retain(|k| k.starts_with(&today));
            }
        }
    });
}
