//! Layer 2: Schema - Route Graph Structure
//!
//! Represents API routes as a graph for structural comparison:
//!   Vertices: Endpoints (path, method, response)
//!   Edges: Relationships (middleware, nesting)

use std::collections::HashMap;

/// Schema graph for API routes
#[derive(Debug, Clone)]
pub struct RouteSchema {
    /// Endpoints (vertices)
    pub endpoints: Vec<Endpoint>,
    /// Relationships between endpoints (edges)
    pub relationships: Vec<RouteRelation>,
}

/// An API endpoint (vertex in graph)
#[derive(Debug, Clone, PartialEq)]
pub struct Endpoint {
    /// Route path (e.g., "/api/status")
    pub path: String,
    /// HTTP method
    pub method: HttpMethod,
    /// Handler implementation details
    pub handler: Handler,
    /// Response structure
    pub response: ResponseDef,
    /// Middleware applied
    pub middleware: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum HttpMethod {
    GET,
    POST,
    PUT,
    DELETE,
    PATCH,
    OPTIONS,
}

impl HttpMethod {
    pub fn from_str(s: &str) -> Option<Self> {
        match s.to_uppercase().as_str() {
            "GET" => Some(HttpMethod::GET),
            "POST" => Some(HttpMethod::POST),
            "PUT" => Some(HttpMethod::PUT),
            "DELETE" => Some(HttpMethod::DELETE),
            "PATCH" => Some(HttpMethod::PATCH),
            "OPTIONS" => Some(HttpMethod::OPTIONS),
            _ => None,
        }
    }
    
    pub fn as_str(&self) -> &'static str {
        match self {
            HttpMethod::GET => "GET",
            HttpMethod::POST => "POST",
            HttpMethod::PUT => "PUT",
            HttpMethod::DELETE => "DELETE",
            HttpMethod::PATCH => "PATCH",
            HttpMethod::OPTIONS => "OPTIONS",
        }
    }
}

/// Handler implementation
#[derive(Debug, Clone, PartialEq)]
pub enum Handler {
    /// Inline function body
    Inline { body: String },
    /// Reference to external controller
    ControllerRef { name: String },
    /// Unknown/parse error
    Unknown,
}

/// Response definition
#[derive(Debug, Clone, PartialEq)]
pub struct ResponseDef {
    /// Content type
    pub content_type: String,
    /// Response body structure (JSON schema or example)
    pub body: ResponseBody,
    /// Status code
    pub status_code: u16,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ResponseBody {
    /// JSON object with fields
    JsonObject(HashMap<String, String>),
    /// JSON array
    JsonArray(String),
    /// String response
    Text(String),
    /// Empty
    Empty,
    /// Unknown/parse error
    Unknown,
}

/// Relationship between endpoints (edge in graph)
#[derive(Debug, Clone)]
pub struct RouteRelation {
    /// Source endpoint
    pub from: String,
    /// Target endpoint
    pub to: String,
    /// Relation type
    pub kind: RelationKind,
}

#[derive(Debug, Clone)]
pub enum RelationKind {
    /// Uses/calls another endpoint
    Uses,
    /// Parent-child nesting
    NestedUnder,
    /// Shares middleware
    SharesMiddleware,
    /// Same controller
    SameController,
}

impl RouteSchema {
    /// Create empty schema
    pub fn new() -> Self {
        Self {
            endpoints: Vec::new(),
            relationships: Vec::new(),
        }
    }
    
    /// Add endpoint
    pub fn add_endpoint(&mut self, endpoint: Endpoint) {
        self.endpoints.push(endpoint);
    }
    
    /// Find endpoint by path and method
    pub fn find_endpoint(&self, path: &str, method: HttpMethod) -> Option<&Endpoint> {
        self.endpoints.iter()
            .find(|e| e.path == path && e.method == method)
    }
    
    /// Compare two schemas and return differences
    pub fn diff(&self, other: &RouteSchema) -> SchemaDiff {
        let mut added = Vec::new();
        let mut removed = Vec::new();
        let mut modified = Vec::new();
        
        // Find added and modified
        for endpoint in &self.endpoints {
            match other.find_endpoint(&endpoint.path, endpoint.method) {
                None => added.push(endpoint.clone()),
                Some(other_ep) => {
                    if endpoint != other_ep {
                        modified.push(EndpointChange {
                            path: endpoint.path.clone(),
                            method: endpoint.method,
                            old: other_ep.clone(),
                            new: endpoint.clone(),
                        });
                    }
                }
            }
        }
        
        // Find removed
        for endpoint in &other.endpoints {
            if self.find_endpoint(&endpoint.path, endpoint.method).is_none() {
                removed.push(endpoint.clone());
            }
        }
        
        SchemaDiff {
            added,
            removed,
            modified,
        }
    }
}

/// Differences between two schemas
#[derive(Debug, Clone)]
pub struct SchemaDiff {
    pub added: Vec<Endpoint>,
    pub removed: Vec<Endpoint>,
    pub modified: Vec<EndpointChange>,
}

#[derive(Debug, Clone)]
pub struct EndpointChange {
    pub path: String,
    pub method: HttpMethod,
    pub old: Endpoint,
    pub new: Endpoint,
}

impl SchemaDiff {
    pub fn is_empty(&self) -> bool {
        self.added.is_empty() && self.removed.is_empty() && self.modified.is_empty()
    }
    
