//! NCL (Nickel) spec parser using nickel-lang-core
//!
//! Parses .ncl spec files into structured data using the official Nickel parser.
//! Supports both panproto-style morphisms with generation blocks and requirements-style specs.

use nickel_lang_core::program::Program;
use nickel_lang_core::term::Term;
use nickel_lang_core::eval::cache::lazy::CBNCache;
use nickel_lang_core::error::Reporter;
use nickel_lang_core::identifier::Ident;
use std::io::Write;
use std::path::Path;
use std::collections::HashMap;
use indexmap::IndexMap;

/// A requirement extracted from NCL
#[derive(Debug, Clone)]
pub struct NclRequirement {
    pub id: String,
    pub description: String,
    pub priority: String,
    pub protocol: String,
    pub language: String,
}

/// A morphism with generation info extracted from NCL
#[derive(Debug, Clone)]
pub struct NclMorphism {
    pub name: String,
    pub domain: String,
    pub codomain: String,
    pub output_path: Option<String>,
    pub language: String,
    pub generation_content: Option<String>,
}

/// Parsed NCL content - can contain multiple spec types from one file
#[derive(Debug, Clone, Default)]
pub struct ParsedNcl {
    /// Panproto-style theory with sorts, ops, equations
    pub theory: Option<TheoryData>,
    /// Requirements from protocols
    pub requirements: Vec<NclRequirement>,
    /// Morphisms with generation blocks
    pub morphisms: Vec<NclMorphism>,
    /// Compositions with generation blocks
    pub compositions: Vec<NclMorphism>,
    /// Flake configuration (merged from template + spec)
    pub flake: Option<FlakeConfig>,
    /// PyProject configuration (for Python projects)
    pub pyproject: Option<PyProjectConfig>,
    /// Generic record content
    pub generic: Option<HashMap<String, String>>,
    /// Template name to use for code generation (e.g., "python-textual", "rust")
    /// Takes precedence over build_type inference
    pub template: Option<String>,
    /// Build type specified in spec (e.g., "python", "rust", "pyo3")
    /// Used for both template selection and flake configuration
    pub build_type: Option<String>,
    /// Top-level name from spec (used as pname if no flake.pname)
    pub name: Option<String>,
    /// Top-level version from spec (used as version if no flake.version)
    pub version: Option<String>,
    /// Top-level description from spec (used as description if no flake.description)
    pub description: Option<String>,
}

impl ParsedNcl {
    /// Load and merge template configuration
    /// 
    /// Priority: explicit `template` field > `build_type` field > none
    pub fn merge_template(&mut self, template_dir: impl AsRef<Path>) {
        // Determine which template to load: explicit template > build_type > none
        let template_name = self.template.clone()
            .or_else(|| self.build_type.clone());
        
        if let Some(ref template_name) = template_name {
            let template_path = template_dir.as_ref().join(format!("{}.ncl", template_name));
            if let Ok(template_content) = std::fs::read_to_string(&template_path) {
                if let Ok(template_parsed) = parse_ncl_spec(&template_content, &template_path.to_string_lossy()) {
                    // Create a spec FlakeConfig from top-level fields if no flake section exists
                    let spec_flake = self.flake.clone().or_else(|| {
                        // Only create synthetic flake config if we have at least name
                        self.name.as_ref().map(|name| FlakeConfig {
                            pname: Some(name.clone()),
                            version: self.version.clone(),
                            description: self.description.clone(),
                            build_type: self.build_type.clone().or_else(|| template_parsed.build_type.clone()),
                            ..Default::default()
                        })
                    });
                    
                    // Merge template flake config into spec
                    if let Some(template_flake) = template_parsed.flake {
                        self.flake = Some(merge_flake_configs(&template_flake, spec_flake.as_ref()));
                    }
                    
                    // Merge pyproject config - spec overrides template
                    if self.pyproject.is_none() {
                        if let Some(template_pyproject) = template_parsed.pyproject {
                            self.pyproject = Some(template_pyproject);
                        } else if template_name.starts_with("python") {
                            // Use default Python config
                            self.pyproject = Some(PyProjectConfig::python_default());
                        }
                    }
                }
            }
        }
    }
}

