//! Spec parsing and validation for Phoenix VCS
//!
//! Schema v3.0.0: Requirements define WHAT to build, Design defines HOW.
//! Uses nickel-lang-core for proper NCL parsing.

use std::collections::HashSet;
use std::path::Path;
use anyhow::{anyhow, Result};

use crate::ncl::{parse_ncl_file, ParsedNcl, FlakeConfig};

/// Parsed application spec (simplified from NCL output)
#[derive(Debug, Clone)]
pub struct Spec {
    pub requirements: Vec<Requirement>,
    pub design: Design,
    pub flake: Option<FlakeConfig>,
}

/// A single requirement - what the system must do
#[derive(Debug, Clone)]
pub struct Requirement {
    pub description: String,
    pub priority: Priority,
}

#[derive(Debug, Clone)]
pub enum Priority {
    Must,
    Should,
    Could,
}

impl std::fmt::Display for Priority {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Priority::Must => write!(f, "must"),
            Priority::Should => write!(f, "should"),
            Priority::Could => write!(f, "could"),
        }
    }
}

impl From<&str> for Priority {
    fn from(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "must" => Priority::Must,
            "should" => Priority::Should,
            "could" => Priority::Could,
            _ => Priority::Must, // default
        }
    }
}

/// Design - how to implement the requirements
#[derive(Debug, Clone)]
pub struct Design {
    pub outputs: Vec<Output>,
    pub notes: Option<String>,
    pub deps: Vec<String>,
}

/// An output file to generate
#[derive(Debug, Clone)]
pub struct Output {
    pub path: String,
    pub language: String,
    pub framework: Option<String>,
}

/// Validation error
#[derive(Debug)]
pub struct ValidationError {
    pub message: String,
}

/// Parse a spec from an NCL file path
pub fn parse_spec(path: &Path) -> Result<Spec> {
    let parsed = parse_ncl_file(path)
        .map_err(|e| anyhow!("Failed to parse {}: {}", path.display(), e))?;

    convert_parsed_ncl(&parsed)
}

/// Convert ParsedNcl (from nickel-lang-core) to our simpler Spec format
fn convert_parsed_ncl(parsed: &ParsedNcl) -> Result<Spec> {
    // Convert requirements (id is optional now)
    let requirements: Vec<Requirement> = parsed
        .requirements
        .iter()
        .map(|r| Requirement {
            description: r.description.clone(),
            priority: Priority::from(r.priority.as_str()),
        })
        .collect();

    // Convert morphisms to outputs
    let mut outputs: Vec<Output> = parsed
        .morphisms
        .iter()
        .filter_map(|m| {
            let path = m.output_path.as_ref()?;
            Some(Output {
                path: path.clone(),
                language: m.language.clone(),
                framework: None, // Could parse from generation content
            })
        })
        .collect();

    // Also add composition outputs
    for comp in &parsed.compositions {
        if let Some(path) = &comp.output_path {
            outputs.push(Output {
                path: path.clone(),
                language: comp.language.clone(),
                framework: None,
            });
        }
    }

    // If we have generic fields, try to extract design section
    let (notes, deps) = if let Some(generic) = &parsed.generic {
        (
            generic.get("notes").cloned(),
            generic
                .get("deps")
                .map(|d| vec![d.clone()])
                .unwrap_or_default(),
        )
    } else {
        (None, Vec::new())
    };

    let design = Design {
        outputs,
        notes,
        deps,
    };

    Ok(Spec { requirements, design, flake: parsed.flake.clone() })
}

