//! Spec.md → Template → Spec.ncl Pipeline
//!
//! Human-readable specs → LLM-filled templates → Machine-readable specs

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use anyhow::{Result, Context};

/// A template bundle containing template.ncl and prompt.md
#[derive(Debug, Clone)]
pub struct TemplateBundle {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub template_content: String,
    pub prompt_template: String,
    pub metadata: BundleMetadata,
}

/// Bundle metadata from bundle.ncl or bundle.toml
#[derive(Debug, Clone, Default)]
pub struct BundleMetadata {
    pub language: String,
    pub framework: String,
    pub description: String,
    pub keywords: Vec<String>, // For matching specs to templates
}

/// Slot in a template that needs to be filled
#[derive(Debug, Clone)]
pub struct TemplateSlot {
    pub name: String,
    pub description: String,
    pub slot_type: SlotType,
    pub required: bool,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone)]
pub enum SlotType {
    String,
    Number,
    Bool,
    Array,      // Nickel array
    Record,     // Nickel record
    WidgetTree, // Special: array of widgets
    KeyBindings, // Special: array of key bindings
    Styles,     // Special: CSS/styles record
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
    let template_file = bundle_path.join("template.ncl");
    let prompt_file = bundle_path.join("prompt.md");
    let bundle_file = bundle_path.join("bundle.ncl");
    
    // Must have template.ncl
    if !template_file.exists() {
        return Ok(None);
    }
    
    let template_content = std::fs::read_to_string(&template_file)
        .with_context(|| format!("Failed to read {:?}", template_file))?;
    
    // Prompt is optional - we'll use default if not present
    let prompt_template = if prompt_file.exists() {
        std::fs::read_to_string(&prompt_file)
            .with_context(|| format!("Failed to read {:?}", prompt_file))?
    } else {
        default_prompt_template()
    };
    
    // Load metadata if present
    let metadata = if bundle_file.exists() {
        load_bundle_metadata(&bundle_file)?
    } else {
        BundleMetadata {
            language: "unknown".to_string(),
            framework: "unknown".to_string(),
            description: bundle_path.file_name()
                .and_then(|n| n.to_str())
                .unwrap_or("unknown")
                .to_string(),
            keywords: vec![],
        }
    };
    
    let id = bundle_path.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();
    
    Ok(Some(TemplateBundle {
        id: id.clone(),
        name: id.clone(),
        path: bundle_path.to_path_buf(),
        template_content,
        prompt_template,
        metadata,
    }))
}

/// Load bundle metadata from bundle.ncl
fn load_bundle_metadata(bundle_file: &Path) -> Result<BundleMetadata> {
    // For now, parse simple metadata from bundle.ncl
    // In future, use proper Nickel evaluation
    let content = std::fs::read_to_string(bundle_file)?;
    
    let mut metadata = BundleMetadata::default();
    
    // Simple extraction: look for field = "value" patterns
    for line in content.lines() {
        let line = line.trim();
        if line.starts_with("language") && line.contains('=') {
            metadata.language = extract_string_value(line).unwrap_or_else(|| "unknown".to_string());
        } else if line.starts_with("framework") && line.contains('=') {
            metadata.framework = extract_string_value(line).unwrap_or_else(|| "unknown".to_string());
        } else if line.starts_with("description") && line.contains('=') {
            metadata.description = extract_string_value(line).unwrap_or_else(|| "".to_string());
        }
    }
    
    Ok(metadata)
}

fn extract_string_value(line: &str) -> Option<String> {
    // Extract "value" from field = "value" or field = value
    let parts: Vec<&str> = line.split('=').collect();
    if parts.len() >= 2 {
        let value = parts[1].trim()
            .trim_matches(',')
            .trim()
            .trim_matches('"');
        Some(value.to_string())
    } else {
        None
    }
}

