use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
struct GeminiApiRequest {
    contents: Vec<GeminiContent>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiContent {
    parts: Vec<GeminiPart>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiPart {
    text: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiApiResponse {
    candidates: Option<Vec<GeminiCandidate>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct GeminiCandidate {
    content: Option<GeminiContent>,
}

/// Calls the Gemini API with a prompt and returns the response text.
/// Uses proven active models (gemini-2.5-flash-lite -> gemini-flash-lite-latest -> gemini-flash-latest).
pub async fn call_gemini(api_key: &str, prompt: &str) -> Result<String, String> {
    let configured_model = std::env::var("GEMINI_MODEL").ok();

    // Active, high-speed free tier models with validated quotas
    let mut models = vec![
        "gemini-2.5-flash-lite",
        "gemini-flash-lite-latest",
        "gemini-flash-latest",
    ];

    // If user provided a specific model in .env, try it first
    if let Some(ref m) = configured_model {
        if !models.contains(&m.as_str()) {
            models.insert(0, m.as_str());
        }
    }

    let request_body = GeminiApiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart {
                text: prompt.to_string(),
            }],
        }],
    };

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| format!("İstek oluşturulamadı: {}", e))?;

    let mut last_error = String::new();

    for model in models {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model,
            api_key
        );

        let response = match client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&request_body)
            .send()
            .await
        {
            Ok(res) => res,
            Err(e) => {
                last_error = format!("Ağ bağlantı hatası: {}", e);
                continue;
            }
        };

        if response.status().is_success() {
            if let Ok(api_response) = response.json::<GeminiApiResponse>().await {
                if let Some(text) = api_response
                    .candidates
                    .and_then(|c| c.into_iter().next())
                    .and_then(|c| c.content)
                    .and_then(|c| c.parts.into_iter().next())
                    .map(|p| p.text)
                {
                    return Ok(text.trim().to_string());
                }
            }
        } else {
            let status = response.status();
            if status.as_u16() == 429 {
                last_error = "Gemini API istek kotası aşıldı. Lütfen kısa bir süre sonra tekrar deneyin.".to_string();
            } else if status.as_u16() == 503 {
                last_error = "Gemini sunucusu şu anda yoğun. Lütfen tekrar deneyin.".to_string();
            } else {
                let body = response.text().await.unwrap_or_default();
                last_error = format!("API Hatası ({}): {}", status, body);
            }
            // Seamlessly try next available model in the fallback chain
            continue;
        }
    }

    Err(if last_error.is_empty() {
        "Target AI yanıt üretemedi.".to_string()
    } else {
        last_error
    })
}
