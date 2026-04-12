//! Reverse Pipeline — Generate Specs from Code
//!
//! Implements the inverse of the normal pipeline:
//!   CODE ──[μ_reverse]──► IU ──[μ_deplan]──► CANON ──[μ_decanon]──► CLAUSE ──[μ_uningest]──► SPEC
//!
//! This enables:
//! - Retrofitting Phoenix onto existing projects
//! - Creating initial specs from working code
//! - Reverse-engineering legacy systems
//! - Bootstrapping specs when only code exists

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use anyhow::Result;
use serde::{Serialize, Deserialize};
use walkdir::WalkDir;
use regex::Regex;

/// Options for reverse engineering
#[derive(Debug, Clone)]
pub struct ReverseOptions {
    /// Source language to parse
    pub source_language: String,
    /// Output spec directory
    pub output_dir: PathBuf,
    /// Whether to include private functions
    pub include_private: bool,
    /// Whether to extract doc comments as requirement text
    pub extract_docs: bool,
    /// Minimum function size (lines) to include as requirement
    pub min_function_lines: usize,
}

impl Default for ReverseOptions {
    fn default() -> Self {
        Self {
            source_language: "rust".to_string(),
            output_dir: PathBuf::from("specs"),
            include_private: false,
            extract_docs: true,
            min_function_lines: 3,
        }
    }
}

/// Reverse pipeline result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReverseResult {
    pub files_scanned: usize,
    pub functions_extracted: usize,
    pub modules_identified: usize,
    pub requirements_generated: usize,
    pub spec_files_created: Vec<String>,
}

/// Extracted function/module information
#[derive(Debug, Clone)]
struct ExtractedItem {
    name: String,
    kind: ItemKind,
    docs: Vec<String>,
    file_path: PathBuf,
    line_start: usize,
    line_end: usize,
    is_public: bool,
    parameters: Vec<String>,
    return_type: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum ItemKind {
    Function,
    Module,
    Struct,
    Enum,
    Trait,
    Impl,
}

/// Run the reverse pipeline
pub async fn reverse_pipeline(
    project_root: impl AsRef<Path>,
    options: &ReverseOptions,
) -> Result<ReverseResult> {
    let project_root = project_root.as_ref();
    let src_dir = project_root.join("src");
    
    if !src_dir.exists() {
        anyhow::bail!("No src/ directory found. Expected code at {:?}", src_dir);
    }
    
    // Phase 1: Extract code elements
    println!("▶ Phase 1: μ_reverse (Code → IU)");
    let items = extract_code_items(&src_dir, options).await?;
    println!("   ✓ Extracted {} items", items.len());
    
    // Phase 2: Group into logical modules
    println!("\n▶ Phase 2: μ_deplan (IU → Canon)");
    let groups = group_into_domains(&items);
    println!("   ✓ Grouped into {} domains", groups.len());
    
    // Phase 3: Generate clauses
    println!("\n▶ Phase 3: μ_decanon (Canon → Clause)");
    let clauses = generate_clauses(&groups, options);
    println!("   ✓ Generated {} clauses", clauses.len());
    
    // Phase 4: Write specs
    println!("\n▶ Phase 4: μ_uningest (Clause → Spec)");
    let spec_files = write_spec_files(&clauses, &options.output_dir).await?;
    println!("   ✓ Created {} spec files", spec_files.len());
    
    // Count functions and modules
    let functions = items.iter().filter(|i| i.kind == ItemKind::Function).count();
    let modules = groups.len();
    
    Ok(ReverseResult {
        files_scanned: count_source_files(&src_dir, &options.source_language).await?,
        functions_extracted: functions,
        modules_identified: modules,
        requirements_generated: clauses.len(),
        spec_files_created: spec_files,
    })
}

/// Extract code items from source files
async fn extract_code_items(
    src_dir: &Path,
    options: &ReverseOptions,
) -> Result<Vec<ExtractedItem>> {
    let mut items = Vec::new();
    
    let extension = match options.source_language.as_str() {
        "rust" => "rs",
        "typescript" | "ts" => "ts",
        "javascript" | "js" => "js",
        "python" | "py" => "py",
        _ => "rs",
    };
    
    for entry in WalkDir::new(src_dir).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some(extension) {
            if let Ok(content) = tokio::fs::read_to_string(path).await {
                let file_items = match options.source_language.as_str() {
                    "rust" => parse_rust_file(&content, path),
                    "typescript" | "ts" => parse_typescript_file(&content, path),
                    "python" | "py" => parse_python_file(&content, path),
                    _ => parse_rust_file(&content, path),
                };
                items.extend(file_items);
            }
        }
    }
    