/// Default prompt template when bundle doesn't provide one
fn default_prompt_template() -> String {
    r#"# Task: Fill Template from Spec

You are a specification translator. Your job is to read a human-readable spec 
and fill in a Nickel template to produce a machine-readable specification.

## Input

### Spec (Human Language)
```markdown
{{spec_content}}
```

### Template (With Slots)
```nickel
{{template_content}}
```

## Instructions

1. Read the spec carefully and identify:
   - App name and description
   - UI components needed (header, sidebar, list, log, etc.)
   - Layout structure (grid, vertical, horizontal)
   - Key bindings and actions
   - Data/state management needs
   - Styling preferences

2. Fill in each {{slot}} in the template with valid Nickel syntax.
   Replace all {{placeholders}} with concrete values.

3. Output ONLY valid Nickel code. No markdown fences, no explanations.

4. Ensure the output is syntactically valid Nickel.

## Output

Produce the filled template as valid Nickel code:"#.to_string()
}

/// Extract slots from template content
pub fn extract_slots(template_content: &str) -> Vec<TemplateSlot> {
    let mut slots = Vec::new();
    let mut seen = std::collections::HashSet::new();
    
    // Look for {{slot_name}} or {{slot_name:description}} patterns
    // Also look for # SLOT: name - description comments
    
    // Pattern 1: {{slot_name}}
    for line in template_content.lines() {
        // Check for SLOT comment
        if line.trim().starts_with("# SLOT:") {
            if let Some(slot) = parse_slot_comment(line) {
                if seen.insert(slot.name.clone()) {
                    slots.push(slot);
                }
            }
        }
        
        // Check for {{slot}} in content
        if line.contains("{{") && line.contains("}}") {
            if let Some(slot) = parse_bracket_slot(line) {
                if seen.insert(slot.name.clone()) {
                    slots.push(slot);
                }
            }
        }
    }
    
    slots
}

fn parse_slot_comment(line: &str) -> Option<TemplateSlot> {
    // Parse: # SLOT: name - Description (type)
    let line = line.trim().trim_start_matches("# SLOT:").trim();
    
    let parts: Vec<&str> = line.split("-").collect();
    let name = parts.get(0)?.trim().to_string();
    let description = parts.get(1).map(|s| s.trim().to_string()).unwrap_or_default();
    
    // Infer type from name or description
    let slot_type = infer_slot_type(&name, &description);
    
    Some(TemplateSlot {
        name,
        description,
        slot_type,
        required: true,
        default_value: None,
    })
}

fn parse_bracket_slot(line: &str) -> Option<TemplateSlot> {
    // Extract slot name from {{slot_name}} or {{slot_name:hint}}
    let start = line.find("{{")? + 2;
    let end = line.find("}}")?;
    let content = &line[start..end];
    
    let name = if content.contains(':') {
        content.split(':').next()?.trim().to_string()
    } else {
        content.trim().to_string()
    };
    
    if name.is_empty() || name == "spec_content" || name == "template_content" {
        return None; // Skip template variables
    }
    
    let slot_type = infer_slot_type(&name, "");
    
    Some(TemplateSlot {
        name,
        description: format!("Inferred from template"),
        slot_type,
        required: true,
        default_value: None,
    })
}

fn infer_slot_type(name: &str, description: &str) -> SlotType {
    let combined = format!("{} {}", name, description).to_lowercase();
    
    if combined.contains("widget") || combined.contains("children") {
        SlotType::WidgetTree
    } else if combined.contains("key") || combined.contains("binding") || combined.contains("shortcut") {
        SlotType::KeyBindings
    } else if combined.contains("style") || combined.contains("css") || combined.contains("color") {
        SlotType::Styles
    } else if combined.contains("model") || combined.contains("state") || combined.contains("config") {
        SlotType::Record
    } else if combined.contains("list") || combined.contains("array") || combined.contains("items") {
        SlotType::Array
    } else if combined.contains("number") || combined.contains("count") || combined.contains("size") {
        SlotType::Number
    } else if combined.contains("bool") || combined.contains("enable") || combined.contains("show") {
        SlotType::Bool
    } else {
        SlotType::String
    }
}

