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

fn get_gemini_api_key(app: &AppHandle) -> Result<String, String> {
    // 1. Check user settings saved via UI
    let settings = storage::read_settings(app);
    if let Some(ref key) = settings.gemini_api_key {
        let trimmed = key.trim();
        if !trimmed.is_empty() && trimmed != "your_gemini_api_key_here" {
            return Ok(trimmed.to_string());
        }
    }

    // 2. Check runtime process environment variable
    if let Ok(key) = std::env::var("GEMINI_API_KEY") {
        let trimmed = key.trim();
        if !trimmed.is_empty() && trimmed != "your_gemini_api_key_here" {
            return Ok(trimmed.to_string());
        }
    }

    // 3. Check compile-time embedded key (baked in during build)
    if let Some(key) = option_env!("EMBEDDED_GEMINI_API_KEY") {
        let trimmed = key.trim();
        if !trimmed.is_empty() && trimmed != "your_gemini_api_key_here" {
            return Ok(trimmed.to_string());
        }
    }

    Err("Gemini API anahtarı bulunamadı. Lütfen Ayarlar sayfasından API anahtarınızı girin.".to_string())
}

#[tauri::command]
async fn ask_gemini(app: AppHandle, prompt: String) -> Result<String, String> {
    let api_key = get_gemini_api_key(&app)?;
    gemini::call_gemini(&api_key, &prompt).await
}

#[tauri::command]
async fn test_gemini_api_key(api_key: String) -> Result<String, String> {
    let trimmed = api_key.trim();
    if trimmed.is_empty() {
        return Err("Lütfen geçerli bir API anahtarı girin.".to_string());
    }
    gemini::call_gemini(trimmed, "Test bağlantısı. 'OK' yanıtı ver.").await?;
    Ok("Bağlantı başarılı! Target AI kullanıma hazır.".to_string())
}

fn format_turkish_date(iso_date: &str) -> String {
    let parts: Vec<&str> = iso_date.split('-').collect();
    if parts.len() == 3 {
        if let (Ok(year), Ok(month), Ok(day)) = (
            parts[0].parse::<u32>(),
            parts[1].parse::<usize>(),
            parts[2].parse::<u32>(),
        ) {
            let months = [
                "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
                "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
            ];
            if month >= 1 && month <= 12 {
                return format!("{} {} {}", day, months[month - 1], year);
            }
        }
    }
    iso_date.to_string()
}

fn get_turkish_current_timestamp() -> String {
    let now = chrono::Local::now();
    let months = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
    ];
    let month_idx = now.format("%m").to_string().parse::<usize>().unwrap_or(1);
    let month_name = if month_idx >= 1 && month_idx <= 12 {
        months[month_idx - 1]
    } else {
        "Ağustos"
    };
    format!("{} {} {}", now.format("%d"), month_name, now.format("%Y"))
}

