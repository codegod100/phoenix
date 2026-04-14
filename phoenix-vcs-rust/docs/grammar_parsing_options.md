# Grammar Parsing Options for spec.md

## Current Implementation: Hand-Rolled (Ad-hoc)

**What we use:** Standard library string operations

```rust
// Current approach - manual pattern matching
fn parse_route_line(line: &str) -> Option<RouteSpec> {
    let content = line.trim_start_matches("- ").trim();
    
    // Pattern: `METHOD /path` - description
    if let Some(start) = content.find('`') {
        if let Some(end) = content[start+1..].find('`') {
            let method_path = &content[start+1..start+1+end];
            let parts: Vec<&str> = method_path.split_whitespace().collect();
            // ... extract
        }
    }
    
    // Pattern: METHOD /path: description
    let parts: Vec<&str> = content.splitn(2, ':').collect();
    // ... extract
    
    None
}
```

**Pros:**
- Zero dependencies
- Fast compile times
- Easy to understand/debug
- Works today

**Cons:**
- Brittle (easy to break with edge cases)
- Not composable
- Hard to extend
- No error messages
- Manual state management

---

## Option 1: Regex (regex crate)

```rust
use regex::Regex;

lazy_static! {
    // Route pattern: `GET /api/users` - description
    static ref ROUTE_RE: Regex = Regex::new(
        r"`(?P<method>GET|POST|PUT|DELETE|PATCH)\s+(?P<path>/[\w/:]+)`\s*(?:-\s*)?(?P<desc>.*)"
    ).unwrap();
    
    // Simple format: GET /path: description
    static ref ROUTE_SIMPLE_RE: Regex = Regex::new(
        r"(?P<method>GET|POST|PUT|DELETE|PATCH)\s+(?P<path>/[\w/:]+)\s*:\s*(?P<desc>.*)"
    ).unwrap();
    
    // Model pattern: **User**: fields
    static ref MODEL_RE: Regex = Regex::new(
        r"\*\*(?P<name>\w+)\*\*:\s*(?P<fields>.+)"
    ).unwrap();
    
    // Field pattern: name (Type, required, unique)
    static ref FIELD_RE: Regex = Regex::new(
        r"(?P<name>\w+)\s*\((?P<type>\w+)(?:,\s*(?P<constraints>[^)]+))?\)"
    ).unwrap();
}

fn parse_route_line(line: &str) -> Option<RouteSpec> {
    // Try pattern A
    if let Some(caps) = ROUTE_RE.captures(line) {
        return Some(RouteSpec {
            method: caps["method"].to_string(),
            path: caps["path"].to_string(),
            description: caps["desc"].trim().to_string(),
            handler: generate_handler(&caps["method"], &caps["path"]),
        });
    }
    
    // Try pattern B
    if let Some(caps) = ROUTE_SIMPLE_RE.captures(line) {
        return Some(RouteSpec {
            method: caps["method"].to_string(),
            path: caps["path"].to_string(),
            description: caps["desc"].trim().to_string(),
            handler: generate_handler(&caps["method"], &caps["path"]),
        });
    }
    
    None
}
```

**Pros:**
- Declarative patterns
- Named capture groups
- Composable (try multiple patterns)
- Well-tested library

**Cons:**
- Regex compile time overhead
- Runtime cost (regex parsing)
- Harder to read for complex patterns
- No structured error messages

---

## Option 2: Nom (Parser Combinators)

```rust
use nom::{
    IResult,
    branch::alt,
    bytes::complete::{tag, take_until, take_while1},
    character::complete::{char, space0, space1, alphanumeric1},
    combinator::{map, opt},
    sequence::{delimited, pair, preceded, separated_pair, tuple},
    multi::separated_list0,
};

// Parse: `GET /api/users` - description
fn parse_route_backtick(input: &str) -> IResult<&str, RouteSpec> {
    let (input, _) = space0(input)?;
    let (input, _) = opt(alt((tag("- "), tag("* "))))(input)?;
    
    // Extract content between backticks
    let (input, method_path) = delimited(
        char('`'),
        take_until("`"),
        char('`')
    )(input)?;
    
    // Parse method and path from inside backticks
    let (_, (method, path)) = separated_pair(
        parse_http_method,
        space1,
        parse_path
    )(method_path)?;
    
    // Optional description
    let (input, desc) = opt(preceded(
        tuple((space0, alt((tag("-"), tag(":"))), space0)),
        take_until("\n")
    ))(input)?;
    
    Ok((input, RouteSpec {
        method: method.to_string(),
        path: path.to_string(),
        description: desc.unwrap_or("").trim().to_string(),
        handler: generate_handler(method, path),
    }))
}