    Ok(items)
}

/// Parse a Rust file and extract functions, structs, modules
fn parse_rust_file(content: &str, file_path: &Path) -> Vec<ExtractedItem> {
    let mut items = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    
    // Regex patterns for Rust
    let fn_pattern = Regex::new(r"^(pub\s+)?(?:async\s+)?(?:unsafe\s+)?fn\s+(\w+)").unwrap();
    let struct_pattern = Regex::new(r"^(pub\s+)?struct\s+(\w+)").unwrap();
    let enum_pattern = Regex::new(r"^(pub\s+)?enum\s+(\w+)").unwrap();
    let trait_pattern = Regex::new(r"^(pub\s+)?trait\s+(\w+)").unwrap();
    let mod_pattern = Regex::new(r"^pub\s+mod\s+(\w+)").unwrap();
    let doc_pattern = Regex::new(r"^\s*///\s?(.*)").unwrap();
    
    let mut current_docs: Vec<String> = Vec::new();
    let mut in_impl_block = false;
    
    for (i, line) in lines.iter().enumerate() {
        let line_num = i + 1;
        
        // Extract doc comments
        if let Some(caps) = doc_pattern.captures(line) {
            current_docs.push(caps[1].to_string());
            continue;
        }
        
        // Check for impl blocks
        if line.trim().starts_with("impl") {
            in_impl_block = true;
            current_docs.clear();
            continue;
        }
        
        // Extract functions
        if let Some(caps) = fn_pattern.captures(line) {
            let is_pub = caps.get(1).is_some();
            let name = caps[2].to_string();
            
            // Find function end (simple heuristic: next closing brace at column 0 or end of impl)
            let line_end = find_function_end(&lines, i);
            
            items.push(ExtractedItem {
                name,
                kind: ItemKind::Function,
                docs: current_docs.clone(),
                file_path: file_path.to_path_buf(),
                line_start: line_num,
                line_end,
                is_public: is_pub || in_impl_block,
                parameters: extract_parameters(line),
                return_type: extract_return_type(line),
            });
            
            current_docs.clear();
            continue;
        }
        
        // Extract structs
        if let Some(caps) = struct_pattern.captures(line) {
            let is_pub = caps.get(1).is_some();
            let name = caps[2].to_string();
            
            items.push(ExtractedItem {
                name,
                kind: ItemKind::Struct,
                docs: current_docs.clone(),
                file_path: file_path.to_path_buf(),
                line_start: line_num,
                line_end: line_num,
                is_public: is_pub,
                parameters: vec![],
                return_type: None,
            });
            
            current_docs.clear();
            continue;
        }
        
        // Extract enums
        if let Some(caps) = enum_pattern.captures(line) {
            let is_pub = caps.get(1).is_some();
            let name = caps[2].to_string();
            
            items.push(ExtractedItem {
                name,
                kind: ItemKind::Enum,
                docs: current_docs.clone(),
                file_path: file_path.to_path_buf(),
                line_start: line_num,
                line_end: line_num,
                is_public: is_pub,
                parameters: vec![],
                return_type: None,
            });
            
            current_docs.clear();
            continue;
        }
        
        // Extract traits
        if let Some(caps) = trait_pattern.captures(line) {
            let is_pub = caps.get(1).is_some();
            let name = caps[2].to_string();
            
            items.push(ExtractedItem {
                name,
                kind: ItemKind::Trait,
                docs: current_docs.clone(),
                file_path: file_path.to_path_buf(),
                line_start: line_num,
                line_end: line_num,
                is_public: is_pub,
                parameters: vec![],
                return_type: None,
            });
            
            current_docs.clear();
            continue;
        }
        
        // Extract public modules
        if let Some(caps) = mod_pattern.captures(line) {
            let name = caps[1].to_string();
            
            items.push(ExtractedItem {
                name,
                kind: ItemKind::Module,
                docs: current_docs.clone(),
                file_path: file_path.to_path_buf(),
                line_start: line_num,
                line_end: line_num,
                is_public: true,
                parameters: vec![],
                return_type: None,
            });
            
            current_docs.clear();
            continue;
        }
        
        // Clear docs on blank lines or non-doc lines
        if !line.trim().is_empty() && !line.trim().starts_with("//") {
            // Keep docs if we're in a logical continuation
            if !line.trim().starts_with("fn") 
                && !line.trim().starts_with("pub fn")
                && !line.trim().starts_with("struct")
                && !line.trim().starts_with("pub struct") {
                // current_docs.clear();
            }
        }
    }
    
    items
}

