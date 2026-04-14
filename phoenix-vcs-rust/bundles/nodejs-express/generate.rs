// Node.js Express Bundle - Expr-Based Code Generation (Layer 4)
//
// Uses the panproto Expr layer for runtime code generation:
//   Config ──► Expr Evaluation ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;

/// Generate all files for the Node.js Express bundle using Expr-based generation
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    use crate::pipeline::expr_bundle::{parse_spec_to_config, nodejs_express_generator};
    
    // Parse spec into config
    let config = parse_spec_to_config(spec_content);
    
    // Use Expr-based generator
    nodejs_express_generator().generate(&config)
}