/// Validate a parsed spec against schema v3.0.0
pub fn validate_spec(spec: &Spec) -> Vec<ValidationError> {
    let mut errors = Vec::new();

    // Must have requirements
    if spec.requirements.is_empty() {
        errors.push(ValidationError {
            message: "Must have at least one requirement".to_string(),
        });
    }

    // Validate each requirement
    for (idx, req) in spec.requirements.iter().enumerate() {
        if req.description.trim().is_empty() {
            errors.push(ValidationError {
                message: format!("requirements[{}]: description cannot be empty", idx),
            });
        }
    }

    // Must have outputs
    if spec.design.outputs.is_empty() {
        errors.push(ValidationError {
            message: "Design must specify at least one output".to_string(),
        });
    }

    // Validate outputs
    let mut paths = HashSet::new();
    let supported_langs: HashSet<&str> = ["rust", "python", "typescript"].iter().cloned().collect();

    for (idx, out) in spec.design.outputs.iter().enumerate() {
        if out.path.trim().is_empty() {
            errors.push(ValidationError {
                message: format!("design.outputs[{}]: path cannot be empty", idx),
            });
        }

        if paths.contains(&out.path) {
            errors.push(ValidationError {
                message: format!("Duplicate output path: '{}'", out.path),
            });
        }
        paths.insert(&out.path);

        if !supported_langs.contains(out.language.as_str()) {
            errors.push(ValidationError {
                message: format!(
                    "design.outputs[{}]: unsupported language '{}' (use: rust, python, typescript)",
                    idx, out.language
                ),
            });
        }
    }

    errors
}

/// Load and validate a spec file
pub fn load_and_validate(path: &Path) -> Result<(Spec, Vec<ValidationError>)> {
    let spec = parse_spec(path)?;
    let errors = validate_spec(&spec);
    Ok((spec, errors))
}

/// Validate all specs in a directory
pub fn validate_specs_in_dir(dir: &Path) -> Result<Vec<(String, Spec, Vec<ValidationError>)>> {
    let mut results = Vec::new();

    for entry in walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "ncl"))
    {
        let path = entry.path();
        let file_name = path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();

        // Skip _schema.ncl
        if file_name.starts_with("_") {
            continue;
        }

        match load_and_validate(path) {
            Ok((spec, errors)) => {
                results.push((file_name, spec, errors));
            }
            Err(e) => {
                results.push((
                    file_name,
                    Spec {
                        requirements: Vec::new(),
                        design: Design {
                            outputs: Vec::new(),
                            notes: None,
                            deps: Vec::new(),
                        },
                        flake: None,
                    },
                    vec![ValidationError {
                        message: format!("Parse error: {}", e),
                    }],
                ));
            }
        }
    }

    Ok(results)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    fn create_temp_spec(content: &str) -> (NamedTempFile, std::path::PathBuf) {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(content.as_bytes()).unwrap();
        let path = file.path().to_path_buf();
        (file, path)
    }

    #[test]
    fn test_validate_empty_requirements() {
        let spec = Spec {
            requirements: vec![],
            design: Design {
                outputs: vec![Output {
                    path: "src/main.rs".to_string(),
                    language: "rust".to_string(),
                    framework: None,
                }],
                notes: None,
                deps: vec![],
            },
            flake: None,
        };

        let errors = validate_spec(&spec);
        assert!(!errors.is_empty());
        assert!(errors.iter().any(|e| e.message.contains("at least one requirement")));
    }

    #[test]
    fn test_validate_duplicate_paths() {
        let spec = Spec {
            requirements: vec![Requirement {
                description: "Test".to_string(),
                priority: Priority::Must,
            }],
            design: Design {
                outputs: vec![
                    Output {
                        path: "src/main.rs".to_string(),
                        language: "rust".to_string(),
                        framework: None,
                    },
                    Output {
                        path: "src/main.rs".to_string(),
                        language: "python".to_string(),
                        framework: None,
                    },
                ],
                notes: None,
                deps: vec![],
            },
            flake: None,
        };

        let errors = validate_spec(&spec);
        assert!(errors.iter().any(|e| e.message.contains("Duplicate")));
    }

    #[test]
    fn test_validate_unsupported_language() {
        let spec = Spec {
            requirements: vec![Requirement {
                description: "Test".to_string(),
                priority: Priority::Must,
            }],
            design: Design {
                outputs: vec![Output {
                    path: "src/main.java".to_string(),
                    language: "java".to_string(),
                    framework: None,
                }],
                notes: None,
                deps: vec![],
            },
            flake: None,
        };

        let errors = validate_spec(&spec);
        assert!(errors.iter().any(|e| e.message.contains("unsupported language")));
    }
}