    pub fn summary(&self) -> String {
        let mut parts = Vec::new();
        if !self.added.is_empty() {
            parts.push(format!("{} added", self.added.len()));
        }
        if !self.removed.is_empty() {
            parts.push(format!("{} removed", self.removed.len()));
        }
        if !self.modified.is_empty() {
            parts.push(format!("{} modified", self.modified.len()));
        }
        
        if parts.is_empty() {
            "No changes".to_string()
        } else {
            parts.join(", ")
        }
    }
}

/// Parse Express app.js into RouteSchema
pub fn parse_express_routes(code: &str) -> RouteSchema {
    let mut schema = RouteSchema::new();
    
    // Simple regex-based parsing for now
    // In production, use tree-sitter for proper AST parsing
    for line in code.lines() {
        let line = line.trim();
        
        // Match app.METHOD('/path', ...) patterns
        if line.starts_with("app.get(") || line.starts_with("app.post(") || 
           line.starts_with("app.put(") || line.starts_with("app.delete(") {
            
            if let Some(endpoint) = parse_app_route(line, code) {
                schema.add_endpoint(endpoint);
            }
        }
    }
    
    schema
}

fn parse_app_route(route_line: &str, full_code: &str) -> Option<Endpoint> {
    // Extract method
    let method = if route_line.starts_with("app.get(") {
        HttpMethod::GET
    } else if route_line.starts_with("app.post(") {
        HttpMethod::POST
    } else if route_line.starts_with("app.put(") {
        HttpMethod::PUT
    } else if route_line.starts_with("app.delete(") {
        HttpMethod::DELETE
    } else {
        return None;
    };
    
    // Extract path (simple quote extraction)
    let path_start = route_line.find('"').or_else(|| route_line.find('\''))?;
    let after_start = &route_line[path_start + 1..];
    let path_end = after_start.find('"').or_else(|| after_start.find('\''))?;
    let path = &after_start[..path_end];
    
    // Find the handler body in the full code
    // Look for the response pattern: res.json({...})
    let response = extract_response_from_handler(full_code, route_line);
    
    Some(Endpoint {
        path: path.to_string(),
        method,
        handler: Handler::Inline { body: route_line.to_string() },
        response,
        middleware: Vec::new(),
    })
}

fn extract_response_from_handler(full_code: &str, route_line: &str) -> ResponseDef {
    // Find the res.json(...) pattern after the route line
    // This is a simplified extraction
    let search_start = full_code.find(route_line).unwrap_or(0);
    let after_route = &full_code[search_start..];
    
    // Look for res.json({...}) or res.send(...)
    if let Some(json_start) = after_route.find("res.json(") {
        let after_json = &after_route[json_start + 9..];
        if let Some(json_end) = after_json.find(");") {
            let json_content = &after_json[..json_end];
            
            // Try to parse as JSON object
            let fields = extract_json_fields(json_content);
            
            return ResponseDef {
                content_type: "application/json".to_string(),
                body: ResponseBody::JsonObject(fields),
                status_code: 200,
            };
        }
    }
    
    ResponseDef {
        content_type: "text/plain".to_string(),
        body: ResponseBody::Unknown,
        status_code: 200,
    }
}

fn extract_json_fields(json_str: &str) -> HashMap<String, String> {
    let mut fields = HashMap::new();
    
    // Simple key:value extraction (not full JSON parser)
    for line in json_str.lines() {
        let line = line.trim();
        if let Some(colon_pos) = line.find(':') {
            let key = line[..colon_pos].trim().trim_matches('"').trim_matches('\'');
            let value = line[colon_pos + 1..].trim().trim_matches(',');
            
            // Store as string representation
            fields.insert(key.to_string(), value.to_string());
        }
    }
    
    fields
}

/// Parse spec.ncl routes into RouteSchema
pub fn parse_spec_routes(spec_content: &str) -> RouteSchema {
    let mut schema = RouteSchema::new();
    
    // Find the routes array in spec.ncl
    // Format: routes = [
    //   { method = "GET", path = "/api/status", handler = "...", ... }
    // ]
    
    if let Some(routes_start) = spec_content.find("routes = [") {
        let after_start = &spec_content[routes_start..];
        if let Some(routes_end) = after_start.find("],") {
            let routes_section = &after_start[..routes_end];
            
            // Parse each route entry
            for line in routes_section.lines() {
                let line = line.trim();
                if line.starts_with("{ method = ") {
                    if let Some(endpoint) = parse_spec_route_entry(line) {
                        schema.add_endpoint(endpoint);
                    }
                }
            }
        }
    }
    
    schema
}

fn parse_spec_route_entry(line: &str) -> Option<Endpoint> {
    // Extract method
    let method = if line.contains("method = \"GET\"") {
        HttpMethod::GET
    } else if line.contains("method = \"POST\"") {
        HttpMethod::POST
    } else if line.contains("method = \"PUT\"") {
        HttpMethod::PUT
    } else if line.contains("method = \"DELETE\"") {
        HttpMethod::DELETE
    } else {
        return None;
    };
    
    // Extract path
    let path = extract_quoted_value(line, "path = \"")?;
    
    // Extract handler (optional)
    let handler = extract_quoted_value(line, "handler = \"")
        .map(|h| Handler::ControllerRef { name: h })
        .unwrap_or(Handler::Unknown);
    
    Some(Endpoint {
        path,
        method,
        handler,
        response: ResponseDef {
            content_type: "application/json".to_string(),
            body: ResponseBody::Unknown,
            status_code: 200,
        },
        middleware: Vec::new(),
    })
}

fn extract_quoted_value(line: &str, prefix: &str) -> Option<String> {
    if let Some(start) = line.find(prefix) {
        let after_prefix = &line[start + prefix.len()..];
        if let Some(end) = after_prefix.find('"') {
            return Some(after_prefix[..end].to_string());
        }
    }
    None
}
