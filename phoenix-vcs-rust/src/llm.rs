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
    
    format!(r#"You are a code generator. Output ONLY working {} code, no explanations.

Generate a module named "{}" implementing these requirements:

{}

RULES:
1. Output ONLY valid {} code - no markdown, no explanations, no analysis
2. Start with: # phoenix: iu_id = "{}"
3. Then module docstring with requirements listed
4. Then imports
5. Then actual implementations (classes/functions)
6. Use type hints
7. Include error handling
8. Make code runnable

OUTPUT ONLY CODE NOW:"#,
        request.language,
        request.module_name,
        req_list,
        request.language,
        request.iu_id,
    )
}

/// Clean up LLM response (remove markdown code fences and thinking text)
fn clean_code_response(code: &str, language: &str) -> String {
    let code = code.trim();
    
    // Remove markdown code blocks
    let fence = format!("```{}", language);
    let code = if code.starts_with(&fence) || code.starts_with("```") {
        code.lines()
            .skip(1)
            .take_while(|l| !l.starts_with("```"))
            .collect::<Vec<_>>()
            .join("\n")
    } else {
        code.to_string()
    };
    
    // Remove thinking/analysis text (look for phrases that indicate non-code content)
    let thinking_patterns = [
        "The user wants",
        "Let me analyze",
        "I'll implement",
        "Here are the requirements",
        "This module needs",
        "I need to",
        "To implement",
    ];
    
    let lines: Vec<&str> = code.lines().collect();
    let mut code_lines = Vec::new();
    let mut in_code = false;
    
    for line in &lines {
        // Check if this looks like code (has Python keywords, imports, etc.)
        let is_likely_code = line.starts_with("#")  // comment
            || line.starts_with("import ")
            || line.starts_with("from ")
            || line.starts_with("class ")
            || line.starts_with("def ")
            || line.starts_with("@")
            || line.trim().is_empty()
            || line.contains("=")  // assignment
            || line.starts_with("    ");  // indented
        
        // Skip thinking text until we hit actual code
        if !in_code {
            if is_likely_code || line.starts_with("# phoenix:") {
                in_code = true;
                code_lines.push(*line);
            } else if thinking_patterns.iter().any(|p| line.contains(p)) {
                // Skip thinking line
                continue;
            }
        } else {
            code_lines.push(*line);
        }
    }
    
    code_lines.join("\n").trim().to_string()
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