/// Parse TypeScript file (simplified)
fn parse_typescript_file(content: &str, file_path: &Path) -> Vec<ExtractedItem> {
    let mut items = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    
    let fn_pattern = Regex::new(r"^(export\s+)?(?:async\s+)?function\s+(\w+)").unwrap();
    let method_pattern = Regex::new(r"^(?:public|private|protected)?\s*(?:async\s+)?(\w+)\s*\(").unwrap();
    let class_pattern = Regex::new(r"^(export\s+)?class\s+(\w+)").unwrap();
    let interface_pattern = Regex::new(r"^(export\s+)?interface\s+(\w+)").unwrap();
    let _ = interface_pattern; // TODO: use for interface extraction
    let doc_pattern = Regex::new(r"^\s*/\*\*\s?(.*)").unwrap();
    
    let mut current_docs: Vec<String> = Vec::new();
    let mut in_class = false;
    
    for (i, line) in lines.iter().enumerate() {
        let line_num = i + 1;
        
        // Extract JSDoc comments
        if let Some(caps) = doc_pattern.captures(line) {
            current_docs.push(caps[1].to_string());
            continue;
        }
        
        // Track class entry
        if class_pattern.is_match(line) {
            in_class = true;
            current_docs.clear();
            continue;
        }
        
        // Extract functions
        if let Some(caps) = fn_pattern.captures(line) {
            let is_pub = caps.get(1).is_some();
            let name = caps[2].to_string();
            let line_end = find_function_end(&lines, i);
            
            items.push(ExtractedItem {
                name,
                kind: ItemKind::Function,
                docs: current_docs.clone(),
                file_path: file_path.to_path_buf(),
                line_start: line_num,
                line_end,
                is_public: is_pub,
                parameters: extract_parameters(line),
                return_type: extract_return_type(line),
            });
            
            current_docs.clear();
            continue;
        }
        
        // Extract methods in classes
        if in_class && method_pattern.is_match(line) && !line.trim().starts_with("//") {
            // Simplified: treat as function
            current_docs.clear();
        }
        
        // Clear docs on blank lines
        if line.trim().is_empty() {
            current_docs.clear();
        }
    }
    
    items
}

/// Parse Python file (simplified)
fn parse_python_file(content: &str, file_path: &Path) -> Vec<ExtractedItem> {
    let mut items = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    
    let def_pattern = Regex::new(r"^(?:async\s+)?def\s+(\w+)").unwrap();
    let class_pattern = Regex::new(r"^class\s+(\w+)").unwrap();
    let doc_pattern = Regex::new(r"^\s*#+\s?(.*)").unwrap();
    
    let mut current_docs: Vec<String> = Vec::new();
    
    for (i, line) in lines.iter().enumerate() {
        let line_num = i + 1;
        
        // Extract docstrings
        if let Some(caps) = doc_pattern.captures(line) {
            current_docs.push(caps[1].to_string());
            continue;
        }
        
        // Extract functions
        if let Some(caps) = def_pattern.captures(line) {
            let name = caps[1].to_string();
            // Skip if it starts with underscore (private)
            let is_pub = !name.starts_with('_');
            let line_end = find_function_end_python(&lines, i);
            
            items.push(ExtractedItem {
                name,
                kind: ItemKind::Function,
                docs: current_docs.clone(),
                file_path: file_path.to_path_buf(),
                line_start: line_num,
                line_end,
                is_public: is_pub,
                parameters: extract_parameters_python(line),
                return_type: None,
            });
            
            current_docs.clear();
            continue;
        }
        
        // Extract classes
        if let Some(caps) = class_pattern.captures(line) {
            let name = caps[1].to_string();
            
            items.push(ExtractedItem {
                name,
                kind: ItemKind::Struct, // Treat as struct
                docs: current_docs.clone(),
                file_path: file_path.to_path_buf(),
                line_start: line_num,
                line_end: line_num,
                is_public: true,
                parameters: vec![],
                return_type: None,
            });
            
            current_docs.clear();
            continue;
        }
    }
    
    items
}