fn parse_http_method(input: &str) -> IResult<&str, &str> {
    alt((
        tag("GET"),
        tag("POST"),
        tag("PUT"),
        tag("DELETE"),
        tag("PATCH"),
    ))(input)
}

fn parse_path(input: &str) -> IResult<&str, &str> {
    take_while1(|c: char| c.is_alphanumeric() || c == '/' || c == ':' || c == '_')(input)
}

// Compose parsers
fn parse_route(input: &str) -> IResult<&str, RouteSpec> {
    alt((
        parse_route_backtick,
        parse_route_simple,
    ))(input)
}
```

**Pros:**
- Composable (small parsers → big parsers)
- Zero-copy (works on &str)
- Excellent error messages
- Type-safe
- Fast (no regex overhead)

**Cons:**
- Steep learning curve
- Verbose for simple patterns
- Complex syntax
- Compile-time type complexity

---

## Option 3: Pest (PEG Grammar)

**spec_md.pest:**
```pest
spec = { header ~ section* }

header = { "# " ~ project_name ~ "\n" ~ description? }
project_name = @{ (ASCII_ALPHANUMERIC | "-" | "_")+ }
description = { (!"##" ~ ANY)* }

section = { "## " ~ section_title ~ "\n" ~ section_content }
section_title = { ("Overview" | "API" | "Routes" | "Models" | "Server" | ANY) }
section_content = { (route_line | model_line | config_line | paragraph)* }

route_line = { "- " ~ (route_backtick | route_simple) }
route_backtick = { "`" ~ method ~ " " ~ path ~ "`" ~ (" - " | ": " ) ~ description }
route_simple = { method ~ " " ~ path ~ ": " ~ description }

method = { "GET" | "POST" | "PUT" | "DELETE" | "PATCH" }
path = { "/" ~ path_segment ~ ("/" ~ path_segment)* }
path_segment = @{ (ASCII_ALPHANUMERIC | "_" | ":")+ }

model_line = { "- " ~ (model_bold | model_simple) }
model_bold = { "**" ~ model_name ~ "**" ~ ": " ~ field_list }
model_simple = { model_name ~ ": " ~ field_list }
model_name = @{ ASCII_UPPERCASE ~ ASCII_ALPHANUMERIC* }

field_list = { field ~ (", " ~ field)* }
field = { field_name ~ " (" ~ field_type ~ (", " ~ constraint)* ~ ")" }
field_name = @{ ASCII_LOWercase ~ (ASCII_ALPHANUMERIC | "_")* }
field_type = { "String" | "Number" | "Integer" | "Boolean" | "Date" | "ObjectId" }
constraint = { "required" | "unique" | "optional" | default_value | reference }
default_value = { "default=" ~ ANY+ }
reference = { "ref=" ~ model_name }

config_line = { "- " ~ config_key ~ ": " ~ config_value }
config_key = { "Port" | "port" | "Host" | "host" }
config_value = @{ ASCII_DIGIT+ | ASCII_ALPHANUMERIC+ }

paragraph = { (!("- " | "##") ~ ANY)+ }

WHITESPACE = _{ " " | "\t" | "\n" }
COMMENT = _{ "<!--" ~ (!"-->" ~ ANY)* ~ "-->" }
```

**Rust:**
```rust
use pest::Parser;
use pest_derive::Parser;

#[derive(Parser)]
#[grammar = "spec_md.pest"]
struct SpecMdParser;

fn parse_spec_md(input: &str) -> Result<StructuredSpec, pest::error::Error<Rule>> {
    let mut pairs = SpecMdParser::parse(Rule::spec, input)?;
    
    let mut spec = StructuredSpec::default();
    
    for pair in pairs.next().unwrap().into_inner() {
        match pair.as_rule() {
            Rule::header => {
                let mut inner = pair.into_inner();
                spec.project_name = inner.next().unwrap().as_str().to_string();
                spec.project_description = inner.next().map(|p| p.as_str().to_string());
            }
            Rule::section => {
                let mut inner = pair.into_inner();
                let title = inner.next().unwrap().as_str();
                
                match title {
                    "API" | "Routes" => {
                        for line in inner {
                            if let Some(route) = extract_route(line) {
                                spec.routes.push(route);
                            }
                        }
                    }
                    "Models" => {
                        for line in inner {
                            if let Some(model) = extract_model(line) {
                                spec.models.push(model);
                            }
                        }
                    }
                    _ => {}
                }
            }
            _ => {}
        }
    }
    
    Ok(spec)
}
```

**Pros:**
- Clean grammar file separate from code
- Self-documenting
- Excellent error messages
- Grammar is the specification
- Handles ambiguity well

**Cons:**
- Build complexity (code generation)
- Runtime performance (PEG backtracking)
- Less flexible than combinators
- Learning curve for PEG syntax

---

## Option 4: LALRPOP (LR(1) Parser Generator)

**spec_md.lalrpop:**
```lalrpop
use crate::ast::{Spec, Route, Model, Field};

