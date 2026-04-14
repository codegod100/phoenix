//! Algorithmic Bridge: spec.md → spec.ncl (4-Layer Algebraic Pipeline)
//!
//! Bypasses LLM by using formal grammar + structured extraction.
//!
//! Architecture:
//!   spec.md (natural language)
//!     ↓ Layer 3: NL Lens (parse/extract)
//!   StructuredSpec { project, description, routes[], models[] }
//!     ↓ Layer 2: Schema validation
//!   SchemaGraph { vertices: routes, models, config }
//!     ↓ Layer 4: NCL Generator
//!   spec.ncl (Nickel with sorts, ops, config)

use std::collections::HashMap;
use std::sync::Arc;
use crate::pipeline::bundle_stack::*;

// ============================================================================
// Layer 1: Theory (ThNaturalLanguage)
// ============================================================================

/// Theory for natural language specification documents
pub struct NaturalLanguageTheory;

impl Theory for NaturalLanguageTheory {
    fn name(&self) -> &str {
        "ThNaturalLanguage"
    }
    
    fn sorts(&self) -> Vec<Sort> {
        vec![
            // Document structure
            Sort {
                name: "SpecDocument".to_string(),
                kind: SortKind::Structural,
                description: "Complete specification document".to_string(),
            },
            Sort {
                name: "Section".to_string(),
                kind: SortKind::Structural,
                description: "Named section (Overview, API, etc.)".to_string(),
            },
            
            // Domain entities (extracted from NL)
            Sort {
                name: "ProjectDef".to_string(),
                kind: SortKind::Structural,
                description: "Project name and metadata".to_string(),
            },
            Sort {
                name: "RouteDef".to_string(),
                kind: SortKind::Structural,
                description: "API endpoint definition".to_string(),
            },
            Sort {
                name: "ModelDef".to_string(),
                kind: SortKind::Structural,
                description: "Data model definition".to_string(),
            },
            Sort {
                name: "FieldDef".to_string(),
                kind: SortKind::Structural,
                description: "Model field definition".to_string(),
            },
            
            // Value sorts (primitive extractions)
            Sort {
                name: "ProjectName".to_string(),
                kind: SortKind::Value { value_kind: "string".to_string() },
                description: "Extracted project name".to_string(),
            },
            Sort {
                name: "Description".to_string(),
                kind: SortKind::Value { value_kind: "string".to_string() },
                description: "Project description".to_string(),
            },
            Sort {
                name: "RoutePath".to_string(),
                kind: SortKind::Value { value_kind: "string".to_string() },
                description: "API path (/api/users)".to_string(),
            },
            Sort {
                name: "HttpMethod".to_string(),
                kind: SortKind::Value { value_kind: "enum".to_string() },
                description: "GET, POST, PUT, DELETE".to_string(),
            },
            Sort {
                name: "FieldType".to_string(),
                kind: SortKind::Value { value_kind: "string".to_string() },
                description: "String, Number, Date, etc.".to_string(),
            },
        ]
    }
    
    fn operations(&self) -> Vec<Operation> {
        vec![
            Operation {
                name: "extract_project".to_string(),
                inputs: vec![("text".to_string(), "String".to_string())],
                output: "ProjectDef".to_string(),
                description: "Parse project name from heading/title".to_string(),
            },
            Operation {
                name: "extract_routes".to_string(),
                inputs: vec![("section".to_string(), "Section".to_string())],
                output: "RouteDef".to_string(),
                description: "Parse API routes from bullet lists".to_string(),
            },
            Operation {
                name: "extract_models".to_string(),
                inputs: vec![("section".to_string(), "Section".to_string())],
                output: "ModelDef".to_string(),
                description: "Parse data models from description".to_string(),
            },
            Operation {
                name: "mk_ncl_spec".to_string(),
                inputs: vec![
                    ("project".to_string(), "ProjectDef".to_string()),
                    ("routes".to_string(), "RouteDef".to_string()),
                    ("models".to_string(), "ModelDef".to_string()),
                ],
                output: "SpecDocument".to_string(),
                description: "Compose Nickel specification".to_string(),
            },
        ]
    }
    