/// Find the end of a function (heuristic based on indentation/braces)
fn find_function_end(lines: &[&str], start_idx: usize) -> usize {
    let start_line = lines[start_idx];
    let start_indent = start_line.find(|c: char| !c.is_whitespace()).unwrap_or(0);
    
    // Look for closing brace at same or lower indentation
    for (i, line) in lines.iter().enumerate().skip(start_idx + 1) {
        let line_num = i + 1;
        let indent = line.find(|c: char| !c.is_whitespace()).unwrap_or(0);
        
        // Check for closing brace at start of line
        if line.trim().starts_with('}') && indent <= start_indent {
            return line_num;
        }
        
        // Safety: don't search too far
        if i > start_idx + 200 {
            return line_num;
        }
    }
    
    lines.len()
}

/// Find the end of a Python function (heuristic based on indentation)
fn find_function_end_python(lines: &[&str], start_idx: usize) -> usize {
    if start_idx + 1 >= lines.len() {
        return start_idx + 1;
    }
    
    // Get the indentation of the first line of the function body
    let first_body_line = lines[start_idx + 1];
    let body_indent = first_body_line.find(|c: char| !c.is_whitespace()).unwrap_or(4);
    
    for (i, line) in lines.iter().enumerate().skip(start_idx + 2) {
        let line_num = i + 1;
        
        if line.trim().is_empty() {
            continue;
        }
        
        let indent = line.find(|c: char| !c.is_whitespace()).unwrap_or(0);
        
        // If we hit a line at same or lower indentation as the def, function ended
        if indent <= body_indent - 4 && !line.trim().starts_with("#") {
            return line_num - 1;
        }
        
        // Safety
        if i > start_idx + 100 {
            return line_num;
        }
    }
    
    lines.len()
}

/// Extract parameters from a function signature line
fn extract_parameters(line: &str) -> Vec<String> {
    let mut params = Vec::new();
    
    // Find content between parentheses
    if let Some(start) = line.find('(') {
        if let Some(end) = line.find(')') {
            let param_str = &line[start + 1..end];
            for param in param_str.split(',') {
                let trimmed = param.trim();
                if !trimmed.is_empty() && trimmed != "&self" && trimmed != "&mut self" && trimmed != "self" {
                    // Extract just the parameter name (before colon or type)
                    let name = trimmed.split(':').next().unwrap_or(trimmed).trim().to_string();
                    if !name.is_empty() {
                        params.push(name);
                    }
                }
            }
        }
    }
    
    params
}

/// Extract parameters from Python function
fn extract_parameters_python(line: &str) -> Vec<String> {
    let mut params = Vec::new();
    
    if let Some(start) = line.find('(') {
        if let Some(end) = line.find(')') {
            let param_str = &line[start + 1..end];
            for param in param_str.split(',') {
                let trimmed = param.trim();
                if !trimmed.is_empty() && trimmed != "self" && trimmed != "cls" {
                    params.push(trimmed.to_string());
                }
            }
        }
    }
    
    params
}

/// Extract return type from function signature
fn extract_return_type(line: &str) -> Option<String> {
    if let Some(pos) = line.find("->") {
        let after_arrow = &line[pos + 2..];
        // Take until opening brace or end
        let ret_type = after_arrow.split('{').next().unwrap_or(after_arrow);
        let ret_type = ret_type.split('(').next().unwrap_or(ret_type);
        let trimmed = ret_type.trim();
        if !trimmed.is_empty() {
            return Some(trimmed.to_string());
        }
    }
    None
}

