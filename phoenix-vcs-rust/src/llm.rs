//! LLM Integration for Intelligent Code Generation
//!
//! Uses Fireworks API with minimax-m2p7 to generate actual implementations
//! from Phoenix requirements.

use anyhow::{Result, Context};
use serde::{Deserialize, Serialize};

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
            model: "accounts/fireworks/models/minimax-m2p7".to_string(),
            api_key: std::env::var("FIREWORKS_API_KEY").ok(),
            max_tokens: 4096,
            temperature: 0.0, // Maximum determinism, reduce reasoning output
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
    /// Available module APIs for integration
    pub module_apis: Option<Vec<ModuleApi>>,
}

/// Public API of a generated module
#[derive(Debug, Clone, Serialize)]
pub struct ModuleApi {
    pub name: String,
    pub classes: Vec<String>,
    pub functions: Vec<String>,
    pub exports: Vec<String>,
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
    template_prompt: Option<&str>,
) -> Result<String> {
    let client = reqwest::Client::new();
    
    let prompt = build_generation_prompt(request, template_prompt);
    
    let api_request = FireworksRequest {
        model: config.model.clone(),
        messages: vec![
            Message {
                role: "system".to_string(),
                content: "You are a code generator. Output ONLY valid code. No explanations, no reasoning, no markdown formatting. Just raw code starting with the phoenix tracking comment.".to_string(),
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
fn build_generation_prompt(request: &CodeGenRequest, template_prompt: Option<&str>) -> String {
    // Template MUST provide llm_prompt - no fallback per agents.md
    let template = template_prompt.expect(
        "No llm_prompt found in template.\n\
         Templates must define llm_prompt field.\n\
         Create: templates/python-textual.ncl (for TUI) or templates/python-flask.ncl (for web)\n\
         Example:\n\
         {{\n           llm_prompt = m%'...prompt text...'%,\n         }}"
    );
    
    // Render template prompt with variable substitutions
    let mut prompt = template.to_string();
    prompt = prompt.replace("{{iu_id}}", &request.iu_id);
    prompt = prompt.replace("{{name}}", &request.module_name);
    prompt = prompt.replace("{{language}}", &request.language);
    let req_list = request.requirements.join("\n");
    prompt = prompt.replace("{{requirements}}", &req_list);
    prompt
}

/// Clean up LLM response (remove markdown code fences and thinking text)
fn clean_code_response(code: &str, _language: &str) -> String {
    let code = code.trim();
    
    let lines: Vec<&str> = code.lines().collect();
    let mut code_lines = Vec::new();
    let mut found_phoenix_header = false;
    
    for line in &lines {
        let trimmed = line.trim();
        
        // Skip markdown fences
        if trimmed.starts_with("```") {
            continue;
        }
        
        // FORBIDDEN: Any module declaration
        if trimmed.starts_with("pub mod ") || trimmed.starts_with("mod ") {
            continue; // Skip mod declarations entirely
        }
        
        // Detect phoenix header - this marks the REAL start
        // Support both Python (#) and Rust (//) style comments
        let is_phoenix_header = trimmed.starts_with("# phoenix:") 
            || trimmed.starts_with("// phoenix:")
            || ((trimmed.starts_with("# ") || trimmed.starts_with("// ")) && trimmed.contains("iu_id"));
        if is_phoenix_header {
            if found_phoenix_header {
                // Second header found - this means new file started, stop here
                break;
            }
            found_phoenix_header = true;
            code_lines.push(*line);
            continue;
        }
        
        // If we haven't found the header yet, skip everything
        if !found_phoenix_header {
            continue;
        }
        
        // Detect analysis/thinking patterns (even after code started)
        let is_analysis = trimmed.starts_with(|c: char| c.is_ascii_digit() && c != '0')  // "1." but not "0.x"
            || trimmed.starts_with("For ")
            || trimmed.starts_with("One ")
            || trimmed.starts_with("Actually,")
            || trimmed.starts_with("So ")
            || trimmed.starts_with("Let me")
            || trimmed.starts_with("I'll ")
            || trimmed.starts_with("Here ")
            || trimmed.starts_with("Additional")
            || trimmed.starts_with("Note:")
            || trimmed.starts_with("But ")
            || trimmed.starts_with("Wait,")
            || trimmed.starts_with("Hmm,")
            || trimmed.starts_with("Looking")
            || trimmed.starts_with("This ")
            || trimmed.starts_with("That ")
            || trimmed.starts_with("However,")
            || trimmed.starts_with("Alternatively,")
            || trimmed.starts_with("- ")  // Bullet points outside docstrings
            || trimmed.starts_with("* ")
            || trimmed.contains("🔴")
            || trimmed.contains("🟢")
            || trimmed.contains("🔵")
            || trimmed.contains("⚠️")
            || trimmed.contains("✅")
            || trimmed.contains("❌")
            || trimmed.contains("I should")
            || trimmed.contains("I think")
            || trimmed.contains("I need")
            || trimmed.contains("I was")
            || trimmed.contains("I am")
            || trimmed.contains("I'");  // I'll, I'm, etc.
        
        if is_analysis {
            // Skip this analysis line
            continue;
        }
        
        // This looks like actual code, keep it
        code_lines.push(*line);
    }
    
    let result = code_lines.join("\n").trim().to_string();
    
    // If we got nothing, return original
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
            // Batch mode requires templates to be set in request or will fail
            generate_code_with_llm(&request, &config, None).await
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