/// Select best template bundle for a spec.md
pub fn select_template_for_spec<'a>(spec_md: &str, bundles: &'a [TemplateBundle]) -> Option<&'a TemplateBundle> {
    // Look for explicit template hint
    let hint = extract_template_hint(spec_md);
    if let Some(ref hint_id) = hint {
        if let Some(bundle) = bundles.iter().find(|b| b.id == *hint_id) {
            return Some(bundle);
        }
    }
    
    // Score each bundle based on keyword matching
    let spec_lower = spec_md.to_lowercase();
    
    let mut scored: Vec<(f32, &TemplateBundle)> = bundles.iter()
        .map(|bundle| {
            let mut score = 0.0;
            
            // Keyword matching
            for keyword in &bundle.metadata.keywords {
                if spec_lower.contains(&keyword.to_lowercase()) {
                    score += 1.0;
                }
            }
            
            // Framework mentions
            if spec_lower.contains(&bundle.metadata.framework.to_lowercase()) {
                score += 2.0;
            }
            
            // Language mentions
            if spec_lower.contains(&bundle.metadata.language.to_lowercase()) {
                score += 1.5;
            }
            
            (score, bundle)
        })
        .collect();
    
    // Sort by score
    scored.sort_by(|a, b| b.0.partial_cmp(&a.0).unwrap());
    
    // Return best if score > 0
    scored.into_iter().next().filter(|(score, _)| *score > 0.0).map(|(_, b)| b)
}

fn extract_template_hint(spec_md: &str) -> Option<String> {
    // Look for "template: bundle-id" or "uses: bundle-id"
    for line in spec_md.lines() {
        let line_lower = line.to_lowercase();
        if line_lower.contains("template:") || line_lower.contains("uses:") {
            let parts: Vec<&str> = line.splitn(2, ':').collect();
            if parts.len() >= 2 {
                let value = parts[1].trim();
                // Extract first "word" which may be quoted/backticked
                // Split on whitespace and take first token
                let first_token = value.split_whitespace().next().unwrap_or(value);
                // Remove backticks and quotes from both sides
                let cleaned = first_token
                    .trim_start_matches('`')
                    .trim_end_matches('`')
                    .trim_start_matches('"')
                    .trim_end_matches('"')
                    .trim_start_matches('\'')
                    .trim_end_matches('\'');
                return Some(cleaned.to_string());
            }
        }
    }
    None
}

/// Build LLM prompt from spec + template
pub fn build_llm_prompt(spec_md: &str, bundle: &TemplateBundle) -> String {
    bundle.prompt_template
        .replace("{{spec_content}}", spec_md)
        .replace("{{template_content}}", &bundle.template_content)
}

/// Validate that filled content is valid Nickel
pub fn validate_filled_spec(content: &str) -> Result<()> {
    // Basic validation: check for balanced braces, brackets, and parens
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
                anyhow::bail!("Unbalanced braces: too many closing braces");
            }
            if bracket_count < 0 {
                anyhow::bail!("Unbalanced brackets: too many closing brackets");
            }
            if paren_count < 0 {
                anyhow::bail!("Unbalanced parentheses: too many closing parentheses");
            }
        }
    }
    
    if brace_count != 0 {
        anyhow::bail!("Unbalanced braces: {} unclosed", brace_count);
    }
    if bracket_count != 0 {
        anyhow::bail!("Unbalanced brackets: {} unclosed", bracket_count);
    }
    if paren_count != 0 {
        anyhow::bail!("Unbalanced parentheses: {} unclosed", paren_count);
    }
    
    // Check for remaining {{slots}} that weren't filled
    if content.contains("{{") && content.contains("}}") {
        anyhow::bail!("Template still contains unfilled slots: {{...}}");
    }
    
    Ok(())
}