    fn equations(&self) -> Vec<Equation> {
        vec![]
    }
}

// ============================================================================
// Layer 2: Schema (Specification Graph)
// ============================================================================

/// Structured representation extracted from natural language
#[derive(Debug, Clone, Default)]
pub struct StructuredSpec {
    pub project_name: String,
    pub project_description: String,
    pub template: String,
    pub build_type: String,
    pub routes: Vec<RouteSpec>,
    pub models: Vec<ModelSpec>,
    pub server_config: ServerConfig,
}

#[derive(Debug, Clone)]
pub struct RouteSpec {
    pub method: String,
    pub path: String,
    pub handler: String,
    pub description: String,
}

#[derive(Debug, Clone)]
pub struct ModelSpec {
    pub name: String,
    pub fields: Vec<FieldSpec>,
}

#[derive(Debug, Clone)]
pub struct FieldSpec {
    pub name: String,
    pub field_type: String,
    pub required: bool,
    pub unique: Option<bool>,
    pub default: Option<String>,
    pub reference: Option<String>, // For ObjectId ref
}

#[derive(Debug, Clone, Default)]
pub struct ServerConfig {
    pub port: u16,
    pub host: String,
}

/// Schema compiler for natural language specs
pub struct NLSchemaCompiler;

impl SchemaCompiler for NLSchemaCompiler {
    fn compile(&self, _theory: &dyn Theory) -> Schema {
        Schema {
            vertices: vec![
                Vertex {
                    id: "project".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "routes".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "models".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "server".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
            ],
            edges: vec![
                Edge {
                    from: "spec".to_string(),
                    to: "project".to_string(),
                    kind: EdgeKind::Contains,
                    label: "has_project".to_string(),
                },
                Edge {
                    from: "spec".to_string(),
                    to: "routes".to_string(),
                    kind: EdgeKind::Contains,
                    label: "has_routes".to_string(),
                },
                Edge {
                    from: "spec".to_string(),
                    to: "models".to_string(),
                    kind: EdgeKind::Contains,
                    label: "has_models".to_string(),
                },
            ],
            constraints: vec![
                Constraint {
                    name: "has_project_name".to_string(),
                    check: Arc::new(|schema| {
                        schema.vertices.iter()
                            .any(|v| v.id == "project" && v.data.contains_key("name"))
                    }),
                },
            ],
        }
    }
}

// ============================================================================
// Layer 3: Lens (Natural Language → Structured Data)
// ============================================================================

/// Parser for natural language spec.md files
pub struct SpecMdLens;

impl SpecMdLens {
    /// Parse spec.md into structured specification
    pub fn parse(spec_md: &str) -> StructuredSpec {
        let mut spec = StructuredSpec {
            template: "nodejs-express".to_string(),
            build_type: "nodejs".to_string(),
            server_config: ServerConfig {
                port: 3000,
                host: "0.0.0.0".to_string(),
            },
            ..Default::default()
        };
        
        let lines: Vec<&str> = spec_md.lines().collect();
        let mut i = 0;
        let mut current_section: Option<&str> = None;
        
        while i < lines.len() {
            let line = lines[i].trim();
            
            // Parse H1 as project name
            if line.starts_with("# ") && !line.starts_with("## ") {
                let title = line.trim_start_matches("# ").trim();
                // Extract project name (remove common suffixes)
                spec.project_name = Self::normalize_project_name(title);
                spec.project_description = title.to_string();
                i += 1;
                continue;
            }
            
            // Parse H2 as section headers
            if line.starts_with("## ") {
                let section = line.trim_start_matches("## ").trim().to_lowercase();
                current_section = Some(Box::leak(section.into_boxed_str()));
                i += 1;
                continue;
            }
            
            // Parse content based on current section
            match current_section {
                Some("overview") | Some("description") => {
                    if !line.is_empty() && !line.starts_with('#') {
                        spec.project_description = line.to_string();
                    }
                }
                Some("api") | Some("routes") | Some("endpoints") => {
                    // Parse route definitions from bullet points
                    // Format: - `METHOD /path` - description
                    // Or: - METHOD /path: description
                    if line.starts_with("- ") || line.starts_with("* ") {
                        if let Some(route) = Self::parse_route_line(line) {
                            spec.routes.push(route);
                        }
                    }
                }
                Some("models") | Some("data models") | Some("schema") => {
                    // Parse model definitions
                    // Format: - **User**: name (String, required), email (String, required, unique)
                    if line.starts_with("- ") || line.starts_with("* ") {
                        if let Some(model) = Self::parse_model_line(line) {
                            spec.models.push(model);
                        }
                    }
                }
                Some("server") | Some("config") => {
                    // Parse server config
                    // Format: - Port: 3000
                    if let Some(port) = Self::extract_port(line) {
                        spec.server_config.port = port;
                    }
                }
                _ => {}
            }
            
            i += 1;
        }
        
        // If no routes found, try to infer from description
        if spec.routes.is_empty() {
            spec.routes = Self::infer_routes_from_description(&spec.project_description);
        }
        
        // If no models found, try common defaults
        if spec.models.is_empty() {
            spec.models = Self::default_models_for_template(&spec.template);
        }
        
        spec
    }
    
