use crate::storage::{read_goals, read_settings, AppSettings, Goal, NotificationSchedule};
use chrono::{Local, Timelike};
use std::collections::HashSet;
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::AppHandle;
use tauri_plugin_notification::NotificationExt;

use std::sync::atomic::{AtomicUsize, Ordering};

static NOTIFICATION_COUNTER: AtomicUsize = AtomicUsize::new(0);

fn format_amount(amount: f64) -> String {
    let rounded_cents = (amount * 100.0).round() as i64;
    let int_part = rounded_cents / 100;
    let cents = (rounded_cents % 100).abs();

    let s = int_part.abs().to_string();
    let mut result = String::new();
    let chars: Vec<char> = s.chars().collect();
    let len = chars.len();
    for (i, &c) in chars.iter().enumerate() {
        if i > 0 && (len - i) % 3 == 0 {
            result.push('.');
        }
        result.push(c);
    }
    let sign = if int_part < 0 { "-" } else { "" };

    if cents > 0 {
        format!("{}{},{:02}", sign, result, cents)
    } else {
        format!("{}{}", sign, result)
    }
}

fn format_currency(amount: f64, currency: &str) -> String {
    let formatted = format_amount(amount);
    match currency {
        "USD" => format!("${}", formatted),
        "EUR" => format!("{} €", formatted),
        _ => format!("{} TL", formatted),
    }
}

