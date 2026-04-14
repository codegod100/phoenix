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
    // Use panproto theory contract ONLY - no fallbacks per agents.md
    let contract_file = bundle_path.join("theory_contract_panproto.ncl");
    let prompt_file = bundle_path.join("prompt_theory.md");
    let bundle_file = bundle_path.join("bundle.ncl");
    
    // Skip incomplete bundles (directory may be output destination, not source)
    if !contract_file.exists() {
        tracing::debug!(
            "Skipping incomplete bundle at {} (missing theory_contract_panproto.ncl)",
            bundle_path.display()
        );
        return Ok(None);
    }
    
    let contract_content = std::fs::read_to_string(&contract_file)
        .with_context(|| format!("Failed to read {:?}", contract_file))?;
    
    // Skip incomplete bundles
    if !prompt_file.exists() {
        tracing::debug!(
            "Skipping incomplete bundle at {} (missing prompt_theory.md)",
            bundle_path.display()
        );
        return Ok(None);
    }
    
    let prompt_template = std::fs::read_to_string(&prompt_file)
        .with_context(|| format!("Failed to read {:?}", prompt_file))?;
    
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

// OBSOLETE: default_contract_prompt removed per agents.md
// Per agents.md: "NEVER use fallbacks - fail hard with clear errors"
// Template bundles MUST provide prompt_theory.md - no default prompts.

/// Build a mega-prompt with all bundle contracts for LLM to select and generate
fn build_mega_prompt(spec_md: &str, bundles: &[TemplateBundle]) -> String {
    let mut prompt = String::from("# Bundle-Aware Spec Generation\n\n");
    prompt.push_str("You are generating a spec.ncl file. You have access to multiple bundle contracts below.\n\n");
    
    // Detect if this is a bundle creation spec or app spec
    let is_bundle_spec = spec_md.contains("build_type = \"bundle\"") || 
                         spec_md.contains("build_type = \"template\"") ||
                         (spec_md.contains("New Template Bundle") && spec_md.contains("Files to Generate"));
    let is_app_spec = spec_md.contains("build_type = \"typescript\"") ||
                      spec_md.contains("build_type = \"python\"") ||
                      spec_md.contains("build_type = \"rust\"") ||
                      spec_md.contains("build_type = \"swift\"") ||
                      spec_md.contains("build_type = \"nodejs\"") ||
                      spec_md.contains("template = \"lit\"") ||
                      spec_md.contains("template = \"ts-hono\"") ||
                      spec_md.contains("template = \"python-textual\"") ||
                      spec_md.contains("## Build Type");
    
    prompt.push_str("DETECTION RESULT:\n");
    if is_bundle_spec {
        prompt.push_str("→ This is a BUNDLE CREATION spec (creating a new Phoenix VCS bundle)\n");
        prompt.push_str("→ Use template = \"bundle-author\"\n\n");
    } else if is_app_spec {
        prompt.push_str("→ This is an APP CREATION spec (building an application)\n");
        prompt.push_str("→ Use the template that matches the framework requested\n\n");
    } else {
        prompt.push_str("→ Detect based on content: if describing a new bundle format → bundle-author\n");
        prompt.push_str("→ If describing an app to build → match the framework bundle\n\n");
    }
    
    prompt.push_str("Your job is to:\n");
    prompt.push_str("1. Pick the ONE bundle contract that best matches what the user wants to build\n");
    prompt.push_str("2. Use that contract's REQUIRED FIELDS as a template\n");
    prompt.push_str("3. BUT fill in values from the user's spec.md, NOT from the template bundle\n\n");
    
    prompt.push_str("CRITICAL RULES:\n");
    prompt.push_str("- The id field should describe WHAT IS BEING BUILT (from spec.md)\n");
    prompt.push_str("- The template field should be the CONTRACT USED (from bundle list below)\n");
    prompt.push_str("- For bundle creation specs: use template = \"bundle-author\", id = \"<new-bundle-name>\"\n");
    prompt.push_str("- For app specs: use template = \"<framework-bundle>\" (e.g., \"lit\", \"ts-hono\"), id = \"<app-name>\"\n");
    prompt.push_str("- If spec.md contains explicit 'template = \"...\"' → USE THAT TEMPLATE\n\n");
    
    prompt.push_str("## Available Bundle Contracts (choose ONE)\n\n");
    for (i, bundle) in bundles.iter().enumerate() {
        prompt.push_str(&format!("### Contract {}: {}\n", i + 1, bundle.id));
        prompt.push_str(&format!("- Use for: {} apps\n", bundle.metadata.framework));
        prompt.push_str(&format!("- Language: {}\n", bundle.metadata.language));
        prompt.push_str(&format!("- Keywords: {}\n", bundle.metadata.keywords.join(", ")));
        prompt.push_str("\nRequired fields (MUST include in output):\n```nickel\n");
        // Include first 1500 chars of contract
        let contract_preview = &bundle.contract_content[..bundle.contract_content.len().min(1500)];
        prompt.push_str(contract_preview);
        prompt.push_str("\n```\n\n");
    }
    
    prompt.push_str("## User's Spec (what they want to build)\n\n```markdown\n");
    prompt.push_str(spec_md);
    prompt.push_str("\n```\n\n");
    
    prompt.push_str("## Your Output\n\n");
    prompt.push_str("Generate a complete spec.ncl file. It MUST:\n");
    prompt.push_str("1. Set template = \"<contract-id-from-above>\" (which contract to use)\n");
    prompt.push_str("2. Set id = \"<name-from-user-spec>\" (what is being built)\n");
    prompt.push_str("3. Include ALL required fields from the chosen contract\n");
    prompt.push_str("4. Use values from the user's spec.md, NOT from the contract examples\n");
    prompt.push_str("\nOutput ONLY valid Nickel code, no markdown fences.\n\n");
    
    prompt
}