    /// Parse a route line into RouteSpec
    fn parse_route_line(line: &str) -> Option<RouteSpec> {
        // Patterns:
        // - `GET /api/users` - List all users
        // - GET /api/users: List all users
        // - `GET /api/users` - description
        
        let content = line.trim_start_matches("- ").trim_start_matches("* ").trim();
        
        // Try backtick format: `METHOD /path`
        if let Some(start) = content.find('`') {
            if let Some(end) = content[start+1..].find('`') {
                let method_path = &content[start+1..start+1+end];
                let parts: Vec<&str> = method_path.split_whitespace().collect();
                if parts.len() >= 2 {
                    let method = parts[0].to_uppercase();
                    let path = parts[1..].join(" ");
                    
                    // Extract description after backticks
                    let desc = content[start+1+end..]
                        .trim_start_matches("`")
                        .trim_start_matches(" - ")
                        .trim_start_matches(": ")
                        .trim();
                    
                    let method_str = method.clone();
                    return Some(RouteSpec {
                        method,
                        path,
                        handler: Self::handler_name_from_path(&parts[1..].join(" "), &parts[0]),
                        description: if desc.is_empty() { 
                            format!("{} endpoint", method_str) 
                        } else { 
                            desc.to_string() 
                        },
                    });
                }
            }
        }
        
        // Try simple format: METHOD /path: description
        let parts: Vec<&str> = content.splitn(2, ':').collect();
        if parts.len() == 2 {
            let method_path = parts[0].trim();
            let desc = parts[1].trim();
            
            let words: Vec<&str> = method_path.split_whitespace().collect();
            if words.len() >= 2 {
                let method = words[0].to_uppercase();
                if ["GET", "POST", "PUT", "DELETE", "PATCH"].contains(&method.as_str()) {
                    let path = words[1..].join(" ");
                    let method_for_handler = method.clone();
                    return Some(RouteSpec {
                        method,
                        path: path.clone(),
                        handler: Self::handler_name_from_path(&path, &method_for_handler),
                        description: desc.to_string(),
                    });
                }
            }
        }
        
        None
    }
    
    /// Parse a model line into ModelSpec
    fn parse_model_line(line: &str) -> Option<ModelSpec> {
        // Format: - **User**: name (String, required), email (String, required, unique)
        let content = line.trim_start_matches("- ").trim_start_matches("* ").trim();
        
        // Extract model name from bold: **Name**
        if let Some(start) = content.find("**") {
            if let Some(end) = content[start+2..].find("**") {
                let model_name = &content[start+2..start+2+end];
                
                // Extract fields after colon
                let after_model = &content[start+2+end+2..];
                let fields_str = after_model.trim_start_matches(":").trim_start_matches(" - ").trim();
                
                let fields = Self::parse_fields(fields_str);
                
                return Some(ModelSpec {
                    name: model_name.to_string(),
                    fields,
                });
            }
        }
        
        // Simpler format: - User: fields...
        if let Some(colon) = content.find(':') {
            let name = content[..colon].trim();
            let fields_str = &content[colon+1..];
            let fields = Self::parse_fields(fields_str);
            
            return Some(ModelSpec {
                name: name.to_string(),
                fields,
            });
        }
        
        None
    }
    