/// Group extracted items into logical domains/modules
fn group_into_domains(items: &[ExtractedItem]) -> HashMap<String, Vec<&ExtractedItem>> {
    let mut groups: HashMap<String, Vec<&ExtractedItem>> = HashMap::new();
    
    for item in items {
        // Skip private items unless configured to include them
        if !item.is_public {
            continue;
        }
        
        // Determine domain based on file path and function name
        let domain = determine_domain(item);
        groups.entry(domain).or_default().push(item);
    }
    
    groups
}

/// Determine the domain/category for an item
fn determine_domain(item: &ExtractedItem) -> String {
    let file_stem = item.file_path.file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("unknown");
    
    let name_lower = item.name.to_lowercase();
    let file_lower = file_stem.to_lowercase();
    
    // Check for domain keywords in function name
    let domains = [
        ("auth", vec!["auth", "login", "user", "session", "password", "token", "credential", "signin", "signup"]),
        ("database", vec!["db", "database", "query", "storage", "persist", "save", "load", "fetch", "store"]),
        ("api", vec!["api", "endpoint", "route", "http", "request", "response", "handler", "controller"]),
        ("validation", vec!["validate", "check", "verify", "sanitiz", "clean", "parse"]),
        ("security", vec!["encrypt", "decrypt", "secure", "hash", "permission", "access", "allow", "deny"]),
        ("network", vec!["network", "tcp", "udp", "socket", "connect", "disconnect", "send", "receive"]),
        ("config", vec!["config", "settings", "env", "init", "setup", "load"]),
    ];
    
    // Check function name first
    for (domain_name, keywords) in &domains {
        for kw in keywords {
            if name_lower.contains(kw) {
                return domain_name.to_string();
            }
        }
    }
    
    // Check file name
    for (domain_name, keywords) in &domains {
        for kw in keywords {
            if file_lower.contains(kw) {
                return domain_name.to_string();
            }
        }
    }
    
    // Default to file stem as module name
    file_stem.to_string()
}

/// Generate requirement clauses from grouped items
fn generate_clauses(
    groups: &HashMap<String, Vec<&ExtractedItem>>,
    options: &ReverseOptions,
) -> Vec<GeneratedClause> {
    let mut clauses = Vec::new();
    
    for (domain, items) in groups {
        for item in items {
            // Generate requirement text from docs or function signature
            let req_text = if options.extract_docs && !item.docs.is_empty() {
                // Use doc comments as primary source
                item.docs.join(" ")
            } else {
                // Generate from function signature
                format_requirement_from_signature(item)
            };
            
            // Skip if too short
            if req_text.len() < 10 {
                continue;
            }
            
            // Determine clause type
            let clause_type = determine_clause_type(item);
            
            clauses.push(GeneratedClause {
                id: format!("{}_{}", domain, item.name),
                text: req_text,
                domain: domain.clone(),
                clause_type,
                source_file: item.file_path.to_string_lossy().to_string(),
                line_number: item.line_start,
                item_name: item.name.clone(),
                item_kind: format!("{:?}", item.kind),
            });
        }
    }
    
    clauses
}

/// Format a requirement from a function signature
fn format_requirement_from_signature(item: &ExtractedItem) -> String {
    match item.kind {
        ItemKind::Function => {
            let params_desc = if item.parameters.is_empty() {
                "no parameters".to_string()
            } else {
                format!("parameters: {}", item.parameters.join(", "))
            };
            
            let return_desc = item.return_type.as_ref()
                .map(|r| format!(" and returns {}", r))
                .unwrap_or_default();
            
            format!(
                "Function {} accepts {}{}{}",
                item.name,
                params_desc,
                return_desc,
                if item.docs.is_empty() { ".".to_string() } 
                else { format!(". Purpose: {}", item.docs.join(" ")) }
            )
        }
        ItemKind::Struct => {
            format!("System shall define data structure '{}' for storing related information.", item.name)
        }
        ItemKind::Enum => {
            format!("System shall define enumeration '{}' for categorizing values.", item.name)
        }
        ItemKind::Trait => {
            format!("System shall define interface '{}' specifying required behavior.", item.name)
        }
        ItemKind::Module => {
            format!("System shall organize {} functionality within module '{}'.", item.name, item.name)
        }
        ItemKind::Impl => {
            format!("System shall implement functionality for '{}'.", item.name)
        }
    }
}

