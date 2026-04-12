//! LLM Integration for Intelligent Code Generation
//!
//! Uses Fireworks API with kimi-k2p5-turbo to generate actual implementations
//! from Phoenix requirements.

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};
use serde_json::json;

/// LLM configuration
#[derive(Debug, Clone)]
pub struct LlmConfig {
    pub api_base: String,
    pub model: String,
    pub api_key: Option<String>,
    pub max_tokens: u32,
    pub temperature: f32,
}

impl Default for LlmConfig {
    fn default() -> Self {
        Self {
            api_base: "https://api.fireworks.ai/inference/v1".to_string(),
            model: "accounts/fireworks/routers/kimi-k2p5-turbo".to_string(),
            api_key: std::env::var("FIREWORKS_API_KEY").ok(),
            max_tokens: 4096,
            temperature: 0.2,
        }
    }
}

/// Code generation request
#[derive(Debug, Clone)]
pub struct CodeGenRequest {
    pub requirements: Vec<String>,
    pub language: String,
    pub module_name: String,
    pub iu_id: String,
    pub context: Option<String>,
}

/// Fireworks API request
#[derive(Debug, Serialize)]
struct FireworksRequest {
    model: String,
    messages: Vec<Message>,
    max_tokens: u32,
    temperature: f32,
}

#[derive(Debug, Serialize)]
struct Message {
    role: String,
    content: String,
}

/// Fireworks API response
#[derive(Debug, Deserialize)]
struct FireworksResponse {
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ResponseMessage,
}

#[derive(Debug, Deserialize)]
struct ResponseMessage {
    content: String,
}

/// Generate code from requirements using LLM
pub async fn generate_code_with_llm(
    request: &CodeGenRequest,
    config: &LlmConfig,
) -> Result<String> {
    let client = reqwest::Client::new();
    
    let prompt = build_generation_prompt(request);
    
    let api_request = FireworksRequest {
        model: config.model.clone(),
        messages: vec![
            Message {
                role: "system".to_string(),
                content: "You are an expert software engineer. Generate clean, well-documented, production-ready code. Follow best practices for the target language. Include Phoenix VCS tracking comments.".to_string(),
            },
            Message {
                role: "user".to_string(),
                content: prompt,
            },
        ],
        max_tokens: config.max_tokens,
        temperature: config.temperature,
    };
    
    let mut request_builder = client
        .post(format!("{}/chat/completions", config.api_base))
        .header("Content-Type", "application/json")
        .json(&api_request);
    
    // Add auth if available
    if let Some(ref key) = config.api_key {
        request_builder = request_builder.header("Authorization", format!("Bearer {}", key));
    }
    
    let response = request_builder
        .send()
        .await
        .context("Failed to send request to Fireworks API")?;
    
    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        anyhow::bail!("Fireworks API error {}: {}", status, body);
    }
    
    let api_response: FireworksResponse = response
        .json()
        .await
        .context("Failed to parse Fireworks API response")?;
    
    let generated_code = api_response
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .unwrap_or_default();
    
    // Clean up the response (remove markdown code blocks if present)
    let cleaned = clean_code_response(&generated_code, &request.language);
    
    Ok(cleaned)
}

/// Build the prompt for code generation
fn build_generation_prompt(request: &CodeGenRequest) -> String {
    // Limit to top 20 most important requirements to avoid overwhelming the LLM
    let top_requirements: Vec<String> = request
        .requirements
        .iter()
        .filter(|r| r.contains("REQUIREMENT:"))
        .take(20)
        .cloned()
        .collect();
    
    // If no REQUIREMENT lines found, just take first 20
    let req_list = if top_requirements.is_empty() {
        request
            .requirements
            .iter()
            .take(20)
            .enumerate()
            .map(|(i, r)| format!("{}. {}", i + 1, r.chars().take(200).collect::<String>()))
            .collect::<Vec<_>>()
            .join("\n")
    } else {
        top_requirements
            .iter()
            .enumerate()
            .map(|(i, r)| format!("{}. {}", i + 1, r.chars().take(200).collect::<String>()))
            .collect::<Vec<_>>()
            .join("\n")
    };
    
    format!(r#"You are a code generator. Output ONLY valid {} code. No explanations. No markdown. No numbered lists. No emojis.

Module: {}
IU ID: {}

Requirements to implement:
{}

OUTPUT RULES:
1. First line MUST be: # phoenix: iu_id = "{}"
2. Second line: """Docstring with requirements."""
3. Then: imports
4. Then: actual implementations
5. Use type hints
6. NO other text before or after code

OUTPUT CODE NOW:"#,
        request.language,
        request.module_name,
        request.iu_id,
        req_list,
        request.iu_id,
    )
}