fn format_turkish_amount(amount: f64) -> String {
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

fn convert_amount(amount: f64, from: &str, to: &str, usd_in_try: f64, eur_in_try: f64) -> f64 {
    if from == to || amount == 0.0 {
        return amount;
    }
    let from_rate = match from {
        "USD" => usd_in_try,
        "EUR" => eur_in_try,
        _ => 1.0,
    };
    let to_rate = match to {
        "USD" => usd_in_try,
        "EUR" => eur_in_try,
        _ => 1.0,
    };
    let in_try = amount * from_rate;
    in_try / to_rate
}

#[tauri::command]
async fn get_ai_motivation(
    app: AppHandle,
    currency: Option<String>,
    usd_rate: Option<f64>,
    eur_rate: Option<f64>,
) -> Result<String, String> {
    let api_key = get_gemini_api_key(&app)?;
    let goals = storage::read_goals(&app);
    let settings = storage::read_settings(&app);

    let view_curr = currency.unwrap_or_else(|| {
        if settings.currency.trim().is_empty() { "TRY".to_string() } else { settings.currency }
    });
    let usd_in_try = usd_rate.unwrap_or(36.50);
    let eur_in_try = eur_rate.unwrap_or(38.00);

    let clean_view_curr = match view_curr.as_str() {
        "TRY" => "TL".to_string(),
        c => c.to_string(),
    };

    let mut total_saved = 0.0;
    let mut total_target = 0.0;

    let goals_info = if goals.is_empty() {
        "Henüz hedef oluşturulmamış.".to_string()
    } else {
        goals
            .iter()
            .map(|g| {
                let g_curr = g.currency.as_deref().unwrap_or("TRY");
                let saved_converted = convert_amount(g.saved_amount, g_curr, &view_curr, usd_in_try, eur_in_try);
                let target_converted = convert_amount(g.target_amount, g_curr, &view_curr, usd_in_try, eur_in_try);
                total_saved += saved_converted;
                total_target += target_converted;

                let pct = if g.target_amount > 0.0 {
                    (g.saved_amount / g.target_amount * 100.0).min(100.0)
                } else {
                    0.0
                };
                let date_info = match &g.target_date {
                    Some(d) => format!(" (Hedef Tarih: {})", format_turkish_date(d)),
                    None => "".to_string(),
                };
                format!(
                    "- {}: {} / {} {} (%{:.0}){}",
                    g.name,
                    format_turkish_amount(saved_converted),
                    format_turkish_amount(target_converted),
                    clean_view_curr,
                    pct,
                    date_info
                )
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    let remaining_total = (total_target - total_saved).max(0.0);
    let overall_pct = if total_target > 0.0 {
        (total_saved / total_target * 100.0).min(100.0)
    } else {
        0.0
    };

    let timestamp = get_turkish_current_timestamp();
    let prompt = format!(
        r#"Sen Target uygulamasının kıdemli kişisel finans, portföy stratejisti ve niceliksel bütçe analistisin. Güncel Tarih: {}

Kullanıcının seçtiği aktif görüntüleme para birimi: {}

Kullanıcının portföy tablosu (Tüm hedefler seçilen {} para birimine dönüştürülmüştür):
{}

Toplam Portföy Özeti:
- Toplam Mevcut Birikim: {} {}
- Toplam Hedeflenen Sermaye: {} {}
- Toplam Kalan Bütçe İhtiyacı: {} {}
- Genel Portföy Tamamlanma Oranı: %{:.1}

GÖREV:
Kullanıcının finansal portföyünü, hedefler arası sermaye dağılımını, tamamlanma temposunu ve zaman/nakit akışı baskısını DERİNLEMESİNE, TEKNİK, KAPSAMLI ve BİLGİLENDİRİCİ bir şekilde analiz et. Yüzeysel veya kısa (2-3 cümlelik) geçiştirmeler KESİNLİKLE YAPMA. Detaylı, zengin ve uygulanabilir bir finansal yol haritası sun.

Yanıtını şu 3 ana bölüm ve başlık yapısıyla, doyurucu uzunlukta ve akıcı paragraflarla oluştur:

**Portföy & Likidite Analizi:**
Genel tamamlanma oranını (%{:.1}), toplam biriken ({} {}) ile hedeflenen toplam sermaye ({} {}) arasındaki açığı ({} {}) teknik olarak değerlendir. Hedeflerin vade yapısını, portföyün risk ve tempo dağılımını açıkla.

**Stratejik Sermaye & Önceliklendirme:**
Hedefler arasındaki öncelik sıralamasını (yakın vadeli veya kritik hedeflere sermaye akışı tahsisi) belirle. Kullanıcının mevcut tasarruf hızını artırması için hedefler arası bütçe paylaştırma optimizasyonunu açıkla.

**Teknik Tasarruf & Bütçe Optimizasyon Planı:**
Portföyü hedeflenen sürelere yetiştirmek için uygulanabilecek somut, teknik finansal taktikler sun (Örn: 50/30/20 kuralı uyarlaması, gereksiz sabit abonelik/gider denetimi, otomatik maaş günü birikim aktarımı, nakit akışı tamponu oluşturma).

ÖNEMLİ KURALLAR:
1. Kullanıcı Dashboard'u '{}' para biriminde görüntülüyor. Raporunun genelinde SADECE ve SADECE '{}' para birimini kullan.
2. Sana verilen kesin toplam tutarları (Toplam Birikim: {} {}, Kalan: {} {}) ve hedef verilerini BİREBİR KULLAN, kafandan farklı sayı veya para birimi uydurma.
3. Tutarları her zaman 3 basamaklı binlik ayracıyla yaz (Örnek: 100.000 TL veya 20.000 USD).
4. Tarihleri asla 'YYYY-MM-DD' veya '2026-08-22' gibi rakamsal formatta yazma, her zaman '22 Ağustos 2026' gibi Türkçe sözel olarak belirt.
5. Kesinlikle hiçbir emoji kullanma.
6. Asla 'Sen Target...', 'Kapsamlı bir analiz sunuyorum', 'Merhaba' gibi giriş cümleleri yazma. Doğrudan '**Portföy & Likidite Analizi:**' başlığıyla başla."#,
        timestamp,
        clean_view_curr,
        clean_view_curr,
        goals_info,
        format_turkish_amount(total_saved), clean_view_curr,
        format_turkish_amount(total_target), clean_view_curr,
        format_turkish_amount(remaining_total), clean_view_curr,
        overall_pct,
        overall_pct,
        format_turkish_amount(total_saved), clean_view_curr,
        format_turkish_amount(total_target), clean_view_curr,
        format_turkish_amount(remaining_total), clean_view_curr,
        clean_view_curr,
        clean_view_curr,
        format_turkish_amount(total_saved), clean_view_curr,
        format_turkish_amount(remaining_total), clean_view_curr
    );

    gemini::call_gemini(&api_key, &prompt).await
}

#[tauri::command]
async fn get_goal_ai_advice(
    app: AppHandle,
    goal_name: String,
    target_amount: f64,
    saved_amount: f64,
    target_date: Option<String>,
    currency: String,
) -> Result<String, String> {
    let api_key = get_gemini_api_key(&app)?;
    let remaining = (target_amount - saved_amount).max(0.0);
    let pct = if target_amount > 0.0 {
        (saved_amount / target_amount * 100.0).min(100.0)
    } else {
        0.0
    };

    let clean_currency = match currency.as_str() {
        "TRY" => "TL".to_string(),
        c if c.trim().is_empty() => "TL".to_string(),
        c => c.to_string(),
    };

    let (date_str, duration_info, monthly_info, daily_info) = match &target_date {
        Some(d) => {
            let verbal = format_turkish_date(d);
            if let Ok(target_d) = chrono::NaiveDate::parse_from_str(d, "%Y-%m-%d") {
                let today = chrono::Local::now().naive_local().date();
                let days = (target_d - today).num_days();
                if days > 0 {
                    let months = (days as f64 / 30.4).max(1.0);
                    let monthly = remaining / months;
                    let daily = remaining / (days as f64);
                    (
                        format!("Hedeflenen Tarih: {}", verbal),
                        format!("{} gün (yaklaşık {:.1} ay)", days, months),
                        format!("ayda yaklaşık {} {}", format_turkish_amount(monthly), clean_currency),
                        format!("günde yaklaşık {} {}", format_turkish_amount(daily), clean_currency),
                    )
                } else {
                    (
                        format!("Hedeflenen Tarih: {} (Hedef tarihi dolmuş)", verbal),
                        "Hedef tarihi ulaşıldı veya geçti".to_string(),
                        "Hedef tarihi dolmuş".to_string(),
                        "Hedef tarihi dolmuş".to_string(),
                    )
                }
            } else {
                (
                    format!("Hedeflenen Tarih: {}", verbal),
                    "Belirtilmemiş".to_string(),
                    "Açık uçlu".to_string(),
                    "Açık uçlu".to_string(),
                )
            }
        }
        None => (
            "Hedeflenen Tarih: Belirtilmemiş (Açık uçlu)".to_string(),
            "Açık uçlu (Tarih yok)".to_string(),
            "Açık uçlu".to_string(),
            "Açık uçlu".to_string(),
        ),
    };

    let timestamp = get_turkish_current_timestamp();
    let prompt = format!(
        r#"Sen Target uygulamasının kıdemli kişisel finans stratejisti ve hedef analistisin. Güncel Tarih: {}

Kullanıcının odaklandığı hedef verileri:
- Hedef Adı: {}
- Hedef Para Birimi: {}
- Hedef Tutarı: {} {}
- Mevcut Birikim: {} {}
- Kalan Tutar: {} {}
- Tamamlanma Oranı: %{:.1}
- {}
- Kalan Süre: {}
- Gereken Aylık Tasarruf: {}
- Gereken Günlük Tasarruf: {}

GÖREV:
Bu hedefi finansal, zamansal ve matematiksel açıdan DERİNLEMESİNE, TEKNİK, KAPSAMLI ve BİLGİLENDİRİCİ bir şekilde analiz et. Yüzeysel veya 2-3 cümlelik kısa geçiştirmeler KESİNLİKLE YAPMA. Kullanıcıya tam bir finansal yol haritası ve somut optimizasyon planı sun.

Yanıtını şu 3 ana bölüm ve başlık yapısıyla, detaylı ve doyurucu uzunlukta oluştur:

**Hedef Durumu & Zaman/Sermaye Analizi:**
Hedef tutarını ({} {}), mevcut birikimi ({} {}), kalan tutarı ({} {}), tamamlanma oranını (%{:.1}) ve kalan süreyi ({}) değerlendir. Belirlenen tarihe ulaşabilmek için gereken aylık ({}) ve günlük ({}) tasarruf yükünü matematiksel gerçekçiliğiyle analiz et.

**Finansal Fizibilite & Risk Değerlendirmesi:**
Bu hedefin mevcut tasarruf temposuyla tamamlanabilirlik derecesini, vadesine göre nakit akışında yaratacağı baskıyı ve olası gecikme risklerini incele. Hedefe daha rahat ulaşabilmek için vadesel veya bütçesel esneklikleri yorumla.

**Stratejik Eylem Planı & Bütçe Optimizasyonu:**
Kullanıcının bu {} tutarındaki aylık hedefi aksatmadan biriktirebilmesi ve hedefe daha erken ulaşabilmesi için 2-3 somut, uygulanabilir teknik yöntem sun (Örn: harcama kalemlerinde mikro optimizasyon, otomatik maaş günü aktarımı, ek gelirlerin hedefe yönlendirilmesi, 24 saat kuralı ile dürtüsel harcamaların önlenmesi).

ÖNEMLİ KURALLAR:
1. Kullanıcının seçtiği para birimi '{}'dir. Raporunda SADECE ve SADECE '{}' para birimini kullan (Asla farklı bir para birimine dönüştürme).
2. Sana verilen kesin matematiksel verileri (Hedef Tutarı: {} {}, Kalan Tutar: {} {}, Kalan Süre: {}, Aylık Tasarruf: {}) BİREBİR KULLAN, sayıları kafandan değiştirme veya yuvarlama.
3. Tutarları her zaman 3 basamaklı binlik ayracıyla yaz (Örnek: 19.500 USD veya 250.000 TL).
4. Tarihleri asla 'YYYY-MM-DD' veya '2026-08-22' gibi rakamsal formatta yazma, her zaman '22 Ağustos 2026' gibi Türkçe sözel olarak belirt.
5. Kesinlikle hiçbir emoji kullanma.
6. Asla 'Sen Target...', 'Kapsamlı bir analiz sunuyorum', 'Merhaba' gibi giriş cümleleri yazma. Doğrudan '**Hedef Durumu & Zaman/Sermaye Analizi:**' başlığıyla başla."#,
        timestamp,
        goal_name,
        clean_currency,
        format_turkish_amount(target_amount), clean_currency,
        format_turkish_amount(saved_amount), clean_currency,
        format_turkish_amount(remaining), clean_currency,
        pct,
        date_str,
        duration_info,
        monthly_info,
        daily_info,
        format_turkish_amount(target_amount), clean_currency,
        format_turkish_amount(saved_amount), clean_currency,
        format_turkish_amount(remaining), clean_currency,
        pct,
        duration_info,
        monthly_info,
        daily_info,
        monthly_info,
        clean_currency,
        clean_currency,
        format_turkish_amount(target_amount), clean_currency,
        format_turkish_amount(remaining), clean_currency,
        duration_info,
        monthly_info
    );

    gemini::call_gemini(&api_key, &prompt).await
}

#[tauri::command]
fn check_gemini_available(app: AppHandle) -> bool {
    get_gemini_api_key(&app).is_ok()
}

#[tauri::command]
fn send_test_notification(app: AppHandle) -> Result<(), String> {
    use tauri_plugin_notification::NotificationExt;
    let goals = storage::read_goals(&app);
    let settings = storage::read_settings(&app);
    let message = notifications::generate_smart_message(&goals, &settings);

    // 1. Tauri Plugin Notification
    let _ = app
        .notification()
        .builder()
        .title("Target")
        .body(&message)
        .icon("icon")
        .show();

    // 2. Guaranteed macOS Native Banner Delivery
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

    Ok(())
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
            test_gemini_api_key,
            get_ai_motivation,
            get_goal_ai_advice,
            check_gemini_available,
            send_test_notification,
        ])
        .setup(|app| {
            // Start the notification scheduler
            let handle = app.handle().clone();
            notifications::start_notification_scheduler(handle);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