/// Merge template flake config with optional spec overrides
fn merge_flake_configs(template: &FlakeConfig, spec: Option<&FlakeConfig>) -> FlakeConfig {
    let spec = spec.cloned().unwrap_or_default();
    FlakeConfig {
        pname: spec.pname.clone().or_else(|| template.pname.clone()),
        version: spec.version.clone().or_else(|| template.version.clone()),
        description: spec.description.clone().or_else(|| template.description.clone()),
        build_type: spec.build_type.clone().or_else(|| template.build_type.clone()),
        build_inputs: if spec.build_inputs.is_empty() { template.build_inputs.clone() } else { spec.build_inputs.clone() },
        native_build_inputs: if spec.native_build_inputs.is_empty() { template.native_build_inputs.clone() } else { spec.native_build_inputs.clone() },
        propagated_build_inputs: if spec.propagated_build_inputs.is_empty() { template.propagated_build_inputs.clone() } else { spec.propagated_build_inputs.clone() },
        main_program: spec.main_program.clone().or_else(|| template.main_program.clone()),
        src_path: spec.src_path.clone().or_else(|| template.src_path.clone()),
        source_root: spec.source_root.clone().or_else(|| template.source_root.clone()),
        cargo_subdir: spec.cargo_subdir.clone().or_else(|| template.cargo_subdir.clone()),
        post_patch: spec.post_patch.clone().or_else(|| template.post_patch.clone()),
        pre_build: spec.pre_build.clone().or_else(|| template.pre_build.clone()),
        install_phase: spec.install_phase.clone().or_else(|| template.install_phase.clone()),
        extra_nix: spec.extra_nix.clone().or_else(|| template.extra_nix.clone()),
    }
}

/// Flake configuration for Nix builds
#[derive(Debug, Clone, Default)]
pub struct FlakeConfig {
    pub pname: Option<String>,
    pub version: Option<String>,
    pub description: Option<String>,
    pub build_type: Option<String>,  // "python", "rust", "pyo3", "maturin", "maturin-workspace"
    pub build_inputs: Vec<String>,
    pub native_build_inputs: Vec<String>,
    pub propagated_build_inputs: Vec<String>,
    pub main_program: Option<String>,
    pub src_path: Option<String>,     // Source path (default: ./.)
    pub source_root: Option<String>,  // Source root subdirectory
    pub cargo_subdir: Option<String>, // For buildAndTestSubdir in workspace builds
    pub post_patch: Option<String>,   // Optional hook script
    pub pre_build: Option<String>,    // Optional hook script (also used for custom buildPhase)
    pub install_phase: Option<String>, // Custom install phase
    pub extra_nix: Option<String>,    // Any extra Nix expression lines
}

/// PyProject.toml configuration for Python projects
#[derive(Debug, Clone, Default)]
pub struct PyProjectConfig {
    pub build_system: Vec<String>,     // e.g., ["hatchling", "setuptools", "poetry-core"]
    pub requires_python: String,       // e.g., ">=3.12"
    pub dependencies: Vec<String>,     // Runtime dependencies
    pub dev_dependencies: Vec<String>, // Dev/test dependencies
    pub entry_point: Option<String>,   // Module path for console script (e.g., "src.app:main")
    pub packages: Vec<String>,         // Packages to include (e.g., ["src"])
}

impl PyProjectConfig {
    /// Create default Python config
    pub fn python_default() -> Self {
        Self {
            build_system: vec!["hatchling".to_string()],
            requires_python: ">=3.12".to_string(),
            dependencies: vec![],
            dev_dependencies: vec![],
            entry_point: Some("src.app:main".to_string()),
            packages: vec!["src".to_string()],
        }
    }
}