/// Clean up LLM response (remove markdown code fences and thinking text)
fn clean_code_response(code: &str, _language: &str) -> String {
    let code = code.trim();
    
    // First pass: look for actual code block
    let lines: Vec<&str> = code.lines().collect();
    let mut code_lines = Vec::new();
    let mut found_code_start = false;
    
    for line in &lines {
        let trimmed = line.trim();
        
        // Skip markdown fences
        if trimmed.starts_with("```") {
            continue;
        }
        
        // Detect actual code start - look for Python/Rust/TypeScript patterns
        let is_definitely_code = trimmed.starts_with("# phoenix:")
            || trimmed.starts_with("# ") && trimmed.contains("iu_id")
            || trimmed.starts_with("import ")
            || trimmed.starts_with("from ")
            || trimmed.starts_with("class ")
            || trimmed.starts_with("def ")
            || trimmed.starts_with("mod ")  // Rust
            || trimmed.starts_with("pub ")  // Rust
            || trimmed.starts_with("fn ")   // Rust
            || trimmed.starts_with("use ")  // Rust
            || trimmed.starts_with("export ") // TS
            || trimmed.starts_with("const ")
            || trimmed.starts_with("let ")
            || trimmed.starts_with("type ")
            || trimmed.starts_with("interface ");
        
        // Detect definitely NOT code (analysis/thinking)
        let is_analysis = trimmed.starts_with(|c: char| c.is_ascii_digit())  // "1." "2." etc
            || trimmed.starts_with("Let me")
            || trimmed.starts_with("I'll ")
            || trimmed.starts_with("Here ")
            || trimmed.starts_with("Additional")
            || trimmed.starts_with("- ")  // Bullet points
            || trimmed.starts_with("* ")
            || trimmed.starts_with("• ")
            || trimmed.contains("🔴")
            || trimmed.contains("🟢")
            || trimmed.contains("🔵")
            || trimmed.contains("⚠️")
            || trimmed.contains("✅")
            || trimmed.contains("❌");
        
        if is_definitely_code {
            found_code_start = true;
            code_lines.push(*line);
        } else if found_code_start && !is_analysis {
            // Once we're in code mode, keep lines unless clearly analysis
            // Allow empty lines, indented lines, closing braces, etc.
            code_lines.push(*line);
        }
        // Otherwise skip (analysis before code starts)
    }
    
    let result = code_lines.join("\n").trim().to_string();
    
    // If we got nothing, return original (maybe it was already clean)
    if result.is_empty() {
        code.to_string()
    } else {
        result
    }
}

/// Check if LLM generation is available
pub fn is_llm_available(config: &LlmConfig) -> bool {
    // If no API key, we might still be able to use it if the endpoint doesn't require auth
    // For now, assume we need a key
    config.api_key.is_some() || std::env::var("FIREWORKS_API_KEY").is_ok()
}

/// Generate code for multiple IUs in parallel
pub async fn generate_code_batch(
    requests: Vec<CodeGenRequest>,
    config: &LlmConfig,
) -> Vec<Result<String>> {
    let mut handles = Vec::new();
    
    for request in requests {
        let config = config.clone();
        let handle = tokio::spawn(async move {
            generate_code_with_llm(&request, &config).await
        });
        handles.push(handle);
    }
    
    let mut results = Vec::new();
    for handle in handles {
        match handle.await {
            Ok(result) => results.push(result),
            Err(e) => results.push(Err(anyhow::anyhow!("Task panicked: {}", e))),
        }
    }
    
    results
}
