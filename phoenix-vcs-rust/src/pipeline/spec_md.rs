//! Spec.md → Contract Template → Spec.ncl Pipeline
//!
//! Human-readable specs → LLM generates Nickel satisfying contracts → Machine-readable specs

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// A template bundle containing contract template and prompt
#[derive(Debug, Clone)]
pub struct TemplateBundle {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub contract_content: String,
    pub prompt_template: String,
    pub metadata: BundleMetadata,
}

/// Bundle metadata from bundle.ncl or bundle.toml
#[derive(Debug, Clone, Default)]
pub struct BundleMetadata {
    pub name: String,
    pub language: String,
    pub framework: String,
    pub description: String,
    pub keywords: Vec<String>, // For matching specs to templates
}

/// Discovers all template bundles in the bundles/ directory
pub fn discover_template_bundles(bundles_dir: impl AsRef<Path>) -> Result<Vec<TemplateBundle>> {
    let bundles_dir = bundles_dir.as_ref();
    let mut bundles = Vec::new();
    
    if !bundles_dir.exists() {
        return Ok(bundles);
    }
    
    for entry in std::fs::read_dir(bundles_dir)? {
        let entry = entry?;
        let path = entry.path();
        
        if path.is_dir() {
            if let Some(bundle) = load_bundle(&path)? {
                bundles.push(bundle);
            }
        }
    }
    
    Ok(bundles)
}

/// Load a single template bundle from directory
fn load_bundle(bundle_path: &Path) -> Result<Option<TemplateBundle>> {
    // Use contract-based template
    let contract_file = bundle_path.join("template_contract.ncl");
    let prompt_file = bundle_path.join("prompt_contract.md");
    let bundle_file = bundle_path.join("bundle.ncl");
    
    // Must have contract template
    if !contract_file.exists() {
        return Ok(None);
    }
    
    let contract_content = std::fs::read_to_string(&contract_file)
        .with_context(|| format!("Failed to read {:?}", contract_file))?;
    
    // Prompt is optional - we'll use default if not present
    let prompt_template = if prompt_file.exists() {
        std::fs::read_to_string(&prompt_file)
            .with_context(|| format!("Failed to read {:?}", prompt_file))?
    } else {
        default_contract_prompt()
    };
    
    // Load metadata if present
    let metadata = if bundle_file.exists() {
        load_bundle_metadata(&bundle_file)?
    } else {
        BundleMetadata::default()
    };
    
    // Extract bundle ID from directory name
    let id = bundle_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    let name = if metadata.name.is_empty() {
        id.clone()
    } else {
        metadata.name.clone()
    };
    
    Ok(Some(TemplateBundle {
        id,
        name,
        path: bundle_path.to_path_buf(),
        contract_content,
        prompt_template,
        metadata,
    }))
}

/// Load metadata from bundle.ncl
fn load_bundle_metadata(bundle_file: &Path) -> Result<BundleMetadata> {
    let content = std::fs::read_to_string(bundle_file)?;
    
    // Simple NCL parsing - extract key = value pairs
    let mut metadata = BundleMetadata::default();
    
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("language = ") {
            metadata.language = extract_string_value(line);
        } else if line.starts_with("framework = ") {
            metadata.framework = extract_string_value(line);
        } else if line.starts_with("description = ") {
            metadata.description = extract_string_value(line);
        } else if line.starts_with("name = ") {
            metadata.name = extract_string_value(line);
        } else if line.starts_with("keywords = ") {
            // Parse array like ["keyword1", "keyword2"]
            if let Some(start) = line.find('[') {
                if let Some(end) = line.find(']') {
                    let arr = &line[start+1..end];
                    metadata.keywords = arr.split(',')
                        .map(|s| extract_string_value(s.trim()))
                        .filter(|s| !s.is_empty())
                        .collect();
                }
            }
        }
    }
    
    Ok(metadata)
}

fn extract_string_value(line: &str) -> String {
    // Extract value from key = "value" or key = value
    if let Some(eq_pos) = line.find('=') {
        let value = line[eq_pos+1..].trim();
        // Remove quotes if present
        if value.starts_with('"') && value.ends_with('"') {
            return value[1..value.len()-1].to_string();
        }
        return value.to_string();
    }
    line.to_string()
}