    /// Parse field definitions
    fn parse_fields(fields_str: &str) -> Vec<FieldSpec> {
        let mut fields = Vec::new();
        
        // Split by comma or "and"
        let field_parts: Vec<&str> = fields_str.split(',').collect();
        
        for part in field_parts {
            let part = part.trim();
            // Format: name (Type, required, unique)
            // Or: name (Type)
            
            if let Some(paren_start) = part.find('(') {
                let name = part[..paren_start].trim();
                if let Some(paren_end) = part[paren_start..].find(')') {
                    let type_spec = &part[paren_start+1..paren_start+paren_end];
                    let type_parts: Vec<&str> = type_spec.split(',').map(|s| s.trim()).collect();
                    
                    let field_type = type_parts.get(0).unwrap_or(&"String").to_string();
                    let required = type_parts.contains(&"required");
                    let unique = if type_parts.contains(&"unique") { Some(true) } else { None };
                    let default = type_parts.iter()
                        .find(|&&p| p.starts_with("default="))
                        .map(|p| p.trim_start_matches("default=").to_string());
                    let reference = type_parts.iter()
                        .find(|&&p| p.starts_with("ref="))
                        .map(|p| p.trim_start_matches("ref=").to_string());
                    
                    fields.push(FieldSpec {
                        name: name.to_string(),
                        field_type,
                        required,
                        unique,
                        default,
                        reference,
                    });
                }
            }
        }
        
        fields
    }
    
    /// Generate handler name from path
    fn handler_name_from_path(path: &str, method: &str) -> String {
        let base = path.trim_start_matches("/api/")
            .replace("/", "_")
            .replace(":", "by");
        
        let action = match method {
            "GET" => if path.ends_with("/:id") { "get" } else { "list" },
            "POST" => "create",
            "PUT" | "PATCH" => "update",
            "DELETE" => "delete",
            _ => "handle",
        };
        
        format!("{}{}", action, Self::to_pascal_case(&base.replace("_", " ")))
    }
    
    /// Normalize project name from title
    fn normalize_project_name(title: &str) -> String {
        title.to_lowercase()
            .replace(" ", "-")
            .replace("api", "api")
            .replace("server", "server")
            .trim_matches('-')
            .to_string()
    }
    
    /// Extract port number from config line
    fn extract_port(line: &str) -> Option<u16> {
        // Format: - Port: 3000
        // - port: 3000
        // - PORT=3000
        if let Some(pos) = line.find(|c: char| c.is_ascii_digit()) {
            let num_str: String = line[pos..].chars().take_while(|c| c.is_ascii_digit()).collect();
            num_str.parse().ok()
        } else {
            None
        }
    }
    
    /// Infer routes from project description
    fn infer_routes_from_description(desc: &str) -> Vec<RouteSpec> {
        let mut routes = Vec::new();
        let desc_lower = desc.to_lowercase();
        
        // Detect common patterns
        if desc_lower.contains("user") {
            routes.push(RouteSpec {
                method: "GET".to_string(),
                path: "/api/users".to_string(),
                handler: "listUsers".to_string(),
                description: "List all users".to_string(),
            });
            routes.push(RouteSpec {
                method: "POST".to_string(),
                path: "/api/users".to_string(),
                handler: "createUser".to_string(),
                description: "Create new user".to_string(),
            });
            routes.push(RouteSpec {
                method: "DELETE".to_string(),
                path: "/api/users/:id".to_string(),
                handler: "deleteUser".to_string(),
                description: "Delete user".to_string(),
            });
        }
        
        if desc_lower.contains("item") || desc_lower.contains("product") {
            routes.push(RouteSpec {
                method: "GET".to_string(),
                path: "/api/items".to_string(),
                handler: "listItems".to_string(),
                description: "List all items".to_string(),
            });
            routes.push(RouteSpec {
                method: "POST".to_string(),
                path: "/api/items".to_string(),
                handler: "createItem".to_string(),
                description: "Create new item".to_string(),
            });
        }
        
        // Always add health check
        routes.push(RouteSpec {
            method: "GET".to_string(),
            path: "/health".to_string(),
            handler: "healthCheck".to_string(),
            description: "Health check endpoint".to_string(),
        });
        
        routes
    }
    