/// Generates an intelligent, diversified notification message based on goals and user notification preferences.
pub fn generate_smart_message(goals: &[Goal], settings: &AppSettings) -> String {
    let now = Local::now();
    let hour = now.hour();
    let count = NOTIFICATION_COUNTER.fetch_add(1, Ordering::SeqCst);

    let financial_mindset_quotes = [
        "24 Saat Kuralı: Ani bir harcama yapmadan önce 24 saat bekleyin ve bütçenizi koruyun.",
        "Küçük tasarruflar bileşik getiriyle büyük hedeflere dönüşür. Bugün hedeflerine sadık kal!",
        "Gereksiz abonelik ve harcamaları optimize etmek, hayalindeki hedefleri aylar öncesine çekebilir.",
        "Finansal disiplin özgürlüğünü kısıtlamaz, gelecekteki özgürlüğünü inşa eder.",
        "Bugün harcamadığınız her kuruş, yarınki finansal bağımsızlığınızın tuğlasıdır.",
        "Tutarlılık başarının anahtarıdır. Küçük birikimler devasa sonuçlar doğurur.",
        "Hedefine her gün bir adım daha yakınsın. Tasarruf alışkanlığını sürdür!",
        "Gelecekteki sen, bugünkü tasarruf kararlarına ve hedeflerine teşekkür edecek.",
    ];

    let disabled_ids: Vec<String> = settings
        .disabled_goal_notification_ids
        .clone()
        .unwrap_or_default();

    let incomplete_goals: Vec<&Goal> = goals
        .iter()
        .filter(|g| g.saved_amount < g.target_amount && !disabled_ids.contains(&g.id))
        .collect();

    // 1. Goal Progress with Dynamic Cyclic Rotation across all enabled goals
    if settings.notify_goal_progress && !incomplete_goals.is_empty() {
        if incomplete_goals.len() > 1 {
            let mode = count % (incomplete_goals.len() + 1);
            if mode == 0 {
                // Multi-goal comprehensive summary
                let summaries: Vec<String> = incomplete_goals
                    .iter()
                    .take(3)
                    .map(|g| {
                        let p = if g.target_amount > 0.0 {
                            (g.saved_amount / g.target_amount * 100.0).min(100.0)
                        } else {
                            0.0
                        };
                        let rem = (g.target_amount - g.saved_amount).max(0.0);
                        let g_curr = g.currency.as_deref().unwrap_or(&settings.currency);
                        format!("{}: %{:.0} (Kalan: {})", g.name, p, format_currency(rem, g_curr))
                    })
                    .collect();
                return format!("Hedefleriniz: {}", summaries.join(" • "));
            } else {
                let target_goal = incomplete_goals[mode - 1];
                let rem = (target_goal.target_amount - target_goal.saved_amount).max(0.0);
                let pct = if target_goal.target_amount > 0.0 {
                    (target_goal.saved_amount / target_goal.target_amount * 100.0).min(100.0)
                } else {
                    0.0
                };
                let g_curr = target_goal.currency.as_deref().unwrap_or(&settings.currency);
                return format!(
                    "İlerleme: '{}' hedefine %{:.0} ulaştın. Hedefe sadece {} kaldı!",
                    target_goal.name,
                    pct,
                    format_currency(rem, g_curr)
                );
            }
        } else {
            let target_goal = incomplete_goals[0];
            let rem = (target_goal.target_amount - target_goal.saved_amount).max(0.0);
            let pct = if target_goal.target_amount > 0.0 {
                (target_goal.saved_amount / target_goal.target_amount * 100.0).min(100.0)
            } else {
                0.0
            };
            let g_curr = target_goal.currency.as_deref().unwrap_or(&settings.currency);
            return format!(
                "İlerleme: '{}' hedefine %{:.0} ulaştın. Hedefe sadece {} kaldı!",
                target_goal.name,
                pct,
                format_currency(rem, g_curr)
            );
        }
    }

    // 2. Daily Summary (if enabled)
    if settings.notify_daily_summary && !goals.is_empty() {
        let total_saved: f64 = goals.iter().map(|g| g.saved_amount).sum();
        let total_target: f64 = goals.iter().map(|g| g.target_amount).sum();
        let total_pct = if total_target > 0.0 {
            (total_saved / total_target * 100.0).min(100.0)
        } else {
            0.0
        };

        if hour >= 18 {
            return format!(
                "Günün Özeti: Toplam {} hedefiniz için {} biriktirdiniz (%{:.0}). Tebrikler!",
                goals.len(),
                format_currency(total_saved, &settings.currency),
                total_pct
            );
        }
    }

    // 3. Financial Motivation & Advice (if enabled)
    if settings.notify_motivation_tips {
        let idx = count % financial_mindset_quotes.len();
        return financial_mindset_quotes[idx].to_string();
    }

    // Fallback default
    if let Some(g) = goals.first() {
        let rem = (g.target_amount - g.saved_amount).max(0.0);
        let g_curr = g.currency.as_deref().unwrap_or(&settings.currency);
        format!(
            "{} hedefinize ulaşmaya {} kaldı. Hedefine sadık kal!",
            g.name,
            format_currency(rem, g_curr)
        )
    } else {
        "Target: Yeni bir hedef belirleyip birikim yapmaya bugün başlayın!".to_string()
    }
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

            let matched_schedule: Option<NotificationSchedule> = if let Some(schedules) = &settings.notification_schedules {
                use chrono::Datelike;
                let weekday = now.weekday().num_days_from_monday(); // 0=Mon, 6=Sun
                schedules.iter().find(|s| {
                    if !s.enabled || s.time != current_time {
                        return false;
                    }
                    if let Some(rep) = &s.repeat {
                        match rep.as_str() {
                            "Hafta içi" => weekday < 5,
                            "Hafta sonu" => weekday >= 5,
                            _ => true,
                        }
                    } else {
                        true
                    }
                }).cloned()
            } else if settings.notification_times.contains(&current_time) {
                Some(NotificationSchedule {
                    time: current_time.clone(),
                    enabled: true,
                    label: None,
                    repeat: None,
                    goal_id: None,
                })
            } else {
                None
            };

            if let Some(_schedule) = matched_schedule {
                let mut sent = sent_times.lock().unwrap();

                if !sent.contains(&current_key) {
                    sent.insert(current_key.clone());

                    let goals = read_goals(&app);
                    let message = generate_smart_message(&goals, &settings);

                    let _ = app
                        .notification()
                        .builder()
                        .title("Target")
                        .body(&message)
                        .icon("icon")
                        .show();

                    #[cfg(target_os = "macos")]
                    {
                        let escaped_msg = message.replace('\\', "\\\\").replace('"', "\\\"");
                        let script = format!(
                            "display notification \"{}\" with title \"Target\" sound name \"Glass\"",
                            escaped_msg
                        );
                        let _ = std::process::Command::new("osascript")
                            .arg("-e")
                            .arg(script)
                            .spawn();
                    }
                }

                // Cleanup old entries (keep only today's)
                let today = now.format("%Y-%m-%d").to_string();
                sent.retain(|k| k.starts_with(&today));
            }
        }
    });
}