#[derive(Debug, Clone)]
pub struct TheoryData {
    pub id: String,
    pub description: String,
    pub sorts: Vec<HashMap<String, String>>,
    pub ops: Vec<HashMap<String, String>>,
}

/// Null reporter - we don't need warning reporting for spec parsing
struct NullReporter;

impl<E> Reporter<E> for NullReporter {
    fn report(&mut self, _diagnostic: E) {
        // Ignore warnings
    }
}

/// Null writer for trace output
struct NullWriter;

impl Write for NullWriter {
    fn write(&mut self, buf: &[u8]) -> std::io::Result<usize> {
        Ok(buf.len())
    }
    
    fn flush(&mut self) -> std::io::Result<()> {
        Ok(())
    }
}

/// Parse an NCL spec file
pub fn parse_ncl_file<P: AsRef<Path>>(path: P) -> Result<ParsedNcl, String> {
    let path = path.as_ref();
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    parse_ncl_spec(&content, path.to_str().unwrap_or("unknown.ncl"))
}

/// Parse NCL spec content using nickel-lang-core
pub fn parse_ncl_spec(content: &str, source_name: &str) -> Result<ParsedNcl, String> {
    // Create program from source using CBNCache (Call-by-Name evaluation cache)
    let mut program = Program::<CBNCache>::new_from_source(
        std::io::Cursor::new(content),
        source_name,
        NullWriter,
        NullReporter,
    ).map_err(|e| format!("Failed to create program: {}", e))?;
    
    // Parse into AST
    let term = program.parse()
        .map_err(|e| format!("Parse error: {:?}", e))?;
    
    // Extract structure from the parsed term
    extract_structure(&term)
}

/// Extract structure from a parsed Nickel term - collects ALL spec types
fn extract_structure(term: &nickel_lang_core::term::RichTerm) -> Result<ParsedNcl, String> {
    let mut result = ParsedNcl::default();
    
    match term.as_ref() {
        Term::RecRecord(record_data, _, _) => {
            let mut field_names = HashMap::new();
            
            // First pass: collect all field names
            for key in record_data.fields.keys() {
                field_names.insert(key.ident().to_string(), true);
            }
            
            // Extract morphisms if present
            if field_names.contains_key("morphisms") {
                let morphs = extract_morphisms_all(&record_data.fields);
                result.morphisms = morphs;
            }
            
            // Extract compositions if present
            if field_names.contains_key("compositions") {
                let comps = extract_compositions_all(&record_data.fields);
                result.compositions = comps;
            }
            
            // Extract requirements if present
            if field_names.contains_key("requirements") {
                let reqs = extract_requirements_all(&record_data.fields);
                result.requirements = reqs;
            }
            
            // Extract theory if present
            if field_names.contains_key("sorts") && field_names.contains_key("ops") {
                if let Some(theory) = extract_theory(&record_data.fields) {
                    result.theory = Some(theory);
                }
            }
            
            // Extract flake config if present
            if field_names.contains_key("flake") {
                if let Some(flake) = extract_flake_config(&record_data.fields) {
                    result.flake = Some(flake);
                }
            }
            
            // Extract pyproject config if present
            if field_names.contains_key("pyproject") {
                if let Some(pyproject) = extract_pyproject_config(&record_data.fields) {
                    result.pyproject = Some(pyproject);
                }
            }
            
            // Extract template if present at top level (takes precedence over build_type)
            if let Some(template_str) = get_field_string(&record_data.fields, "template") {
                result.template = Some(template_str);
            }
            
            // Extract build_type if present at top level
            if let Some(build_type_str) = get_field_string(&record_data.fields, "build_type") {
                result.build_type = Some(build_type_str);
            }
            
            // Extract top-level metadata fields
            if let Some(name_str) = get_field_string(&record_data.fields, "name") {
                result.name = Some(name_str);
            }
            if let Some(version_str) = get_field_string(&record_data.fields, "version") {
                result.version = Some(version_str);
            }
            if let Some(desc_str) = get_field_string(&record_data.fields, "description") {
                result.description = Some(desc_str);
            }
            
            // ALWAYS extract top-level string fields to generic (for templates)
            // regardless of whether structured content exists
            let mut fields = HashMap::new();
            for (key, field) in &record_data.fields {
                let key_str = key.ident().to_string();
                // Skip already-extracted structured sections
                if ["theory", "requirements", "morphisms", "compositions", 
                    "flake", "pyproject", "template", "build_type", "name", "version", "description"]
                    .contains(&key_str.as_str()) {
                    continue;
                }
                if let Some(ref value) = field.value {
                    if let Some(s) = extract_string_from_term(value) {
                        fields.insert(key_str, s);
                    }
                }
            }
            if !fields.is_empty() {
                result.generic = Some(fields);
            }
            
            Ok(result)
        }
        
        Term::Let(_, body, _) => {
            // Unwrap let bindings and extract from body
            extract_structure(body)
        }
        
        _ => Err("Unsupported NCL structure - expected record at top level".to_string())
    }
}