/// Default prompt when prompt_contract.md is missing
fn default_contract_prompt() -> String {
    r#"# Task: Generate Nickel Spec from Markdown Using Contracts

You are a specification generator. Your task is to read a human-readable spec 
and generate a valid Nickel configuration that satisfies a given contract.

## Input Specification (Markdown)
```markdown
{{spec_content}}
```

## Target Contract (Nickel)
```nickel
{{contract_content}}
```

## Contract Explanation

The contract defines a record with:
- **Fields with `| Type`**: These are CONTRACTS - you MUST provide values of that type
- **Fields with `=`**: These are FIXED values - do NOT change them
- **`let ContractName = {...} in {}`**: Type definitions for nested structures

## Generation Rules

1. **Satisfy ALL contracts**: Every field marked with `| Type` must have a value
2. **Keep FIXED values**: Never change fields with `=` (like `template = "python-textual"`)
3. **Extract from spec**: All values must come from the markdown spec provided
4. **Use proper Nickel syntax**:
   - Strings: `"value"` (with quotes)
   - Numbers: `42` (no quotes)
   - Booleans: `true` or `false`
   - Arrays: `[item1, item2]`
   - Records: `{ field = value, ... }`

## Output

Output ONLY the complete Nickel record. No markdown code fences, no explanations.
The output must be valid Nickel syntax."#.to_string()
}

/// Select best template for a given spec
fn select_template_for_spec<'a>(spec_md: &str, bundles: &'a [TemplateBundle]) -> Option<&'a TemplateBundle> {
    if bundles.is_empty() {
        return None;
    }
    
    // Score each bundle based on keyword matching
    let spec_lower = spec_md.to_lowercase();
    let mut best_score = 0;
    let mut best_bundle = None;
    
    for bundle in bundles {
        let mut score = 0;
        
        // Match keywords
        for keyword in &bundle.metadata.keywords {
            if spec_lower.contains(&keyword.to_lowercase()) {
                score += 10;
            }
        }
        
        // Match framework name
        if !bundle.metadata.framework.is_empty() {
            if spec_lower.contains(&bundle.metadata.framework.to_lowercase()) {
                score += 20;
            }
        }
        
        // Match language
        if !bundle.metadata.language.is_empty() {
            if spec_lower.contains(&bundle.metadata.language.to_lowercase()) {
                score += 5;
            }
        }
        
        // Check for explicit template hint in spec
        let hint = format!("Template: {}", bundle.id);
        if spec_md.contains(&hint) || spec_md.contains(&format!("template: {}", bundle.id)) {
            score += 100; // Strong signal
        }
        
        if score > best_score {
            best_score = score;
            best_bundle = Some(bundle);
        }
    }
    
    best_bundle.or_else(|| bundles.first())
}

/// Full pipeline: spec.md → spec.ncl using contract-based generation
/// 
/// The LLM generates Nickel code that satisfies the contracts defined
/// in template_contract.ncl. Contracts define what's required (| Type)
/// vs what's fixed (= value).
pub async fn spec_md_to_ncl(
    spec_md: &str,
    bundles_dir: impl AsRef<Path>,
) -> Result<String> {
    let bundles_dir = bundles_dir.as_ref();
    
    // 1. Discover templates
    let bundles = discover_template_bundles(bundles_dir)?;
    if bundles.is_empty() {
        anyhow::bail!("No template bundles found in {:?}", bundles_dir);
    }
    
    // 2. Select best template
    let bundle = select_template_for_spec(spec_md, &bundles)
        .context("No suitable template found for spec")?;
    
    tracing::info!("Selected template bundle: {}", bundle.id);
    
    // 3. Build the prompt with spec + contract
    let prompt = bundle.prompt_template
        .replace("{{spec_content}}", spec_md)
        .replace("{{contract_content}}", &bundle.contract_content);
    
    // 4. Call LLM
    tracing::info!("Generating spec using contract-based approach...");
    let config = crate::llm::LlmConfig::default();
    let generated = call_llm_for_contract(&prompt, &config).await?;
    
    // 5. Validate the generated Nickel satisfies contracts
    validate_nickel_contract(&generated, bundle)?;
    
    tracing::info!("Successfully generated spec.ncl from spec.md");
    Ok(generated)
}

/// Call LLM to generate Nickel satisfying contracts
async fn call_llm_for_contract(prompt: &str, config: &crate::llm::LlmConfig) -> Result<String> {
    use reqwest::Client;
    use serde_json::json;
    
    let client = Client::new();
    let response = client
        .post(&format!("{}/chat/completions", config.api_base))
        .header("Authorization", format!("Bearer {}", config.api_key.as_deref().unwrap_or("")))
        .header("Content-Type", "application/json")
        .json(&json!({
            "model": config.model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are a specification generator. You read markdown specs and generate Nickel code that satisfies contracts. Output ONLY valid Nickel code. Never say you need files - the spec and contract are already provided in the user message."
                },
                {
                    "role": "user", 
                    "content": prompt
                }
            ],
            "temperature": 0.2,
            "max_tokens": config.max_tokens,
        }))
        .send()
        .await
        .context("Failed to call LLM API")?;
    
    if !response.status().is_success() {
        let error = response.text().await?;
        anyhow::bail!("LLM API error: {}", error);
    }
    
    let json: serde_json::Value = response.json().await?;
    let content = json["choices"][0]["message"]["content"]
        .as_str()
        .context("No content in LLM response")?;
    
    // Clean up: remove markdown fences if present
    let cleaned = content
        .trim_start_matches("```nickel")
        .trim_start_matches("```ncl")
        .trim_start_matches("```")
        .trim_end_matches("```")
        .trim();
    
    if cleaned.trim().is_empty() || cleaned.contains("awaiting input") || cleaned.contains("Missing input") {
        anyhow::bail!("LLM returned empty or placeholder spec");
    }
    
    Ok(cleaned.to_string())
}

