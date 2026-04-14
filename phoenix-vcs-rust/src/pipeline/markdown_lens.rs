//! Markdown ↔ Spec Lens (4-Layer Stack)
//!
//! Bidirectional sync between markdown documentation and spec.ncl.
//! Example: README.md changes sync to spec description, overview sections sync back.

use std::collections::HashMap;
use std::sync::Arc;
use crate::pipeline::bundle_stack::*;

// ============================================================================
// Layer 1: Theory (ThMarkdown)
// ============================================================================

pub struct MarkdownTheory;

impl Theory for MarkdownTheory {
    fn name(&self) -> &str {
        "ThMarkdown"
    }
    
    fn sorts(&self) -> Vec<Sort> {
        vec![
            Sort {
                name: "Document".to_string(),
                kind: SortKind::Structural,
                description: "Complete markdown document".to_string(),
            },
            Sort {
                name: "Section".to_string(),
                kind: SortKind::Structural,
                description: "Heading + content block".to_string(),
            },
            Sort {
                name: "Heading".to_string(),
                kind: SortKind::Structural,
                description: "H1-H6 heading with text".to_string(),
            },
            Sort {
                name: "Content".to_string(),
                kind: SortKind::Structural,
                description: "Paragraphs, lists, code blocks".to_string(),
            },
            Sort {
                name: "CodeBlock".to_string(),
                kind: SortKind::Structural,
                description: "Fenced code with language".to_string(),
            },
            // Value sorts
            Sort {
                name: "Title".to_string(),
                kind: SortKind::Value { value_kind: "string".to_string() },
                description: "Document title (H1)".to_string(),
            },
            Sort {
                name: "Description".to_string(),
                kind: SortKind::Value { value_kind: "string".to_string() },
                description: "Overview/description text".to_string(),
            },
            Sort {
                name: "SectionName".to_string(),
                kind: SortKind::Value { value_kind: "string".to_string() },
                description: "Section identifier".to_string(),
            },
        ]
    }
    
    fn operations(&self) -> Vec<Operation> {
        vec![
            Operation {
                name: "mk_document".to_string(),
                inputs: vec![("sections".to_string(), "Section".to_string())],
                output: "Document".to_string(),
                description: "Create markdown document".to_string(),
            },
            Operation {
                name: "mk_section".to_string(),
                inputs: vec![
                    ("heading".to_string(), "Heading".to_string()),
                    ("content".to_string(), "Content".to_string()),
                ],
                output: "Section".to_string(),
                description: "Create section".to_string(),
            },
            Operation {
                name: "mk_heading".to_string(),
                inputs: vec![
                    ("level".to_string(), "Int".to_string()),
                    ("text".to_string(), "String".to_string()),
                ],
                output: "Heading".to_string(),
                description: "Create heading".to_string(),
            },
            Operation {
                name: "mk_codeblock".to_string(),
                inputs: vec![
                    ("language".to_string(), "String".to_string()),
                    ("code".to_string(), "String".to_string()),
                ],
                output: "CodeBlock".to_string(),
                description: "Create code block".to_string(),
            },
        ]
    }
    
    fn equations(&self) -> Vec<Equation> {
        vec![]
    }
}

// ============================================================================
// Layer 2: Schema (Document Graph)
// ============================================================================

pub struct MarkdownSchemaCompiler;

