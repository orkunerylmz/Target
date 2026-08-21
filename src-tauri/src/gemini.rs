use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
#[allow(dead_code)]
pub struct GeminiRequest {
    pub prompt: String,
    pub api_key: String,
}

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
pub async fn call_gemini(api_key: &str, prompt: &str) -> Result<String, String> {
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={}",
        api_key
    );

    let request_body = GeminiApiRequest {
        contents: vec![GeminiContent {
            parts: vec![GeminiPart {
                text: prompt.to_string(),
            }],
        }],
    };

    let client = reqwest::Client::new();
    let response = client
        .post(&url)
        .header("Content-Type", "application/json")
        .json(&request_body)
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let api_response: GeminiApiResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let text = api_response
        .candidates
        .and_then(|c| c.into_iter().next())
        .and_then(|c| c.content)
        .and_then(|c| c.parts.into_iter().next())
        .map(|p| p.text)
        .unwrap_or_else(|| "Yanıt alınamadı.".to_string());

    Ok(text)
}