/// Determine clause type based on item characteristics
fn determine_clause_type(item: &ExtractedItem) -> String {
    let text_lower = item.docs.join(" ").to_lowercase();
    let name_lower = item.name.to_lowercase();
    
    // Check for constraint keywords
    if text_lower.contains("must") || text_lower.contains("shall not") ||
       text_lower.contains("never") || text_lower.contains("always") ||
       name_lower.contains("max") || name_lower.contains("min") ||
       name_lower.contains("limit") {
        return "CONSTRAINT".to_string();
    }
    
    // Check for definition keywords
    if text_lower.contains("defined as") || text_lower.contains("means") ||
       item.kind == ItemKind::Struct || item.kind == ItemKind::Enum {
        return "DEFINITION".to_string();
    }
    
    // Check for assumption keywords
    if text_lower.contains("assume") || text_lower.contains("given") ||
       text_lower.contains("precondition") {
        return "ASSUMPTION".to_string();
    }
    
    // Check for scenario keywords
    if text_lower.contains("when") || text_lower.contains("if") ||
       text_lower.contains("scenario") || text_lower.contains("case") {
        return "SCENARIO".to_string();
    }
    
    // Default to requirement
    "REQUIREMENT".to_string()
}

/// Write spec files from generated clauses
async fn write_spec_files(
    clauses: &[GeneratedClause],
    output_dir: &Path,
) -> Result<Vec<String>> {
    // Group clauses by domain
    let mut domain_clauses: HashMap<String, Vec<&GeneratedClause>> = HashMap::new();
    for clause in clauses {
        domain_clauses.entry(clause.domain.clone())
            .or_default()
            .push(clause);
    }
    
    // Create output directory
    tokio::fs::create_dir_all(output_dir).await?;
    
    let mut created_files = Vec::new();
    
    // Write each domain as a separate spec file
    for (domain, clauses) in domain_clauses {
        let filename = format!("{}_generated.md", domain);
        let filepath = output_dir.join(&filename);
        
        let mut content = format!("# {} Requirements\n\n", capitalize(&domain));
        content.push_str(&format!("Generated from source code analysis.\n\n"));
        
        // Group by clause type
        let mut by_type: HashMap<String, Vec<&GeneratedClause>> = HashMap::new();
        for clause in &clauses {
            by_type.entry(clause.clause_type.clone())
                .or_default()
                .push(clause);
        }
        
        // Write each section
        for (clause_type, type_clauses) in by_type {
            content.push_str(&format!("## {}\n\n", capitalize(&clause_type)));
            
            for clause in type_clauses {
                content.push_str(&format!(
                    "- {}: {}\n",
                    clause.clause_type,
                    clause.text
                ));
                content.push_str(&format!(
                    "  <!-- Source: {}:{} -->\n",
                    clause.source_file,
                    clause.line_number
                ));
            }
            
            content.push_str("\n");
        }
        
        // Add traceability section
        content.push_str("## Traceability\n\n");
        content.push_str("| Requirement | Source File | Line | Item |\n");
        content.push_str("|-------------|-------------|------|------|\n");
        for clause in &clauses {
            content.push_str(&format!(
                "| {} | {} | {} | `{}` |\n",
                clause.id,
                clause.source_file,
                clause.line_number,
                clause.item_name
            ));
        }
        
        tokio::fs::write(&filepath, content).await?;
        created_files.push(filename);
    }
    
    Ok(created_files)
}

/// Helper: capitalize first letter
fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
    }
}

/// Count source files for statistics
async fn count_source_files(src_dir: &Path, language: &str) -> Result<usize> {
    let ext = match language {
        "rust" => "rs",
        "typescript" | "ts" => "ts",
        "javascript" | "js" => "js",
        "python" | "py" => "py",
        _ => "rs",
    };
    
    let count = WalkDir::new(src_dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().and_then(|e| e.to_str()) == Some(ext))
        .count();
    
    Ok(count)
}

/// Generated clause structure
#[derive(Debug, Clone)]
struct GeneratedClause {
    id: String,
    text: String,
    domain: String,
    clause_type: String,
    source_file: String,
    line_number: usize,
    item_name: String,
    item_kind: String,
}