impl SchemaCompiler for MarkdownSchemaCompiler {
    fn compile(&self, _theory: &dyn Theory) -> Schema {
        Schema {
            vertices: vec![
                Vertex {
                    id: "title".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "description".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "overview".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "api".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "installation".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
            ],
            edges: vec![
                Edge {
                    from: "document".to_string(),
                    to: "title".to_string(),
                    kind: EdgeKind::Contains,
                    label: "has_title".to_string(),
                },
                Edge {
                    from: "document".to_string(),
                    to: "overview".to_string(),
                    kind: EdgeKind::Contains,
                    label: "has_overview".to_string(),
                },
            ],
            constraints: vec![
                Constraint {
                    name: "has_title".to_string(),
                    check: Arc::new(|schema| {
                        schema.vertices.iter().any(|v| v.id == "title")
                    }),
                },
            ],
        }
    }
}

// ============================================================================
// Layer 3: Lens (Bidirectional)
// ============================================================================

/// Extracts structured data from markdown
#[derive(Debug, Clone, Default)]
pub struct MarkdownData {
    pub title: Option<String>,
    pub description: Option<String>,
    pub sections: Vec<Section>,
    pub code_blocks: Vec<CodeBlock>,
}

#[derive(Debug, Clone)]
pub struct Section {
    pub level: u8,  // 1-6
    pub heading: String,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct CodeBlock {
    pub language: Option<String>,
    pub code: String,
}

/// Markdown sync lens
pub struct MarkdownLens;

impl MarkdownLens {
    /// Parse markdown into structured data
    pub fn parse(markdown: &str) -> MarkdownData {
        let mut data = MarkdownData::default();
        let mut current_section: Option<Section> = None;
        let mut in_code_block = false;
        let mut code_language = None;
        let mut code_content = String::new();
        
        for line in markdown.lines() {
            // Code block detection
            if line.starts_with("```") {
                if in_code_block {
                    // End of code block
                    data.code_blocks.push(CodeBlock {
                        language: code_language.clone(),
                        code: code_content.trim().to_string(),
                    });
                    in_code_block = false;
                    code_language = None;
                    code_content.clear();
                } else {
                    // Start of code block
                    in_code_block = true;
                    code_language = line.trim_start_matches("`").trim().split_whitespace().next().map(|s| s.to_string());
                }
                continue;
            }
            
            if in_code_block {
                code_content.push_str(line);
                code_content.push('\n');
                continue;
            }
            
            // Heading detection
            if line.starts_with("# ") && !in_code_block {
                // Save previous section
                if let Some(section) = current_section.take() {
                    data.sections.push(section);
                }
                
                let title = line.trim_start_matches("# ").trim().to_string();
                data.title = Some(title.clone());
                
                current_section = Some(Section {
                    level: 1,
                    heading: title,
                    content: String::new(),
                });
            } else if line.starts_with("## ") && !in_code_block {
                if let Some(section) = current_section.take() {
                    data.sections.push(section);
                }
                
                let heading = line.trim_start_matches("## ").trim().to_string();
                current_section = Some(Section {
                    level: 2,
                    heading: heading.clone(),
                    content: String::new(),
                });
                
                // Capture description from first H2 (usually "Overview" or similar)
                if data.description.is_none() {
                    data.description = Some(heading);
                }
            } else if line.starts_with("### ") && !in_code_block {
                if let Some(section) = current_section.take() {
                    data.sections.push(section);
                }
                
                let heading = line.trim_start_matches("### ").trim().to_string();
                current_section = Some(Section {
                    level: 3,
                    heading,
                    content: String::new(),
                });
            } else if let Some(ref mut section) = current_section {
                // Accumulate content
                if !line.trim().is_empty() || !section.content.is_empty() {
                    section.content.push_str(line);
                    section.content.push('\n');
                }
            }
        }
        
        // Don't forget the last section
        if let Some(section) = current_section {
            data.sections.push(section);
        }
        
        // Trim section content
        for section in &mut data.sections {
            section.content = section.content.trim().to_string();
        }
        
        data
    }
    
    /// Generate markdown from structured data
    pub fn generate(data: &MarkdownData) -> String {
        let mut output = String::new();
        
        // Title
        if let Some(title) = &data.title {
            output.push_str(&format!("# {}\n\n", title));
        }
        
        // Description/Overview section
        if let Some(desc) = &data.description {
            output.push_str(&format!("## Overview\n\n{}\n\n", desc));
        }
        
        // Other sections
        for section in &data.sections {
            if section.level == 1 {
                // Already output as title
                continue;
            }
            
            let prefix = match section.level {
                2 => "##",
                3 => "###",
                4 => "####",
                5 => "#####",
                6 => "######",
                _ => "##",
            };
            
            output.push_str(&format!("{} {}\n\n{}\n\n", prefix, section.heading, section.content));
        }
        
        // Code blocks at end (usually usage examples)
        for block in &data.code_blocks {
            if let Some(lang) = &block.language {
                output.push_str(&format!("```{lang}\n{}\n```\n\n", block.code));
            } else {
                output.push_str(&format!("```\n{}\n```\n\n", block.code));
            }
        }
        
        output
    }
    