/// Extract theory structure
fn extract_theory(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>
) -> Option<TheoryData> {
    let id = get_field_string(fields, "id").unwrap_or_else(|| "unknown".to_string());
    let description = get_field_string(fields, "description").unwrap_or_default();
    
    let sorts = extract_array_of_records(fields, "sorts");
    let ops = extract_array_of_records(fields, "ops");
    
    Some(TheoryData {
        id,
        description,
        sorts,
        ops,
    })
}

/// Helper to get array field from record fields
fn get_field_array(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>,
    key: &str
) -> Vec<String> {
    if let Some(field) = fields.get(&Ident::from(key)) {
        if let Some(ref term) = field.value {
            if let Term::Array(elems, _) = term.as_ref() {
                return elems.iter()
                    .filter_map(extract_string_from_term)
                    .collect();
            }
        }
    }
    Vec::new()
}

/// Extract flake configuration
fn extract_flake_config(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>
) -> Option<FlakeConfig> {
    let flake_field = fields.get(&Ident::from("flake"))?;
    let flake_term = flake_field.value.as_ref()?;
    
    let record_data = match flake_term.as_ref() {
        Term::RecRecord(r, _, _) => &r.fields,
        Term::Record(r) => &r.fields,
        _ => return None,
    };
    
    Some(FlakeConfig {
        pname: get_field_string(record_data, "pname"),
        version: get_field_string(record_data, "version"),
        description: get_field_string(record_data, "description"),
        build_type: get_field_string(record_data, "build_type"),
        build_inputs: get_field_array(record_data, "build_inputs"),
        native_build_inputs: get_field_array(record_data, "native_build_inputs"),
        propagated_build_inputs: get_field_array(record_data, "propagated_build_inputs"),
        main_program: get_field_string(record_data, "main_program"),
        src_path: get_field_string(record_data, "src_path"),
        source_root: get_field_string(record_data, "source_root"),
        cargo_subdir: get_field_string(record_data, "cargo_subdir"),
        post_patch: get_field_string(record_data, "post_patch"),
        pre_build: get_field_string(record_data, "pre_build"),
        install_phase: get_field_string(record_data, "install_phase"),
        extra_nix: get_field_string(record_data, "extra_nix"),
    })
}

/// Extract pyproject configuration
fn extract_pyproject_config(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>
) -> Option<PyProjectConfig> {
    let pyproject_field = fields.get(&Ident::from("pyproject"))?;
    let pyproject_term = pyproject_field.value.as_ref()?;
    
    let record_data = match pyproject_term.as_ref() {
        Term::RecRecord(r, _, _) => &r.fields,
        Term::Record(r) => &r.fields,
        _ => return None,
    };
    
    Some(PyProjectConfig {
        build_system: get_field_array(record_data, "build_system"),
        requires_python: get_field_string(record_data, "requires_python").unwrap_or_else(|| ">=3.12".to_string()),
        dependencies: get_field_array(record_data, "dependencies"),
        dev_dependencies: get_field_array(record_data, "dev_dependencies"),
        entry_point: get_field_string(record_data, "entry_point"),
        packages: get_field_array(record_data, "packages"),
    })
}

