fn main() {
    // Attempt to load .env from project root or workspace at build time
    let _ = dotenvy::from_path_iter("../.env");
    let _ = dotenvy::dotenv();

    // Export GEMINI_API_KEY to compile-time env if present
    if let Ok(key) = std::env::var("GEMINI_API_KEY") {
        if !key.is_empty() && key != "your_gemini_api_key_here" {
            println!("cargo:rustc-env=EMBEDDED_GEMINI_API_KEY={}", key);
        }
    }

    tauri_build::build()
}
