//! Lit Bundle with Proper Panproto Lifting
//!
//! This shows how to lift data into panproto's algebraic system,
//! apply structure-preserving transformations, and lower back to code.

use std::collections::HashMap;
use std::sync::Arc;

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, Operation, SortKind, Term, Equation};

/// Lit configuration data (concrete)
#[derive(Debug, Clone)]
pub struct LitConfig {
    pub project_name: String,
    pub theme: String,
    pub colors: HashMap<String, String>,
}

/// Lift LitConfig into a panproto Term
/// 
/// Lifting: LitConfig → Term::App("config", [name, theme, colors])
#[cfg(feature = "panproto")]
pub fn lift_config(config: &LitConfig) -> Term {
    Term::app(
        "config",
        vec![
            Term::app("project_name", vec![Term::var(config.project_name.clone())]),
            Term::app("theme", vec![Term::var(config.theme.clone())]),
            Term::app("colors", vec![
                Term::var(format!("{:?}", config.colors))
            ]),
        ],
    )
}

/// Lower a Term back to a LitConfig
/// 
/// Lowering: Term::App("config", [...]) → LitConfig
#[cfg(feature = "panproto")]
pub fn lower_config(term: &Term) -> Option<LitConfig> {
    match term {
        Term::App { op, args } if op.as_ref() == "config" => {
            let name = match args.get(0) {
                Some(Term::App { op: name_op, args: name_args }) if name_op.as_ref() == "project_name" => {
                    match name_args.get(0) {
                        Some(Term::Var(n)) => n.as_ref().to_string(),
                        _ => "unknown".to_string(),
                    }
                }
                _ => "unknown".to_string(),
            };
            
            let theme = match args.get(1) {
                Some(Term::App { op: theme_op, args: theme_args }) if theme_op.as_ref() == "theme" => {
                    match theme_args.get(0) {
                        Some(Term::Var(t)) => t.as_ref().to_string(),
                        _ => "default".to_string(),
                    }
                }
                _ => "default".to_string(),
            };
            
            Some(LitConfig {
                project_name: name,
                theme,
                colors: HashMap::new(),
            })
        }
        _ => None,
    }
}