/// Extract all requirements from a record
fn extract_requirements_all(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>
) -> Vec<NclRequirement> {
    let mut all_requirements = Vec::new();
    
    if let Some(field) = fields.get(&Ident::from("requirements")) {
        if let Some(ref term) = field.value {
            if let Term::Array(elems, _) = term.as_ref() {
                for elem in elems.iter() {
                    if let Some(req) = extract_requirement(elem) {
                        all_requirements.push(req);
                    }
                }
            }
        }
    }
    
    all_requirements
}

/// Extract all morphisms from record
fn extract_morphisms_all(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>
) -> Vec<NclMorphism> {
    let mut morphisms = Vec::new();
    
    if let Some(field) = fields.get(&Ident::from("morphisms")) {
        if let Some(ref term) = field.value {
            if let Term::Array(elems, _) = term.as_ref() {
                for elem in elems.iter() {
                    if let Some(morph) = extract_morphism(elem) {
                        morphisms.push(morph);
                    }
                }
            }
        }
    }
    
    morphisms
}

/// Extract all compositions from record
fn extract_compositions_all(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>
) -> Vec<NclMorphism> {
    let mut compositions = Vec::new();
    
    if let Some(field) = fields.get(&Ident::from("compositions")) {
        if let Some(ref term) = field.value {
            if let Term::Array(elems, _) = term.as_ref() {
                for elem in elems.iter() {
                    if let Some(comp) = extract_composition(elem) {
                        compositions.push(comp);
                    }
                }
            }
        }
    }
    
    compositions
}

/// Extract a single requirement
fn extract_requirement(term: &nickel_lang_core::term::RichTerm) -> Option<NclRequirement> {
    let record_data = match term.as_ref() {
        Term::RecRecord(r, _, _) => &r.fields,
        _ => return None,
    };
    
    let description = get_field_string(record_data, "description").unwrap_or_default();
    let priority = get_field_string(record_data, "priority").unwrap_or_else(|| "must".to_string());
    let protocol = get_field_string(record_data, "protocol").unwrap_or_default();
    let language = infer_language(&protocol);
    
    // id is auto-generated from description hash if not provided
    let id = get_field_string(record_data, "id").unwrap_or_else(|| {
        let normalized = crate::identity::normalize_text(&description);
        crate::identity::canon_id(&normalized)
    });
    
    Some(NclRequirement {
        id,
        description,
        priority,
        protocol,
        language,
    })
}

/// Extract a single composition (uses 'result' field for name)
fn extract_composition(term: &nickel_lang_core::term::RichTerm) -> Option<NclMorphism> {
    let record_data = match term.as_ref() {
        Term::RecRecord(r, _, _) => &r.fields,
        _ => return None,
    };
    
    let name = get_field_string(record_data, "result")?;
    let output_path = get_field_string(record_data, "output_path");
    
    // Infer domain/codomain from bases array if present
    let bases = get_field_array(record_data, "bases");
    let domain = bases.first().cloned().unwrap_or_default();
    let codomain = name.clone(); // The result is the codomain
    
    let generation_content = if let Some(field) = record_data.get(&Ident::from("generation")) {
        Some(format!("{:?}", field.value))
    } else {
        None
    };
    
    let language = if let Some(ref path) = output_path {
        infer_language_from_path(path)
    } else {
        "both".to_string()
    };
    
    Some(NclMorphism {
        name,
        domain,
        codomain,
        output_path,
        language,
        generation_content,
    })
}