    /// Extract spec-relevant values from markdown
    pub fn extract_spec_values(data: &MarkdownData) -> HashMap<String, String> {
        let mut values = HashMap::new();
        
        if let Some(title) = &data.title {
            values.insert("project_name".to_string(), title.clone());
        }
        
        if let Some(desc) = &data.description {
            values.insert("project_description".to_string(), desc.clone());
        }
        
        // Extract overview content as extended description
        for section in &data.sections {
            if section.heading.to_lowercase().contains("overview") {
                values.insert("overview".to_string(), section.content.clone());
            }
            if section.heading.to_lowercase().contains("api") {
                values.insert("api_docs".to_string(), section.content.clone());
            }
        }
        
        values
    }
}

impl SyncLens for MarkdownLens {
    fn id(&self) -> &str {
        "markdown:doc"
    }
    
    fn supported_fields(&self) -> &[&str] {
        &["title", "description", "overview", "api_docs"]
    }
    
    fn get(&self, code: &HashMap<String, String>) -> HashMap<String, String> {
        let mut values = HashMap::new();
        
        if let Some(readme) = code.get("README.md") {
            let data = MarkdownLens::parse(readme);
            values.extend(MarkdownLens::extract_spec_values(&data));
        }
        
        values
    }
    
    fn put(&self, code: &HashMap<String, String>, updates: &HashMap<String, String>) -> HashMap<String, String> {
        let mut updated = code.clone();
        
        if let Some(readme) = updated.get("README.md") {
            let mut data = MarkdownLens::parse(readme);
            
            // Apply updates
            if let Some(title) = updates.get("title") {
                data.title = Some(title.clone());
            }
            if let Some(desc) = updates.get("description") {
                data.description = Some(desc.clone());
            }
            
            // Regenerate markdown
            let new_readme = MarkdownLens::generate(&data);
            updated.insert("README.md".to_string(), new_readme);
        }
        
        updated
    }
    
    fn compare(&self, code: &HashMap<String, String>, spec_content: &str) -> Vec<Change> {
        let mut changes = Vec::new();
        
        let code_values = self.get(code);
        
        // Compare title
        if let Some(code_title) = code_values.get("project_name") {
            if let Some(spec_title) = extract_quoted_value(spec_content, "project_name = \"") {
                if code_title != &spec_title {
                    let desc = format!("README title differs from spec: \"{}\" → \"{}\"", spec_title, code_title);
                    changes.push(Change {
                        field: "project_name".to_string(),
                        old_value: spec_title,
                        new_value: code_title.clone(),
                        change_type: ChangeType::ValueChanged,
                        description: desc,
                    });
                }
            }
        }
        
        // Compare description
        if let Some(code_desc) = code_values.get("project_description") {
            if let Some(spec_desc) = extract_quoted_value(spec_content, "project_description = \"") {
                if code_desc != &spec_desc {
                    changes.push(Change {
                        field: "project_description".to_string(),
                        old_value: spec_desc,
                        new_value: code_desc.clone(),
                        change_type: ChangeType::ValueChanged,
                        description: "README description differs from spec".to_string(),
                    });
                }
            }
        }
        
        changes
    }
}

// Helper function
fn extract_quoted_value(content: &str, prefix: &str) -> Option<String> {
    for line in content.lines() {
        if let Some(pos) = line.find(prefix) {
            let after = &line[pos + prefix.len()..];
            if let Some(end) = after.find('"') {
                return Some(after[..end].to_string());
            }
        }
    }
    None
}

// ============================================================================
// Layer 4: Generator (Spec → Markdown)
// ============================================================================

pub struct MarkdownGenerator;

impl MarkdownGenerator {
    /// Generate README.md from spec.ncl content
    pub fn generate_readme(spec_content: &str, config: &BundleConfig) -> String {
        let mut data = MarkdownData::default();
        
        // Extract from spec
        data.title = Some(config.project_name.clone());
        data.description = config.project_description.clone();
        
        // Parse spec for additional sections
        if let Some(routes_section) = extract_spec_section(spec_content, "routes") {
            data.sections.push(Section {
                level: 2,
                heading: "API Routes".to_string(),
                content: format!("```nickel\n{}\n```", routes_section),
            });
        }
        
        if let Some(models_section) = extract_spec_section(spec_content, "models") {
            data.sections.push(Section {
                level: 2,
                heading: "Data Models".to_string(),
                content: format!("```nickel\n{}\n```", models_section),
            });
        }
        
        MarkdownLens::generate(&data)
    }
    