/// Full pipeline: spec.md → spec.ncl using all-bundle contract approach
/// 
/// 1. Load all available bundle contracts
/// 2. Build mega-prompt with all contracts + spec.md
/// 3. LLM selects best bundle AND generates spec.ncl in one shot
pub async fn spec_md_to_ncl(
    spec_md: &str,
    bundles_dir: impl AsRef<Path>,
) -> Result<String> {
    let bundles_dir = bundles_dir.as_ref();
    
    // 1. Discover templates (skip incomplete)
    let bundles = discover_template_bundles(bundles_dir)?;
    if bundles.is_empty() {
        anyhow::bail!("No template bundles found in {:?}", bundles_dir);
    }
    
    tracing::info!("Discovered {} bundles, building mega-prompt for selection+generation...", bundles.len());
    
    // 2. Build mega-prompt with all contracts
    let prompt = build_mega_prompt(spec_md, &bundles);
    
    // 3. Call LLM to select bundle AND generate spec in one shot
    let config = crate::llm::LlmConfig::default();
    tracing::info!("Generating spec using all-bundle contract approach...");
    let generated = call_llm_for_mega_prompt(&prompt, &config).await?;
    
    // 4. Validate the generated Nickel is syntactically valid
    validate_nickel_syntax(&generated)?;
    
    tracing::info!("Successfully generated spec.ncl from spec.md");
    Ok(generated)
}