/// Extract a single morphism
fn extract_morphism(term: &nickel_lang_core::term::RichTerm) -> Option<NclMorphism> {
    let record_data = match term.as_ref() {
        Term::RecRecord(r, _, _) => &r.fields,
        _ => return None,
    };
    
    let name = get_field_string(record_data, "morphism")?;
    let domain = get_field_string(record_data, "domain").unwrap_or_default();
    let codomain = get_field_string(record_data, "codomain").unwrap_or_default();
    let output_path = get_field_string(record_data, "output_path");
    
    let generation_content = if let Some(field) = record_data.get(&Ident::from("generation")) {
        Some(format!("{:?}", field.value))
    } else {
        None
    };
    
    let language = if let Some(ref path) = output_path {
        infer_language_from_path(path)
    } else {
        "both".to_string()
    };
    
    Some(NclMorphism {
        name,
        domain,
        codomain,
        output_path,
        language,
        generation_content,
    })
}

/// Helper to get string field from record fields
fn get_field_string(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>,
    key: &str
) -> Option<String> {
    fields.get(&Ident::from(key))
        .and_then(|f| f.value.as_ref())
        .and_then(extract_string_from_term)
}

/// Extract string value from term
/// Handles multiline strings with interpolations (e.g., m%"{{var}}"%m)
fn extract_string_from_term(term: &nickel_lang_core::term::RichTerm) -> Option<String> {
    match term.as_ref() {
        Term::Str(s) => Some(s.to_string()),
        Term::StrChunks(chunks) => {
            let mut result = String::new();
            for chunk in chunks {
                match chunk {
                    nickel_lang_core::term::StrChunk::Literal(s) => result.push_str(s),
                    nickel_lang_core::term::StrChunk::Expr(expr, _) => {
                        // Convert interpolation to {{...}} placeholder format
                        result.push_str("{{");
                        if let Term::Var(id) = expr.as_ref() {
                            result.push_str(&id.to_string());
                        } else {
                            result.push_str("expr");
                        }
                        result.push_str("}}");
                    }
                }
            }
            Some(result)
        }
        // Handle function application: m%"..."%m is parsed as App(m, string_with_suffix)
        Term::App(arg, _) => {
            // Extract the argument which should be a string with suffix
            extract_string_from_term(arg)
        }
        _ => None,
    }
}

/// Extract array of records into vector of field maps
fn extract_array_of_records(
    fields: &IndexMap<nickel_lang_core::identifier::LocIdent, nickel_lang_core::term::record::Field>,
    key: &str
) -> Vec<HashMap<String, String>> {
    let mut result = Vec::new();
    
    if let Some(field) = fields.get(&Ident::from(key)) {
        if let Some(ref term) = field.value {
            if let Term::Array(elems, _) = term.as_ref() {
                for elem in elems.iter() {
                    if let Term::Record(record_data) = elem.as_ref() {
                        let mut field_map = HashMap::new();
                        for (key, field) in &record_data.fields {
                            let key_str = key.ident().to_string();
                            if let Some(ref value) = field.value {
                                if let Some(s) = extract_string_from_term(value) {
                                    field_map.insert(key_str, s);
                                }
                            }
                        }
                        result.push(field_map);
                    }
                }
            }
        }
    }
    
    result
}

/// Infer target language from protocol name
fn infer_language(protocol: &str) -> String {
    let protocol_lower = protocol.to_lowercase();
    if protocol_lower.contains("irc") || protocol_lower.contains("auth") {
        "rust".to_string()
    } else if protocol_lower.contains("layout") || protocol_lower.contains("ui") {
        "python".to_string()
    } else {
        "both".to_string()
    }
}

/// Infer language from file path
fn infer_language_from_path(path: &str) -> String {
    if path.ends_with(".rs") {
        "rust".to_string()
    } else if path.ends_with(".py") {
        "python".to_string()
    } else if path.contains("pyo3") || path.contains("ffi") {
        "pyo3".to_string()
    } else {
        "both".to_string()
    }
}