    /// Update spec.ncl from README changes
    pub fn apply_readme_to_spec(spec_content: &str, readme: &str) -> String {
        let data = MarkdownLens::parse(readme);
        let mut updated_spec = spec_content.to_string();
        
        // Update project_name if title changed
        if let Some(title) = data.title {
            updated_spec = update_field(&updated_spec, "project_name", &title);
        }
        
        // Update project_description
        if let Some(desc) = data.description {
            updated_spec = update_field(&updated_spec, "project_description", &desc);
        }
        
        updated_spec
    }
}

fn extract_spec_section(content: &str, section_name: &str) -> Option<String> {
    // Simple extraction: find "section_name = {" and extract until matching }
    let pattern = format!("{} = ", section_name);
    if let Some(start) = content.find(&pattern) {
        let after = &content[start..];
        // Find the opening brace
        if let Some(brace_start) = after.find('{') {
            let start_idx = start + brace_start;
            // Find matching closing brace (naive counting)
            let mut depth = 1;
            let mut end_idx = start_idx + 1;
            for (i, c) in content[start_idx + 1..].chars().enumerate() {
                match c {
                    '{' => depth += 1,
                    '}' => {
                        depth -= 1;
                        if depth == 0 {
                            end_idx = start_idx + 1 + i;
                            break;
                        }
                    }
                    _ => {}
                }
            }
            return Some(content[start_idx..=end_idx].to_string());
        }
    }
    None
}

fn update_field(content: &str, field: &str, value: &str) -> String {
    let pattern = format!(r#"{} = """#, field);
    if let Some(pos) = content.find(&pattern) {
        let value_start = pos + pattern.len();
        if let Some(end_pos) = content[value_start..].find('"') {
            let mut result = content[..value_start].to_string();
            result.push_str(value);
            result.push_str(&content[value_start + end_pos..]);
            return result;
        }
    }
    // Try with triple quotes
    let pattern3 = format!(r#"{} = \""""#, field);
    if let Some(pos) = content.find(&pattern3) {
        let value_start = pos + pattern3.len();
        if let Some(end_pos) = content[value_start..].find("\"\"") {
            let mut result = content[..value_start].to_string();
            result.push_str(value);
            result.push_str(&content[value_start + end_pos..]);
            return result;
        }
    }
    content.to_string()
}

/// Parse spec.ncl into BundleConfig
pub fn parse_spec_to_config(spec_content: &str) -> BundleConfig {
    let mut config = BundleConfig {
        project_name: "unknown".to_string(),
        version: "0.1.0".to_string(),
        project_description: None,
        theme: None,
        extra: HashMap::new(),
        raw_spec: spec_content.to_string(),
    };
    
    // Extract project_name
    if let Some(name) = extract_quoted_value(spec_content, "project_name = \"") {
        config.project_name = name;
    }
    
    // Extract project_description
    if let Some(desc) = extract_quoted_value(spec_content, "project_description = \"") {
        config.project_description = Some(desc);
    }
    
    // Extract version
    if let Some(ver) = extract_quoted_value(spec_content, "version = \"") {
        config.version = ver;
    }
    
    config
}

// ============================================================================
// Markdown Bundle (combines all 4 layers)
// ============================================================================

pub struct MarkdownBundle;

impl MarkdownBundle {
    pub fn new() -> Self {
        Self
    }
}

impl Bundle for MarkdownBundle {
    fn name(&self) -> &str {
        "markdown-doc"
    }
    
    fn aliases(&self) -> &[&str] {
        &["readme", "docs"]
    }
    
    fn theory(&self) -> &dyn Theory {
        &MARKDOWN_THEORY
    }
    
    fn schema_compiler(&self) -> &dyn SchemaCompiler {
        &MARKDOWN_SCHEMA_COMPILER
    }
    
    fn simple_lenses(&self) -> Vec<Box<dyn SyncLens>> {
        vec![
            Box::new(MarkdownLens),
        ]
    }
    
    fn code_generator(&self) -> &dyn CodeGenerator {
        &MARKDOWN_CODE_GENERATOR
    }
}

static MARKDOWN_THEORY: MarkdownTheory = MarkdownTheory;
static MARKDOWN_SCHEMA_COMPILER: MarkdownSchemaCompiler = MarkdownSchemaCompiler;
static MARKDOWN_CODE_GENERATOR: MarkdownCodeGenerator = MarkdownCodeGenerator;

struct MarkdownCodeGenerator;

impl CodeGenerator for MarkdownCodeGenerator {
    fn generate(&self, config: &BundleConfig) -> HashMap<std::path::PathBuf, String> {
        let mut files = HashMap::new();
        
        // Generate README.md from config
        let readme = MarkdownGenerator::generate_readme(&config.raw_spec, config);
        files.insert(std::path::PathBuf::from("README.md"), readme);
        
        files
    }
    
    fn output_files(&self) -> Vec<std::path::PathBuf> {
        vec![
            std::path::PathBuf::from("README.md"),
        ]
    }
    
    fn validate(&self, _config: &BundleConfig) -> Result<(), Vec<String>> {
        Ok(())
    }
}

// ============================================================================
// CLI Integration Helpers
// ============================================================================

/// Detect if this is a markdown sync scenario
pub fn should_use_markdown_lens(project_root: &std::path::Path) -> bool {
    let readme_path = project_root.join("README.md");
    readme_path.exists()
}

/// Sync README.md with spec.ncl
pub async fn sync_readme_with_spec(project_root: &std::path::Path, apply: bool) -> Result<(), Box<dyn std::error::Error>> {
    use tokio::fs;
    
    let readme_path = project_root.join("README.md");
    let spec_path = project_root.join("spec.ncl");
    
    if !readme_path.exists() || !spec_path.exists() {
        return Ok(());
    }
    
    let readme_content = fs::read_to_string(&readme_path).await?;
    let spec_content = fs::read_to_string(&spec_path).await?;
    
    let mut code = HashMap::new();
    code.insert("README.md".to_string(), readme_content);
    
    let lens = MarkdownLens;
    let changes = lens.compare(&code, &spec_content);
    
    if changes.is_empty() {
        println!("✅ README.md is in sync with spec.ncl");
        return Ok(());
    }
    
    println!("📝 Changes detected between README.md and spec.ncl:");
    for change in &changes {
        println!("   {}: \"{}\" → \"{}\"", change.field, change.old_value, change.new_value);
    }
    
    if apply {
        println!("\n📝 Applying changes to spec.ncl...");
        let updated_spec = MarkdownGenerator::apply_readme_to_spec(&spec_content, &code["README.md"]);
        fs::write(&spec_path, updated_spec).await?;
        println!("✅ Updated spec.ncl from README.md");
    } else {
        println!("\n💡 Run with --apply to update spec.ncl from README.md");
    }
    
    Ok(())
}