/// Validate generated Nickel satisfies the contract requirements
fn validate_nickel_contract(generated: &str, bundle: &TemplateBundle) -> Result<()> {
    // Check for required top-level fields that must be present
    let required_fields = ["name", "template", "ui_config"];
    for field in &required_fields {
        let has_field = generated.contains(&format!("{} =", field)) 
            || generated.contains(&format!("{} |", field));
        if !has_field {
            anyhow::bail!(
                "Generated spec missing required field: {}. Check that the LLM properly extracted values from the spec.",
                field
            );
        }
    }
    
    // Check template field has correct value from contract
    let expected_template = &bundle.id;
    let has_correct_template = generated.contains(&format!("template = \"{}\"", expected_template));
    if !has_correct_template {
        // Try to extract what template value was used
        let template_line = generated.lines()
            .find(|l| l.contains("template = "));
        anyhow::bail!(
            "Generated spec has wrong template value. Expected: \"{}\". Found: {:?}. The contract specifies template must be \"{}\".",
            expected_template,
            template_line,
            expected_template
        );
    }
    
    // Check build_type is present
    let has_build_type = generated.contains("build_type = \"python\"") 
        || generated.contains("build_type = \"rust\"");
    if !has_build_type {
        anyhow::bail!(
            "Generated spec missing build_type. The contract requires build_type = \"python\" or \"rust\"."
        );
    }
    
    // Validate Nickel syntax (balanced braces)
    validate_nickel_syntax(generated)?;
    
    Ok(())
}

/// Validate basic Nickel syntax (balanced braces/brackets/parens)
fn validate_nickel_syntax(content: &str) -> Result<()> {
    let mut brace_count = 0i32;
    let mut bracket_count = 0i32;
    let mut paren_count = 0i32;
    let mut in_string = false;
    let mut escape_next = false;
    
    for ch in content.chars() {
        if escape_next {
            escape_next = false;
            continue;
        }
        
        if ch == '\\' && in_string {
            escape_next = true;
            continue;
        }
        
        if ch == '"' {
            in_string = !in_string;
            continue;
        }
        
        if !in_string {
            match ch {
                '{' => brace_count += 1,
                '}' => brace_count -= 1,
                '[' => bracket_count += 1,
                ']' => bracket_count -= 1,
                '(' => paren_count += 1,
                ')' => paren_count -= 1,
                _ => {}
            }
            
            if brace_count < 0 {
                anyhow::bail!("Invalid Nickel syntax: unbalanced braces (too many closing)");
            }
            if bracket_count < 0 {
                anyhow::bail!("Invalid Nickel syntax: unbalanced brackets (too many closing)");
            }
            if paren_count < 0 {
                anyhow::bail!("Invalid Nickel syntax: unbalanced parentheses (too many closing)");
            }
        }
    }
    
    if brace_count != 0 {
        anyhow::bail!("Invalid Nickel syntax: {} unclosed braces", brace_count.abs());
    }
    if bracket_count != 0 {
        anyhow::bail!("Invalid Nickel syntax: {} unclosed brackets", bracket_count.abs());
    }
    if paren_count != 0 {
        anyhow::bail!("Invalid Nickel syntax: {} unclosed parentheses", paren_count.abs());
    }
    
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_validate_nickel_syntax_valid() {
        let valid = r#"{ name = "App", widgets = [] }"#;
        assert!(validate_nickel_syntax(valid).is_ok());
    }
    
    #[test]
    fn test_validate_nickel_syntax_unbalanced() {
        let unbalanced = r#"{ name = "App", widgets = [ }"#;
        assert!(validate_nickel_syntax(unbalanced).is_err());
    }
    
    #[test]
    fn test_select_template_keyword_matching() {
        let bundle = TemplateBundle {
            id: "python-textual".to_string(),
            name: "Python Textual".to_string(),
            path: PathBuf::from("/fake"),
            contract_content: String::new(),
            prompt_template: String::new(),
            metadata: BundleMetadata {
                name: "python-textual".to_string(),
                language: "python".to_string(),
                framework: "textual".to_string(),
                description: String::new(),
                keywords: vec!["tui".to_string(), "terminal".to_string(), "cli".to_string()],
            },
        };
        
        let bundles = vec![bundle];
        let spec = "A terminal TUI app with text interface";
        let selected = select_template_for_spec(spec, &bundles);
        
        assert!(selected.is_some());
        assert_eq!(selected.unwrap().id, "python-textual");
    }
}