/// Parse NCL specs from a directory
pub fn parse_ncl_specs_in_dir<P: AsRef<Path>>(dir: P) -> Result<HashMap<String, ParsedNcl>, String> {
    let mut results = HashMap::new();
    
    for entry in walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| e.path().extension().map_or(false, |ext| ext == "ncl"))
    {
        let path = entry.path();
        let file_name = path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("unknown")
            .to_string();
        
        match parse_ncl_file(path) {
            Ok(parsed) => {
                results.insert(file_name, parsed);
            }
            Err(e) => {
                eprintln!("Warning: Failed to parse {}: {}", path.display(), e);
            }
        }
    }
    
    Ok(results)
}

/// Load a code template from templates directory
/// 
/// Templates are NCL files that contain code generation templates
/// like `python-flask.ncl`, `rust.ncl`, etc.
pub fn load_code_template(template_dir: impl AsRef<Path>, template_name: &str) -> Result<CodeTemplate, String> {
    let template_path = template_dir.as_ref().join(format!("{}.ncl", template_name));
    
    if !template_path.exists() {
        return Err(format!("Template file not found: {:?}", template_path));
    }
    
    let content = std::fs::read_to_string(&template_path)
        .map_err(|e| format!("Failed to read template: {}", e))?;
    
    parse_code_template(&content)
}

/// Parse a code template from NCL content
fn parse_code_template(content: &str) -> Result<CodeTemplate, String> {
    // Parse the template NCL
    let parsed = parse_ncl_spec(content, "template")?;
    
    // Extract template fields
    let mut template = CodeTemplate::default();
    
    if let Some(ref generic) = parsed.generic {
        template.language = generic.get("language").cloned().unwrap_or_default();
        template.framework = generic.get("framework").cloned();
        template.output_path = generic.get("output_path").cloned().unwrap_or_else(|| "src/app.py".to_string());
        template.code_template = generic.get("code_template").cloned().unwrap_or_default();
        template.llm_prompt = generic.get("llm_prompt").cloned().unwrap_or_default();
    }
    
    // Also check pyproject and flake for dependencies
    if let Some(ref pyproject) = parsed.pyproject {
        template.dependencies = pyproject.dependencies.clone();
        template.entry_point = pyproject.entry_point.clone();
    }
    
    Ok(template)
}

/// Code template for generating files
#[derive(Debug, Clone, Default)]
pub struct CodeTemplate {
    pub language: String,
    pub framework: Option<String>,
    pub output_path: String,
    pub code_template: String,
    pub llm_prompt: String,  // LLM prompt template for code generation
    pub dependencies: Vec<String>,
    pub entry_point: Option<String>,
}

impl CodeTemplate {
    /// Render the template with variable substitutions
    pub fn render(&self, vars: &std::collections::HashMap<String, String>) -> String {
        let mut result = self.code_template.clone();
        
        // Simple Mustache-style {{var}} substitution
        for (key, value) in vars {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, value);
        }
        
        result
    }
    
    /// Render the LLM prompt with variable substitutions
    pub fn render_prompt(&self, vars: &std::collections::HashMap<String, String>) -> String {
        if self.llm_prompt.is_empty() {
            return String::new();
        }
        
        let mut result = self.llm_prompt.clone();
        
        // Simple Mustache-style {{var}} substitution
        for (key, value) in vars {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, value);
        }
        
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_requirements_spec() {
        let spec = r#"
        {
            protocol = "IRC-Core",
            requirements = [
                {
                    id = "IRC-001",
                    description = "Handle NICK command",
                    priority = "must",
                },
            ]
        }
        "#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        assert_eq!(parsed.requirements.len(), 1);
        assert_eq!(parsed.requirements[0].id, "IRC-001");
    }
    
    #[test]
    fn test_parse_simple_record() {
        let spec = r#"
        {
            id = "test.theory",
            description = "A test theory",
        }
        "#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        if let Some(fields) = &parsed.generic {
            assert_eq!(fields.get("id"), Some(&"test.theory".to_string()));
        } else {
            panic!("Expected generic fields, got {:?}", parsed);
        }
    }
}