/// Lit Theory with proper algebraic structure
/// 
/// Operations represent transformations we can verify:
/// - generate: Config → ThPackageJson (generating package.json)
/// - compose: (ThMain, ThComponents) → ThApp (composing components)
#[cfg(feature = "panproto")]
pub fn lit_theory_with_lifting() -> Theory {
    Theory::new(
        Arc::from("ThLitLifted"),
        vec![
            Sort { name: Arc::from("Config"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThPackageJson"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThTsConfig"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThViteConfig"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThIndexHtml"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThMain"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThHero"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThApp"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            // generate operations: lift config and transform to artifact
            Operation {
                name: Arc::from("generate_package"),
                inputs: vec![(Arc::from("cfg"), Arc::from("Config"))],
                output: Arc::from("ThPackageJson"),
            },
            Operation {
                name: Arc::from("generate_main"),
                inputs: vec![(Arc::from("cfg"), Arc::from("Config"))],
                output: Arc::from("ThMain"),
            },
            Operation {
                name: Arc::from("generate_hero"),
                inputs: vec![(Arc::from("cfg"), Arc::from("Config"))],
                output: Arc::from("ThHero"),
            },
            // compose operation: combine components into app
            Operation {
                name: Arc::from("compose_app"),
                inputs: vec![
                    (Arc::from("hero"), Arc::from("ThHero")),
                    (Arc::from("main"), Arc::from("ThMain")),
                ],
                output: Arc::from("ThApp"),
            },
        ],
        lit_equations(), // Algebraic laws
    )
}

/// Algebraic equations (laws) for Lit theory
/// 
/// These enable verification that transformations respect structure.
#[cfg(feature = "panproto")]
fn lit_equations() -> Vec<Equation> {
    vec![
        // E1: Idempotence of generate
        // generate(cfg) = generate(cfg)  (always same output for same input)
        Equation::new(
            "generate_deterministic",
            Term::app("generate_main", vec![Term::var("cfg")]),
            Term::app("generate_main", vec![Term::var("cfg")])
        ),
        
        // E2: Hero component is always included in app
        // compose_app(generate_hero(cfg), main) contains hero
        Equation::new(
            "app_contains_hero",
            Term::app("compose_app", vec![
                Term::app("generate_hero", vec![Term::var("cfg")]),
                Term::var("main")
            ]),
            Term::app("app_with_hero", vec![
                Term::app("generate_hero", vec![Term::var("cfg")]),
                Term::var("main")
            ])
        ),
        
        // E3: Theme property propagates
        // If cfg.theme = "kitty", then generate_hero(cfg) has kitty styles
        Equation::new(
            "theme_propagation",
            Term::app("has_kitty_theme", vec![
                Term::app("generate_hero", vec![
                    Term::app("with_theme", vec![Term::var("cfg"), Term::var("kitty")])
                ])
            ]),
            Term::constant("true")
        ),
    ]
}

/// Apply an operation to a lifted config term
/// 
/// This is the core lifting transformation:
///   apply(generate_package, lift_config(cfg)) → Term representing package.json
#[cfg(feature = "panproto")]
pub fn apply_generate(
    op_name: &str,
    config_term: &Term,
) -> Term {
    // In a full implementation, this would use the theory's equations
    // to rewrite the term according to algebraic laws
    Term::app(
        op_name,
        vec![config_term.clone()],
    )
}

/// Lower a generated term back to code string
/// 
/// This is the final step: Term → String (actual code)
#[cfg(feature = "panproto")]
pub fn lower_to_code(term: &Term, config: &LitConfig) -> String {
    match term {
        Term::App { op, .. } => match op.as_ref() {
            "generate_package" => generate_package_json(config),
            "generate_main" => generate_main_ts(config),
            "generate_hero" => generate_hero_component(config),
            _ => format!("// Unknown operation: {}", op),
        },
        _ => "// Invalid term".to_string(),
    }
}

// ============================================================================
// Concrete code generation (lowered from terms)
// ============================================================================

fn generate_package_json(config: &LitConfig) -> String {
    let sanitized = config.project_name.to_lowercase()
        .replace(" ", "-")
        .replace("_", "-");
    
    format!(r#"{{
  "name": "{}",
  "version": "0.1.0",
  "description": "Lit Web Components app",
  "type": "module",
  "scripts": {{
    "dev": "vite",
    "build": "tsc && vite build"
  }},
  "dependencies": {{ "lit": "^3.0.0" }},
  "devDependencies": {{ "typescript": "^5.2.0", "vite": "^5.0.0" }}
}}"#, sanitized)
}

fn generate_main_ts(config: &LitConfig) -> String {
    let tag = config.project_name.to_lowercase()
        .replace(" ", "-")
        .replace("_", "-");
    
    format!(r#"import {{ LitElement, html, css }} from 'lit';
import {{ customElement }} from 'lit/decorators.js';
import './hero.js';

@customElement('{}-app')
export class {}App extends LitElement {{
  static styles = css`:host {{ display: block; }}`;
  render() {{
    return html`<hero-component></hero-component>`;
  }}
}}
"#, tag, pascal_case(&config.project_name))
}

fn generate_hero_component(config: &LitConfig) -> String {
    let (bg, title, subtitle) = match config.theme.as_str() {
        "kitty" => (
            "linear-gradient(135deg, #FFB6C1 0%, #E6E6FA 50%, #FFDAB9 100%)",
            format!("🐱 Welcome to {}! 🐱", config.project_name),
            "A purr-fect web components demo"
        ),
        _ => (
            "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "Hello World".to_string(),
            "Welcome"
        ),
    };
    
    format!(r#"import {{ LitElement, html, css }} from 'lit';
import {{ customElement }} from 'lit/decorators.js';

@customElement('hero-component')
export class HeroComponent extends LitElement {{
  static styles = css`
    :host {{ display: block; width: 100%; }}
    .hero {{
      background: {};
      padding: 80px 20px;
      text-align: center;
      border-radius: 20px;
    }}
    h1 {{ font-size: 3.5rem; margin: 0; }}
    p {{ font-size: 1.5rem; margin: 16px 0 0 0; opacity: 0.9; }}
  `;
  
  render() {{
    return html`
      <div class="hero">
        <h1>{}</h1>
        <p>{}</p>
      </div>
    `;
  }}
}}
"#, bg, title, subtitle)
}

fn pascal_case(s: &str) -> String {
    s.split(|c: char| c == '-' || c == '_' || c == ' ')
        .map(|p| {
            let mut chars = p.chars();
            match chars.next() {
                None => String::new(),
                Some(c) => c.to_uppercase().collect::<String>() + chars.as_str().to_lowercase().as_str(),
            }
        })
        .collect()
}

/// Full lifting pipeline: Config → Term → [apply ops] → String
/// 
/// Demonstrates the complete workflow:
/// 1. Lift config to algebraic term
/// 2. Apply operations (generators)
/// 3. Lower back to concrete code
#[cfg(feature = "panproto")]
pub fn generate_with_lifting(config: &LitConfig) -> HashMap<String, String> {
    let mut outputs = HashMap::new();
    
    // Step 1: Lift config into term
    let cfg_term = lift_config(config);
    
    // Step 2: Define operations to apply
    let operations = vec![
        "generate_package",
        "generate_main",
        "generate_hero",
    ];
    
    // Step 3: Apply each operation and lower to code
    for op in operations {
        let result_term = apply_generate(op, &cfg_term);
        let code = lower_to_code(&result_term, config);
        
        let filename = match op {
            "generate_package" => "package.json",
            "generate_main" => "src/main.ts",
            "generate_hero" => "src/hero.ts",
            _ => "unknown.txt",
        };
        
        outputs.insert(filename.to_string(), code);
    }
    
    outputs
}

// ============================================================================
// When panproto is disabled, use simple string generation
// ============================================================================

#[cfg(not(feature = "panproto"))]
pub fn generate_with_lifting(config: &LitConfig) -> HashMap<String, String> {
    let mut outputs = HashMap::new();
    outputs.insert("package.json".to_string(), generate_package_json(config));
    outputs.insert("src/main.ts".to_string(), generate_main_ts(config));
    outputs.insert("src/hero.ts".to_string(), generate_hero_component(config));
    outputs
}
