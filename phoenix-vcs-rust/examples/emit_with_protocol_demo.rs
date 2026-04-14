//! Emit with Protocol Demo: Python → Go
//!
//! Demonstrates cross-protocol emission using panproto's schema
//! as an intermediate representation. Shows Python parsed to Schema,
//! then emitted as Go code (structural reconstruction, not translation).
//!
//! Workflow:
//!   1. Parse Python source file → Schema (language-agnostic AST)
//!   2. Emit Schema back to Python (roundtrip reconstruction)
//!   3. Attempt emit to other protocols (structural mapping)
//!
//! Important: emit_with_protocol does NOT translate between languages.
//! It reconstructs code using the target protocol's emitter. For true
//! cross-language generation, use panproto-project's Generator API.
//!
//! Usage:
//!   cargo run --example emit_with_protocol_demo --features panproto
//!
//! Requirements:
//!   - panproto feature must be enabled
//!   - protocols/example_component.py must exist

use panproto_parse::ParserRegistry;
use std::path::Path;

fn main() {
    println!("╔════════════════════════════════════════════════════════════════╗");
    println!("║  Python → Go via Schema (Cross-Protocol Emit)                  ║");
    println!("╚════════════════════════════════════════════════════════════════╝");
    println!();

    // Parse the example Python file
    let file_path = Path::new("protocols/example_component.py");
    
    if !file_path.exists() {
        eprintln!("❌ Error: {} not found", file_path.display());
        std::process::exit(1);
    }

    println!("🔧 Step 1: Reading {}...", file_path.display());
    let content = std::fs::read_to_string(file_path).expect("Failed to read file");
    println!("   Read {} bytes", content.len());
    println!();

    // Create registry
    println!("🔧 Step 2: Creating ParserRegistry with all language parsers...");
    let registry = ParserRegistry::new();
    println!("   Registry has {} parsers", registry.len());
    
    // Detect language
    let source_protocol = registry.detect_language(file_path)
        .expect("Could not detect language");
    println!("   Detected source protocol: {}", source_protocol);
    println!();

    // Parse file to Schema
    println!("🔧 Step 3: Parsing Python file to Schema (language-agnostic AST)...");
    let schema = registry.parse_file(file_path, content.as_bytes())
        .expect("Parse failed");
    println!("   Schema has {} vertices, {} edges", 
        schema.vertices.len(), 
        schema.edges.len()
    );
    println!();

    // Show first few vertices
    println!("   Schema vertex kinds:");
    let mut kinds: std::collections::HashMap<&str, usize> = std::collections::HashMap::new();
    for vertex in schema.vertices.values() {
        *kinds.entry(&vertex.kind).or_insert(0) += 1;
    }
    for (kind, count) in kinds.iter().take(8) {
        println!("     - {}: {}", kind, count);
    }
    if kinds.len() > 8 {
        println!("     ... and {} more kinds", kinds.len() - 8);
    }
    println!();

    // Step 4: Emit back to Python (roundtrip)
    println!("🔧 Step 4: Roundtrip - emit_with_protocol('python', schema)...");
    println!("────────────────────────────────────────────────────────────────");
    
    match registry.emit_with_protocol(source_protocol, &schema) {
        Ok(python_bytes) => {
            let python_code = String::from_utf8_lossy(&python_bytes);
            println!("✅ Python roundtrip ({} bytes):", python_bytes.len());
            println!();
            println!("```python");
            // Show first 20 lines
            for line in python_code.lines().take(20) {
                println!("{}", line);
            }
            if python_code.lines().count() > 20 {
                println!("... ({} more lines)", python_code.lines().count() - 20);
            }
            println!("```");
            
            // Save to file
            let output_path = "example_component_emitted.py";
            std::fs::write(output_path, &python_bytes)
                .expect("Failed to write output file");
            println!();
            println!("✅ Saved Python roundtrip to: {}", output_path);
        }
        Err(e) => {
            eprintln!("❌ Python emit failed: {:?}", e);
            std::process::exit(1);
        }
    }
    
    println!();
    println!();

    // Step 5: Specifically emit to Go
    println!("🔧 Step 5: Cross-protocol emit - emit_with_protocol('go', schema)...");
    println!("────────────────────────────────────────────────────────────────");
    
    // Try multiple target protocols
    let targets = ["python", "typescript", "javascript", "go", "rust", "ruby"];
    let mut successful = Vec::new();
    let mut failed = Vec::new();
    
    for target in &targets {
        match registry.emit_with_protocol(target, &schema) {
            Ok(bytes) => {
                println!("✅ {}: {} bytes emitted", target, bytes.len());
                successful.push((*target, bytes));
            }
            Err(_) => {
                failed.push(*target);
            }
        }
    }
    
    if !failed.is_empty() {
        println!("⚠️  Not available in this build: {}", failed.join(", "));
    }
    println!();
    
    // Specifically demonstrate Go emission
    if let Some(bytes) = successful.iter().find(|(l, _)| *l == "go").map(|(_, b)| b) {
        let code = String::from_utf8_lossy(bytes);
        println!("📄 Generated Go code:");
        println!("```go");
        for line in code.lines().take(40) {
            println!("{}", line);
        }
        if code.lines().count() > 40 {
            println!("... ({} more lines)", code.lines().count() - 40);
        }
        println!("```");
        
        // Save to file
        let output_path = "example_component_generated.go";
        std::fs::write(output_path, bytes)
            .expect("Failed to write output file");
        println!();
        println!("✅ Saved Go code to: {}", output_path);
    } else if let Some((lang, bytes)) = successful.iter().find(|(l, _)| *l != "python") {
        // Fallback to first available non-Python
        let code = String::from_utf8_lossy(bytes);
        println!("📄 Generated {} code (Go not available, showing {}):", lang, lang);
        println!("```{}", lang);
        for line in code.lines().take(30) {
            println!("{}", line);
        }
        if code.lines().count() > 30 {
            println!("... ({} more lines)", code.lines().count() - 30);
        }
        println!("```");
        
        let ext = match *lang {
            "typescript" => "ts",
            "javascript" => "js",
            "rust" => "rs",
            _ => "txt",
        };
        let output_path = format!("example_component_generated.{}", ext);
        std::fs::write(&output_path, bytes)
            .expect("Failed to write output file");
        println!();
        println!("✅ Saved {} code to: {}", lang, output_path);
    } else {
        println!("✅ Python roundtrip successful ({} bytes)", successful[0].1.len());
    }
    
    println!();
    println!("📊 PYTHON → GO CROSS-PROTOCOL EMIT SUMMARY");
    println!("────────────────────────────────────────────────────────────────");
    println!("  Source: Python file (protocols/example_component.py)");
    println!("  Intermediate: Schema (language-agnostic graph)");
    println!("  Target: Go (example_component_generated.go)");
    println!("  Available in this build: {:?}", successful.iter().map(|(l, _)| *l).collect::<Vec<_>>());
    println!();
    println!("  Key API:");
    println!("    let schema = registry.parse_file(path, content)?;");
    println!("    let ts   = registry.emit_with_protocol(\"typescript\", &schema)?;");
    println!("    let go   = registry.emit_with_protocol(\"go\", &schema)?;");
    println!("    let rust = registry.emit_with_protocol(\"rust\", &schema)?;");
    println!();
    println!("  Note: emit_with_protocol reconstructs code using target protocol emitter.");
    println!("  For idiomatic cross-language generation, use panproto-project::Generator");
    println!();
    println!("✅ Demo complete!");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cross_language_emit() {
        let registry = ParserRegistry::new();
        
        let file_path = Path::new("protocols/example_component.py");
        if !file_path.exists() {
            return; // Skip if file doesn't exist
        }
        
        let content = std::fs::read_to_string(file_path).unwrap();
        let schema = registry.parse_file(file_path, content.as_bytes()).unwrap();
        
        // Python roundtrip should always work
        let python = registry.emit_with_protocol("python", &schema);
        assert!(python.is_ok(), "Python emit failed");
        
        // Try other languages (may or may not be available)
        for target in ["typescript", "go", "rust", "ruby"] {
            let result = registry.emit_with_protocol(target, &schema);
            if result.is_err() {
                println!("{} not available in this build (expected)", target);
            }
        }
    }
}
