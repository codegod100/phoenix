//! Elena Tensor Network Example
//! 
//! Demonstrates the full Kitty tensor network flow on the Elena Dashboard app.
//! 
//! Run with: `cargo run --example elena_tensor_network`

use phoenix_vcs::kitty::module_bridge::{KittyModuleParser, generate_from_spec};

fn main() {
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║     Elena Dashboard - Tensor Network Composition Demo       ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();

    // Read the Elena spec
    let spec = include_str!("../apps/elena/spec.md");
    
    println!("📄 Parsing spec.md...");
    println!("   Length: {} characters", spec.len());
    println!();

    // Step 1: Parse the spec
    let parsed = match KittyModuleParser::parse(spec) {
        Ok(p) => {
            println!("✅ Parsed successfully!");
            println!("   Found {} modules", p.modules.len());
            for module in &p.modules {
                println!("     • {} ({})", module.name, module.language);
            }
            println!();
            p
        }
        Err(e) => {
            eprintln!("❌ Parse failed: {}", e);
            std::process::exit(1);
        }
    };

    // Step 2: Build tensor network
    println!("🔗 Building tensor network...");
    let network = KittyModuleParser::to_tensor_network(&parsed);
    
    println!("   Modules in network: {}", network.module_boxes.len());
    println!("   Cups (connections): {}", network.cups.len());
    println!("   Diagram type: {:?}", network.diagram.is_empty());
    println!();

    // Step 3: Validate
    println!("🔍 Validating composition...");
    if network.is_valid() {
        println!("   ✅ All needs fulfilled (valid tensor network)");
    } else {
        println!("   ⚠️  Unfulfilled needs detected");
        let desc = KittyModuleParser::describe_composition(&network);
        println!("{}", desc);
    }
    println!();

    // Step 4: Contract to find connected components
    println!("🔄 Contracting tensor network...");
    match network.contract() {
        Ok(contracted) => {
            println!("   Connected components: {}", contracted.components.len());
            for (i, component) in contracted.components.iter().enumerate() {
                println!("     Component {}: {:?}", i + 1, component);
            }
            
            if !contracted.free_interfaces.is_empty() {
                println!("   Free interfaces (exposed to outside):");
                for (module, interface) in &contracted.free_interfaces {
                    println!("     • {}.{:?}", module, interface);
                }
            }
        }
        Err(e) => {
            println!("   ⚠️  Contraction error: {}", e);
        }
    }
    println!();

    // Step 5: Generate Mermaid diagram
    println!("📊 Mermaid Diagram:");
    println!("```mermaid");
    println!("{}", network.to_mermaid());
    println!("```");
    println!();

    // Step 6: Generate deployment config
    println!("🚀 Generating deployment configuration...");
    match generate_from_spec(spec) {
        Ok(deployment) => {
            println!("   Docker Compose config:");
            println!("{}", deployment);
        }
        Err(e) => {
            println!("   ⚠️  Generation error: {}", e);
        }
    }
    println!();

    // Summary
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║                        Summary                               ║");
    println!("╠══════════════════════════════════════════════════════════════╣");
    println!("║ Natural Language    → CCG Tree                               ║");
    println!("║ CCG Tree            → Pregroup Types                         ║");
    println!("║ Modules             → Boxes (domain/codomain)               ║");
    println!("║ Connections         → Cups (tensor contractions)            ║");
    println!("║ Valid Network       → Deployable System                     ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
}
