//! Phoenix VCS — Boundary Validator
//!
//! Implements PRD Section 7 & 7.1: Boundary Policy Schema and Architectural Linter
//! Validates that generated code respects declared dependencies and side-channels.

use serde::{Serialize, Deserialize};
use regex::Regex;
use std::collections::HashSet;

/// Boundary policy defines what dependencies are allowed
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct BoundaryPolicy {
    pub dependencies: DependencyPolicy,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct DependencyPolicy {
    pub code: CodeDependencies,
    #[serde(default)]
    pub side_channels: SideChannels,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct CodeDependencies {
    #[serde(default)]
    pub allowed_ius: Vec<String>,
    #[serde(default)]
    pub allowed_packages: Vec<String>,
    #[serde(default)]
    pub forbidden_ius: Vec<String>,
    #[serde(default)]
    pub forbidden_packages: Vec<String>,
    #[serde(default)]
    pub forbidden_paths: Vec<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SideChannels {
    #[serde(default)]
    pub databases: Vec<String>,
    #[serde(default)]
    pub queues: Vec<String>,
    #[serde(default)]
    pub caches: Vec<String>,
    #[serde(default)]
    pub config: Vec<String>,
    #[serde(default)]
    pub external_apis: Vec<String>,
    #[serde(default)]
    pub files: Vec<String>,
}

/// Enforcement configuration for boundary violations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnforcementConfig {
    pub dependency_violation: ViolationSeverity,
    pub side_channel_violation: ViolationSeverity,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ViolationSeverity {
    #[serde(rename = "error")]
    Error,
    #[serde(rename = "warning")]
    Warning,
}

/// Extracted dependency from source code
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtractedDependency {
    pub dep_type: DependencyType,
    pub source: String,
    pub target: String,
    pub line: Option<usize>,
    pub column: Option<usize>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DependencyType {
    #[serde(rename = "iu_import")]
    IUImport,
    #[serde(rename = "package_import")]
    PackageImport,
    #[serde(rename = "side_channel")]
    SideChannel,
}

/// Validation diagnostic for boundary issues
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationDiagnostic {
    pub severity: ViolationSeverity,
    pub category: DiagnosticCategory,
    pub subject: String,
    pub message: String,
    pub recommendation: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiagnosticCategory {
    #[serde(rename = "boundary")]
    Boundary,
    #[serde(rename = "side_channel")]
    SideChannel,
    #[serde(rename = "dependency")]
    Dependency,
}

/// Result of boundary validation for a single file/IU
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoundaryValidationResult {
    pub iu_id: String,
    pub file: String,
    pub diagnostics: Vec<ValidationDiagnostic>,
    pub has_errors: bool,
    pub has_warnings: bool,
    pub dependency_graph: Vec<ExtractedDependency>,
}

/// Default boundary policy per PRD
pub fn default_boundary_policy() -> BoundaryPolicy {
    BoundaryPolicy {
        dependencies: DependencyPolicy {
            code: CodeDependencies::default(),
            side_channels: SideChannels::default(),
        },
    }
}

/// Extract dependencies from source code.
/// This is a simplified parser - a real implementation would use AST parsing.
pub fn extract_dependencies(source_code: &str, file_path: &str) -> Vec<ExtractedDependency> {
    let mut deps = Vec::new();
    let lines: Vec<&str> = source_code.lines().collect();
    
    // Match import statements (TypeScript/JavaScript style)
    let import_regex = Regex::new(r#"import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"];?"#).unwrap();
    let require_regex = Regex::new(r#"require\s*\(\s*['"]([^'"]+)['"]\s*\)"#).unwrap();
    
    // Side channel patterns
    let side_channel_patterns: Vec<(SideChannelType, Regex)> = vec![
        (SideChannelType::Database, Regex::new(r#"new\s+(?:Database|SQLite|better-sqlite3|pg|mysql|redis)"#).unwrap()),
        (SideChannelType::Queue, Regex::new(r#"new\s+(?:Queue|Bull|RabbitMQ|Kafka|SQS)"#).unwrap()),
        (SideChannelType::Cache, Regex::new(r#"new\s+(?:Cache|Redis|Memcached)"#).unwrap()),
        (SideChannelType::ExternalApi, Regex::new(r#"fetch\s*\(|axios|https?\.request"#).unwrap()),
        (SideChannelType::File, Regex::new(r#"fs\.(?:read|write|append)|readFile|writeFile"#).unwrap()),
    ];
    
    for (i, line) in lines.iter().enumerate() {
        let line_num = i + 1;
        
        // Check imports
        for cap in import_regex.captures_iter(line) {
            let import_path = &cap[1];
            let dep_type = if import_path.starts_with("./") || import_path.starts_with("../") {
                if import_path.contains("generated") {
                    DependencyType::IUImport
                } else {
                    DependencyType::PackageImport
                }
            } else {
                DependencyType::PackageImport
            };
            
            deps.push(ExtractedDependency {
                dep_type,
                source: file_path.to_string(),
                target: import_path.to_string(),
                line: Some(line_num),
                column: Some(cap.get(0).map(|m| m.start()).unwrap_or(0)),
            });
        }
        
        // Check requires
        for cap in require_regex.captures_iter(line) {
            deps.push(ExtractedDependency {
                dep_type: DependencyType::PackageImport,
                source: file_path.to_string(),
                target: cap[1].to_string(),
                line: Some(line_num),
                column: Some(cap.get(0).map(|m| m.start()).unwrap_or(0)),
            });
        }
        
        // Check side channels
        for (channel_type, pattern) in &side_channel_patterns {
            if pattern.is_match(line) {
                deps.push(ExtractedDependency {
                    dep_type: DependencyType::SideChannel,
                    source: file_path.to_string(),
                    target: format!("{:?}_usage", channel_type).to_lowercase(),
                    line: Some(line_num),
                    column: None,
                });
            }
        }
    }
    
    deps
}

#[derive(Debug, Clone, Copy)]
enum SideChannelType {
    Database,
    Queue,
    Cache,
    ExternalApi,
    File,
}

impl std::fmt::Display for SideChannelType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SideChannelType::Database => write!(f, "database"),
            SideChannelType::Queue => write!(f, "queue"),
            SideChannelType::Cache => write!(f, "cache"),
            SideChannelType::ExternalApi => write!(f, "external_api"),
            SideChannelType::File => write!(f, "file"),
        }
    }
}

/// Validate boundary policy against extracted dependencies.
/// Per PRD 7.1: "Post-generation: Extract dependency graph, Validate against boundary policy"
pub fn validate_boundary(
    iu_id: &str,
    file_path: &str,
    source_code: &str,
    policy: &BoundaryPolicy,
    enforcement: &EnforcementConfig,
) -> BoundaryValidationResult {
    let deps = extract_dependencies(source_code, file_path);
    let mut diagnostics = Vec::new();
    
    // Check forbidden IU imports
    for forbidden in &policy.dependencies.code.forbidden_ius {
        let violations: Vec<_> = deps.iter()
            .filter(|d| matches!(d.dep_type, DependencyType::IUImport) && d.target.contains(forbidden))
            .cloned()
            .collect();
        
        for v in violations {
            diagnostics.push(ValidationDiagnostic {
                severity: enforcement.dependency_violation,
                category: DiagnosticCategory::Boundary,
                subject: iu_id.to_string(),
                message: format!("Forbidden IU import: {} at line {:?}", forbidden, v.line),
                recommendation: format!("Remove import or update boundary policy to allow {}", forbidden),
            });
        }
    }
    
    // Check forbidden packages
    for forbidden in &policy.dependencies.code.forbidden_packages {
        let violations: Vec<_> = deps.iter()
            .filter(|d| matches!(d.dep_type, DependencyType::PackageImport) && d.target == *forbidden)
            .cloned()
            .collect();
        
        for v in violations {
            diagnostics.push(ValidationDiagnostic {
                severity: enforcement.dependency_violation,
                category: DiagnosticCategory::Dependency,
                subject: iu_id.to_string(),
                message: format!("Forbidden package: {} at line {:?}", forbidden, v.line),
                recommendation: format!("Remove {} or add to allowed_packages", forbidden),
            });
        }
    }
    
    // Check undeclared side channels
    let declared_side_channels: HashSet<String> = [
        policy.dependencies.side_channels.databases.clone(),
        policy.dependencies.side_channels.queues.clone(),
        policy.dependencies.side_channels.caches.clone(),
        policy.dependencies.side_channels.external_apis.clone(),
        policy.dependencies.side_channels.files.clone(),
    ].concat().into_iter().collect();
    
    let side_channel_deps: Vec<_> = deps.iter()
        .filter(|d| matches!(d.dep_type, DependencyType::SideChannel))
        .collect();
    
    for sc in side_channel_deps {
        let channel_type = sc.target.replace("_usage", "");
        let is_declared = declared_side_channels.contains(&channel_type) 
            || declared_side_channels.contains(&sc.target)
            || declared_side_channels.contains(&"*".to_string());
        
        if !is_declared {
            diagnostics.push(ValidationDiagnostic {
                severity: enforcement.side_channel_violation,
                category: DiagnosticCategory::SideChannel,
                subject: iu_id.to_string(),
                message: format!("Undeclared side channel: {} at line {:?}", channel_type, sc.line),
                recommendation: format!(
                    "Add {} to boundary policy or refactor to use dependency injection",
                    channel_type
                ),
            });
        }
    }
    
    let has_errors = diagnostics.iter().any(|d| matches!(d.severity, ViolationSeverity::Error));
    let has_warnings = diagnostics.iter().any(|d| matches!(d.severity, ViolationSeverity::Warning));
    
    BoundaryValidationResult {
        iu_id: iu_id.to_string(),
        file: file_path.to_string(),
        diagnostics,
        has_errors,
        has_warnings,
        dependency_graph: deps,
    }
}

/// Change severity for boundary changes
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BoundaryChangeSeverity {
    Minor,
    Major,
    Breaking,
}

/// Detected boundary change between two versions
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnitBoundaryChange {
    pub iu_id: String,
    pub added_deps: Vec<ExtractedDependency>,
    pub removed_deps: Vec<ExtractedDependency>,
    pub severity: BoundaryChangeSeverity,
}

/// Detect boundary changes between two versions of an IU.
/// Per PRD: Changes to dependencies trigger cascade re-validation.
pub fn detect_boundary_changes(
    iu_id: &str,
    old_source: &str,
    new_source: &str,
    file_path: &str,
) -> UnitBoundaryChange {
    let old_deps = extract_dependencies(old_source, file_path);
    let new_deps = extract_dependencies(new_source, file_path);
    
    let old_targets: HashSet<String> = old_deps.iter().map(|d| d.target.clone()).collect();
    let new_targets: HashSet<String> = new_deps.iter().map(|d| d.target.clone()).collect();
    
    let added: Vec<_> = new_deps.into_iter()
        .filter(|d| !old_targets.contains(&d.target))
        .collect();
    let removed: Vec<_> = old_deps.into_iter()
        .filter(|d| !new_targets.contains(&d.target))
        .collect();
    
    // Determine severity
    let severity = if added.iter().any(|d| matches!(d.dep_type, DependencyType::SideChannel)) {
        BoundaryChangeSeverity::Major
    } else if !removed.is_empty() && added.is_empty() {
        BoundaryChangeSeverity::Breaking
    } else {
        BoundaryChangeSeverity::Minor
    };
    
    UnitBoundaryChange {
        iu_id: iu_id.to_string(),
        added_deps: added,
        removed_deps: removed,
        severity,
    }
}

/// Format boundary validation results for display
pub fn format_boundary_report(results: &[BoundaryValidationResult]) -> String {
    let mut lines = Vec::new();
    lines.push("🏗️  Phoenix VCS Boundary Validation".to_string());
    lines.push(String::new());
    
    let with_issues: Vec<_> = results.iter()
        .filter(|r| !r.diagnostics.is_empty())
        .collect();
    let clean: Vec<_> = results.iter()
        .filter(|r| r.diagnostics.is_empty())
        .collect();
    
    if !with_issues.is_empty() {
        lines.push("❌ VIOLATIONS DETECTED".to_string());
        lines.push(String::new());
        
        for result in &with_issues {
            lines.push(format!("IU: {}... ({})", &result.iu_id[..8.min(result.iu_id.len())], result.file));
            
            for diag in &result.diagnostics {
                let icon = match diag.severity {
                    ViolationSeverity::Error => "  ❌",
                    ViolationSeverity::Warning => "  ⚠️",
                };
                lines.push(format!("{} [{}] {}", icon, format!("{:?}", diag.category).to_uppercase(), diag.message));
                lines.push(format!("      → {}", diag.recommendation));
            }
            lines.push(String::new());
        }
    }
    
    lines.push(format!("✅ Clean: {} IUs", clean.len()));
    lines.push(format!("⚠️  With issues: {} IUs", with_issues.len()));
    lines.push(String::new());
    
    let has_errors = results.iter().any(|r| r.has_errors);
    if has_errors {
        lines.push("Status: 🔴 REJECTED - Boundary policy violations detected".to_string());
    } else if !with_issues.is_empty() {
        lines.push("Status: 🟡 WARNING - Non-blocking boundary issues".to_string());
    } else {
        lines.push("Status: 🟢 ACCEPTED - All boundaries respected".to_string());
    }
    
    lines.join("\n")
}