grammar;

pub Spec: Spec = {
    <header:Header> <sections:Section*> => Spec {
        project_name: header.0,
        description: header.1,
        routes: sections.iter().filter_map(|s| match s { Section::Routes(r) => Some(r), _ => None }).flatten().collect(),
        models: sections.iter().filter_map(|s| match s { Section::Models(m) => Some(m), _ => None }).flatten().collect(),
    }
};

Header: (String, Option<String>) = {
    "# " <name:ProjectName> "\n" <desc:Description?> => (name, desc)
};

ProjectName: String = <s:r"[\w-]+"> => s.to_string();

Description: String = <s:r"[^#].*"> => s.to_string();

Section: Section = {
    "## API\n" <routes:RouteLine*> => Section::Routes(routes),
    "## Models\n" <models:ModelLine*> => Section::Models(models),
    "## " <_title:Word> "\n" <_content:Line*> => Section::Other,
};

RouteLine: Route = {
    "- `" <method:Method> " " <path:Path> "`" <desc:RouteDesc> => Route { method, path, description: desc },
    "- " <method:Method> " " <path:Path> ": " <desc:Sentence> => Route { method, path, description: desc },
};

Method: String = {
    "GET" => "GET".to_string(),
    "POST" => "POST".to_string(),
    "PUT" => "PUT".to_string(),
    "DELETE" => "DELETE".to_string(),
};

Path: String = <s:r"/[\w/:]+"> => s.to_string();

RouteDesc: String = {
    " - " <s:Sentence> => s,
    ": " <s:Sentence> => s,
};

ModelLine: Model = {
    "- **" <name:ModelName> "**: " <fields:FieldList> => Model { name, fields },
};

ModelName: String = <s:r"[A-Z][a-zA-Z]+"> => s.to_string();

FieldList: Vec<Field> = <fields:Field*> => fields;

Field: Field = {
    <name:FieldName> " (" <ty:FieldType> <constraints:Constraint*> ")" => Field {
        name, field_type: ty, required: constraints.contains(&Constraint::Required),
    }
};

FieldName: String = <s:r"[a-z][a-zA-Z]+"> => s.to_string();
FieldType: String = <s:r"(String|Number|Integer|Boolean|Date|ObjectId)"> => s.to_string();

enum Section {
    Routes(Vec<Route>),
    Models(Vec<Model>),
    Other,
}
```

**Pros:**
- Fast LR(1) parsing
- Excellent error recovery
- Separates grammar from actions
- Industry-proven approach

**Cons:**
- Most complex setup
- LR(1) limitations (no ambiguous grammars)
- Steep learning curve
- Heavy build dependency

---

## Comparison

| Approach | Code Complexity | Performance | Error Messages | Maintainability | Our Use Case |
|----------|----------------|-------------|----------------|-----------------|--------------|
| **Hand-rolled** (current) | Low | Fastest | Poor | Poor | ✅ Works now |
| **Regex** | Medium | Medium | Poor | Medium | Good for simple patterns |
| **Nom** | High | Fast | Excellent | Good | Best for complex parsers |
| **Pest** | Medium | Medium | Excellent | Excellent | Best for readable grammars |
| **LALRPOP** | High | Fastest | Good | Good | Best for large languages |

---

## Recommendation

### Current: Stick with Hand-Rolled (for now)

Our grammar is simple enough (~6 patterns) that hand-rolled parsing is fine. The current implementation works and has zero dependencies.

### Future: Migrate to Pest

If we want to:
- Add more grammar rules (auth, middleware, validation)
- Have self-documenting grammar
- Better error messages for users
- Allow community contributions to grammar

Then **Pest** is the best choice:
- Grammar lives in `.pest` file
- Clear separation of concerns
- Good enough performance
- Easy to extend

### When to Use Nom

If we need:
- Zero-copy parsing (streaming large specs)
- Complex composition of small parsers
- Maximum performance
- Fine-grained control

---

## Example Migration to Pest

**Current (hand-rolled):**
```rust
fn parse_route_line(line: &str) -> Option<RouteSpec> {
    let content = line.trim_start_matches("- ").trim();
    if let Some(start) = content.find('`') {
        // ... 20 lines of manual extraction
    }
    None
}
```

**Future (Pest):**
```pest
// spec_md.pest
route_backtick = { "- `" ~ method ~ " " ~ path ~ "`" ~ (" - " | ": ") ~ description }
```

```rust
// Rust code
let pair = SpecMdParser::parse(Rule::route_backtick, line)?;
let route = extract_route(pair)?;
```

Much cleaner!