    /// Default models for template
    fn default_models_for_template(template: &str) -> Vec<ModelSpec> {
        match template {
            "nodejs-express" => vec![
                ModelSpec {
                    name: "User".to_string(),
                    fields: vec![
                        FieldSpec { name: "name".to_string(), field_type: "String".to_string(), required: true, unique: None, default: None, reference: None },
                        FieldSpec { name: "email".to_string(), field_type: "String".to_string(), required: true, unique: Some(true), default: None, reference: None },
                        FieldSpec { name: "createdAt".to_string(), field_type: "Date".to_string(), required: false, unique: None, default: Some("Date.now".to_string()), reference: None },
                    ],
                },
            ],
            _ => vec![],
        }
    }
    
    fn to_pascal_case(s: &str) -> String {
        s.split_whitespace()
            .map(|word| {
                let mut chars = word.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
                }
            })
            .collect()
    }
}

// ============================================================================
// Layer 4: NCL Generator (Structured Data → spec.ncl)
// ============================================================================

/// Generator for Nickel/NCL specifications
pub struct NclSpecGenerator;

impl NclSpecGenerator {
    /// Generate complete spec.ncl from structured specification
    pub fn generate(spec: &StructuredSpec) -> String {
        let mut output = String::new();
        
        // Header
        output.push_str(&format!(r#"{{
  id = "dev.phoenix.{}",
  description = "{}",
  theory = "{}",

  # Template selection
  template = "{}",
  build_type = "{}",

"#, 
            spec.project_name,
            spec.project_description,
            Self::theory_name_for_template(&spec.template),
            spec.template,
            spec.build_type
        ));
        
        // Generate sorts
        output.push_str("  # Sorts - domain types\n");
        output.push_str("  sorts = [\n");
        output.push_str("    { name = \"ThPackageJson\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("    { name = \"ThApp\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("    { name = \"ThNix\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("    { name = \"ThREADME\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("    { name = \"ThIntegratedApp\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("\n");
        output.push_str("    { name = \"ProjectName\", kind = {{ type = \"val\", value_kind = \"string\" }} },\n");
        output.push_str("    { name = \"ProjectDescription\", kind = {{ type = \"val\", value_kind = \"string\" }} },\n");
        output.push_str("    { name = \"Port\", kind = {{ type = \"val\", value_kind = \"integer\" }} },\n");
        output.push_str("    { name = \"Host\", kind = {{ type = \"val\", value_kind = \"string\" }} },\n");
        output.push_str("\n");
        output.push_str("    { name = \"RouteTable\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("    { name = \"ModelDef\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("\n");
        output.push_str("    # HTTP Methods\n");
        output.push_str("    { name = \"GET\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("    { name = \"POST\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("    { name = \"PUT\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("    { name = \"DELETE\", kind = {{ type = \"structural\" }} },\n");
        output.push_str("  ],\n\n");
        
        // Generate operations
        output.push_str("  # Operations - constructors\n");
        output.push_str("  ops = [\n");
        output.push_str("    { name = \"generate_package_json\", inputs = [{ name = \"name\", sort = \"ProjectName\" }], output = \"ThPackageJson\" },\n");
        output.push_str("    { name = \"generate_app\", inputs = [{ name = \"routes\", sort = \"RouteTable\" }], output = \"ThApp\" },\n");
        output.push_str("    { name = \"mk_project_name\", inputs = [{ name = \"name\", sort = \"String\" }], output = \"ProjectName\" },\n");
        output.push_str("    { name = \"mk_route_table\", inputs = [{ name = \"routes\", sort = \"String\" }], output = \"RouteTable\" },\n");
        output.push_str("  ],\n\n");
        
        // Generate phoenix_config
        output.push_str("  phoenix_config = {\n");
        output.push_str(&format!("    project_name = \"{}\",\n", spec.project_name));
        output.push_str(&format!("    project_description = \"{}\",\n", spec.project_description));
        output.push_str(&format!("    template = \"{}\",\n", spec.template));
        output.push_str(&format!("    build_type = \"{}\",\n", spec.build_type));
        output.push_str("    server_config = {\n");
        output.push_str(&format!("      port = {},\n", spec.server_config.port));
        output.push_str(&format!("      host = \"{}\",\n", spec.server_config.host));
        output.push_str("    },\n");
        output.push_str("  },\n\n");
        
        // Generate routes
        output.push_str("  # Routes definition\n");
        output.push_str("  routes = [\n");
        for route in &spec.routes {
            output.push_str(&format!(
                "    {{ method = \"{}\", path = \"{}\", handler = \"{}\", description = \"{}\" }},\n",
                route.method, route.path, route.handler, route.description
            ));
        }
        output.push_str("  ],\n\n");
        
        // Generate models
        if !spec.models.is_empty() {
            output.push_str("  # Data models\n");
            output.push_str("  models = {\n");
            for model in &spec.models {
                output.push_str(&format!("    {} = {{\n", model.name));
                output.push_str("      fields = [\n");
                for field in &model.fields {
                    let required = if field.required { "true" } else { "false" };
                    let unique = if field.unique.unwrap_or(false) { ", unique = true" } else { "" };
                    let default = field.default.as_ref()
                        .map(|d| format!(", default = \"{}\"", d))
                        .unwrap_or_default();
                    let reference = field.reference.as_ref()
                        .map(|r| format!(", ref = \"{}\"", r))
                        .unwrap_or_default();
                    
                    output.push_str(&format!(
                        "        {{ name = \"{}\", type = \"{}\", required = {}{}{}{} }},\n",
                        field.name, field.field_type, required, unique, default, reference
                    ));
                }
                output.push_str("      ],\n");
                output.push_str("    },\n");
            }
            output.push_str("  },\n");
        }
        
        output.push_str("}\n");
        
        output
    }
    
    fn theory_name_for_template(template: &str) -> String {
        match template {
            "nodejs-express" => "NodejsExpressServer".to_string(),
            "python-flask" => "PythonFlaskServer".to_string(),
            "ts-hono" => "TypescriptHonoServer".to_string(),
            "lit" => "LitWebComponents".to_string(),
            _ => "GenericServer".to_string(),
        }
    }
}

// ============================================================================
// Pipeline Integration
// ============================================================================

/// Complete algebraic transformation: spec.md → spec.ncl
pub fn transform_spec_md_to_ncl(spec_md: &str) -> Result<String, String> {
    // Layer 3: Parse natural language
    let structured = SpecMdLens::parse(spec_md);
    
    // Validate: ensure we have minimum required fields
    if structured.project_name.is_empty() {
        return Err("Could not extract project name from spec.md".to_string());
    }
    
    if structured.routes.is_empty() {
        return Err("No routes detected in spec.md".to_string());
    }
    
    // Layer 4: Generate NCL
    let ncl = NclSpecGenerator::generate(&structured);
    
    Ok(ncl)
}

/// Verify the transformation by parsing generated NCL back
pub fn verify_transformation(spec_md: &str, generated_ncl: &str) -> Result<(), String> {
    // Re-parse to check round-trip fidelity
    let structured = SpecMdLens::parse(spec_md);
    
    // Check that key elements are present in generated NCL
    if !generated_ncl.contains(&format!("project_name = \"{}\"", structured.project_name)) {
        return Err("Project name not found in generated NCL".to_string());
    }
    
    for route in &structured.routes {
        if !generated_ncl.contains(&format!("method = \"{}\"", route.method)) {
            return Err(format!("Route method {} not found", route.method));
        }
    }
    
    Ok(())
}