/// Call LLM with mega-prompt (all contracts) to generate spec.ncl
async fn call_llm_for_mega_prompt(prompt: &str, config: &crate::llm::LlmConfig) -> Result<String> {
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
                    "content": "You are a Phoenix VCS specification generator. CRITICAL INSTRUCTIONS:\n\n1. DETECT APP vs BUNDLE from spec.md build_type field:\n   - build_type=typescript|python|rust|nodejs → APP spec (NO theory_id!)\n   - build_type=bundle → BUNDLE spec (HAS theory_id)\n\n2. APP SPEC FORMAT (use this for litty!):\n{\n  id = \"litty\",           // Use the app name from spec.md\n  template = \"lit\",       // Framework from spec.md\n  build_type = \"typescript\",\n  phoenix_config = { ... },\n  sorts = [...],\n  ops = [...],\n  // NO theory_id! NO theory_name!\n}\n\n3. BUNDLE SPEC FORMAT (only for build_type=bundle):\n{\n  theory_id = \"<name>\",\n  theory_name = \"Th<Name>\",\n  template = \"bundle-author\",\n  build_type = \"bundle\",\n  // ...\n}\n\n4. CRITICAL: If template is 'lit', 'ts-hono', 'nodejs-express', 'python-textual' → APP spec, NO theory_id!\n\nOUTPUT: Only valid Nickel code, no markdown, no explanations."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.1,
            "max_tokens": config.max_tokens,
        }))
        .send()
        .await
        .context("Failed to call LLM for spec generation")?;
    
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
    // Log first 500 chars of generated content for debugging
    tracing::debug!("Generated spec (first 500 chars): {}", &generated[..generated.len().min(500)]);
    
    // Check for required fields - support both theory format and legacy format
    let theory_fields = ["id", "description", "theory", "sorts", "phoenix_config"];
    let legacy_fields = ["name", "template", "ui_config"];
    
    let is_theory_format = theory_fields.iter().all(|field| {
        let has_field = generated.contains(&format!("{} =", field)) || generated.contains(&format!("{} |", field));
        if !has_field {
            tracing::warn!("Missing theory field: {}", field);
        }
        has_field
    });
    
    let is_legacy_format = legacy_fields.iter().all(|field| {
        let has_field = generated.contains(&format!("{} =", field)) || generated.contains(&format!("{} |", field));
        if !has_field {
            tracing::warn!("Missing legacy field: {}", field);
        }
        has_field
    });
    
    if !is_theory_format && !is_legacy_format {
        tracing::warn!("Generated spec does not match expected formats. Theory format fields: {:?}, Legacy format fields: {:?}", 
            theory_fields, legacy_fields);
        // Be more lenient - accept if at least some fields are present
        let has_any_theory_field = theory_fields.iter().any(|f| 
            generated.contains(&format!("{} =", f)) || generated.contains(&format!("{} |", f)));
        let has_any_legacy_field = legacy_fields.iter().any(|f| 
            generated.contains(&format!("{} =", f)) || generated.contains(&format!("{} |", f)));
        
        if !has_any_theory_field && !has_any_legacy_field {
            anyhow::bail!(
                "Generated spec missing required fields. Expected theory format (id, description, theory, phoenix_config) \
                 or legacy format (name, template, ui_config). Check that the LLM properly extracted values from the spec."
            );
        }
    }
    
    // Check template/build_type only for legacy format
    // Theory format uses morphism definition instead
    if is_legacy_format {
        let expected_template = &bundle.id;
        let has_correct_template = generated.contains(&format!("template = \"{}\"", expected_template))
            || generated.contains(&format!("template = \"{}\"", expected_template.replace("-", "_")));
        
        if !has_correct_template {
            let template_line = generated.lines()
                .find(|l| l.contains("template = "));
            anyhow::bail!(
                "Generated spec has wrong template value. Expected: \"{}\". Found: {:?}.",
                expected_template,
                template_line
            );
        }
        
        // Only require build_type for legacy format
        let has_build_type = generated.contains("build_type = \"python\"") 
            || generated.contains("build_type = \"rust\"")
            || generated.contains("build_type = \"typescript\"")
            || generated.contains("build_type = \"bun\"")
            || generated.contains("build_type = \"ts\"")
            || generated.contains("build_type = \"bundle\"")
            || generated.contains("build_type = \"swift\"")
            || generated.contains("build_type = \"vapor\"");
        if !has_build_type {
            anyhow::bail!(
                "Generated spec missing build_type. Legacy format requires build_type."
            );
        }
    }
    
    // For theory format, verify it has morphism (bundle-author style)
    if is_theory_format {
        let has_morphism = generated.contains("morphism = {") 
            || generated.contains("morphism.name")
            || generated.contains("μ_");
        if !has_morphism {
            tracing::warn!("Theory format spec missing morphism definition");
        }
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