/// Full pipeline: spec.md → spec.ncl
pub async fn spec_md_to_ncl(
    spec_md: &str,
    bundles_dir: impl AsRef<Path>,
) -> Result<String> {
    // 1. Discover templates
    let bundles = discover_template_bundles(bundles_dir)?;
    
    if bundles.is_empty() {
        anyhow::bail!("No template bundles found");
    }
    
    // 2. Select best template
    let bundle = select_template_for_spec(spec_md, &bundles)
        .context("No suitable template found for spec")?;
    
    tracing::info!("Selected template bundle: {}", bundle.id);
    
    // 3. Build prompt
    let prompt = build_llm_prompt(spec_md, bundle);
    
    // 4. Call LLM using existing infrastructure
    tracing::info!("Calling LLM to fill template...");
    let config = crate::llm::LlmConfig::default();
    let filled = fill_template_with_llm(&prompt, &config).await?;
    
    // 5. Validate result
    validate_filled_spec(&filled)?;
    
    tracing::info!("Successfully generated spec.ncl from spec.md");
    
    Ok(filled)
}

/// Fill template using existing LLM infrastructure
async fn fill_template_with_llm(prompt: &str, config: &crate::llm::LlmConfig) -> Result<String> {
    // Reuse the existing LLM infrastructure with a spec-filling request
    let request = crate::llm::CodeGenRequest {
        requirements: vec![prompt.to_string()],
        language: "nickel".to_string(),
        module_name: "spec".to_string(),
        iu_id: "spec_md_conversion".to_string(),
        context: None,
        module_apis: None,
    };
    
    // Use existing generate_code_with_llm with a template-filling system prompt
    let system_prompt = r#"You are a specification translator. 
TASK: Read the spec.md and template.ncl provided, then output FILLED Nickel code.
RULES:
1. Replace every {{slot}} with a real value from the spec
2. Output ONLY the filled Nickel record - no markdown, no explanation
3. MUST include: name, template, build_type, ui_config
4. Example output format:
{
  name = "MyApp",
  template = "python-textual",
  build_type = "python",
  ui_config = {
    theme = "dark",
    layout = { type = "vertical", widgets = [{...}] }
  }
}
NOW FILL THIS TEMPLATE:"#;
    
    let filled = crate::llm::generate_code_with_llm(&request, config, Some(system_prompt)).await?;
    
    // Validate it's not empty or placeholder
    if filled.trim().is_empty() || filled.contains("awaiting input") {
        anyhow::bail!("LLM returned empty or placeholder spec");
    }
    
    Ok(filled)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    
    #[test]
    fn test_extract_slots() {
        let template = r#"
{
  # SLOT: app_name - The application name
  name = "{{app_name}}",
  
  # SLOT: theme - UI theme
  theme = "{{theme}}",
  
  widgets = {{widgets}},
}
"#;
        
        let slots = extract_slots(template);
        assert!(slots.iter().any(|s| s.name == "app_name"));
        assert!(slots.iter().any(|s| s.name == "theme"));
        assert!(slots.iter().any(|s| s.name == "widgets"));
    }
    
    #[test]
    fn test_validate_filled_spec() {
        let valid = r#"{ name = "App", widgets = [] }"#;
        assert!(validate_filled_spec(valid).is_ok());
        
        let unbalanced = r#"{ name = "App", widgets = [ }"#;
        assert!(validate_filled_spec(unbalanced).is_err());
        
        let unfilled = r#"{ name = "{{app_name}}" }"#;
        assert!(validate_filled_spec(unfilled).is_err());
    }
    
    #[test]
    fn test_select_template_explicit_hint() {
        let bundles = vec![
            TemplateBundle {
                id: "python-textual".to_string(),
                name: "Python Textual".to_string(),
                path: PathBuf::from("/tmp/1"),
                template_content: "{}".to_string(),
                prompt_template: "prompt".to_string(),
                metadata: BundleMetadata::default(),
            },
        ];
        
        let spec = "# MyApp\n\nTemplate: python-textual\n\nA TUI app";
        let selected = select_template_for_spec(spec, &bundles);
        
        assert!(selected.is_some());
        assert_eq!(selected.unwrap().id, "python-textual");
    }
    
    #[test]
    fn test_extract_template_hint() {
        assert_eq!(
            extract_template_hint("Template: python-textual"),
            Some("python-textual".to_string())
        );
        assert_eq!(
            extract_template_hint("Uses: `rust-cli` for the app"),
            Some("rust-cli".to_string())
        );
        assert_eq!(
            extract_template_hint("Just a spec without hint"),
            None
        );
    }
}
