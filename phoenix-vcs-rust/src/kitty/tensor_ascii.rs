//! Tensor Network String Diagram ASCII Generator
//!
//! Renders tensor networks as categorical string diagrams with:
//! - Boxes (modules) with typed inputs/outputs
//! - Wires connecting inputs to outputs
//! - Cup contractions showing fulfillments
//! - Dangling wires (unfulfilled needs)

use crate::kitty::module_tensor_network::{ModuleTensorNetwork, ModuleBox, FulfillmentCup};

/// Generate a proper string diagram ASCII representation
/// 
/// Shows modules as boxes with their needs (left) and provides (right)
/// connected by wires showing the tensor network structure
pub fn tensor_network_to_ascii(network: &ModuleTensorNetwork) -> String {
    let mut result = String::new();
    
    // Header
    result.push_str("╔═══════════════════════════════════════════════════════════╗\n");
    result.push_str("║            TENSOR NETWORK STRING DIAGRAM                    ║\n");
    result.push_str("╚═══════════════════════════════════════════════════════════╝\n\n");
    
    // Show each module box with its interface
    for (id, module_box) in &network.module_boxes {
        result.push_str(&render_module_box(id, module_box));
        result.push('\n');
    }
    
    // Show connections (cups)
    if !network.cups.is_empty() {
        result.push_str("┌───────────────────────────────────────────────────────────┐\n");
        result.push_str("│                    WIRING (Cups)                            │\n");
        result.push_str("└───────────────────────────────────────────────────────────┘\n");
        
        for cup in &network.cups {
            result.push_str(&format!(
                "  {} ──[{}]──> {}\n",
                cup.provider,
                interface_to_emoji(&cup.interface),
                cup.consumer
            ));
        }
        result.push('\n');
    }
    
    // Show dangling needs
    let dangling: Vec<_> = network.module_boxes.iter()
        .filter(|(_, mb)| !mb.module.needs.is_empty())
        .flat_map(|(id, mb)| {
            mb.module.needs.iter().map(move |need| {
                (id.clone(), need.interface.clone())
            })
        })
        .filter(|(consumer, interface)| {
            // Check if this need is fulfilled
            !network.cups.iter().any(|cup| 
                cup.consumer == *consumer && cup.interface == *interface
            )
        })
        .collect();
    
    let dangling_count = dangling.len();
    
    if !dangling.is_empty() {
        result.push_str("┌───────────────────────────────────────────────────────────┐\n");
        result.push_str("│              DANGLING WIRES (Unfulfilled Needs)             │\n");
        result.push_str("└───────────────────────────────────────────────────────────┘\n");
        
        for (module, interface) in dangling {
            result.push_str(&format!(
                "  {} needs {} ⚠\n",
                module,
                interface_to_emoji(&interface)
            ));
        }
        result.push('\n');
    }
    
    // Summary
    result.push_str(&format!(
        "Modules: {} | Connections: {} | Dangling: {}\n",
        network.module_boxes.len(),
        network.cups.len(),
        dangling_count
    ));
    
    result
}

fn render_module_box(id: &str, module_box: &ModuleBox) -> String {
    let module = &module_box.module;
    
    // Get inputs (needs) and outputs (provides)
    let inputs: Vec<String> = module.needs.iter()
        .map(|n| format!("{}ᵢ", interface_to_emoji(&n.interface)))
        .collect();
    
    let outputs: Vec<String> = module.provides.iter()
        .map(|p| format!("{}ₒ", interface_to_emoji(&p.interface)))
        .collect();
    
    let name = if id.len() > 20 {
        format!("{}...", &id[..17])
    } else {
        id.to_string()
    };
    
    let input_str = if inputs.is_empty() {
        "  ∅  ".to_string()
    } else {
        inputs.join(" ")
    };
    
    let output_str = if outputs.is_empty() {
        "  ∅  ".to_string()
    } else {
        outputs.join(" ")
    };
    
    let box_width = name.len().max(20);
    let total_width = box_width + 4;
    
    let mut result = String::new();
    
    // Top with inputs
    result.push_str("     ");
    result.push_str(&input_str);
    result.push('\n');
    
    // Input connectors
    result.push_str("     ");
    for _ in 0..inputs.len().max(1) {
        result.push_str(" │  ");
    }
    result.push('\n');
    
    // Box top
    result.push_str("┌────");
    result.push_str(&"─".repeat(total_width));
    result.push_str("────┐\n");
    
    // Box content
    let padding = (total_width - name.len()) / 2;
    result.push_str("│    ");
    result.push_str(&" ".repeat(padding));
    result.push_str(&name);
    result.push_str(&" ".repeat(total_width - name.len() - padding));
    result.push_str("    │\n");
    
    // Box bottom
    result.push_str("└────");
    result.push_str(&"─".repeat(total_width));
    result.push_str("────┘\n");
    
    // Output connectors
    result.push_str("     ");
    for _ in 0..outputs.len().max(1) {
        result.push_str(" │  ");
    }
    result.push('\n');
    
    // Bottom with outputs
    result.push_str("     ");
    result.push_str(&output_str);
    result.push('\n');
    
    result
}

fn interface_to_emoji(interface: &crate::capability_fulfillment::CapabilityInterface) -> &'static str {
    use crate::capability_fulfillment::CapabilityInterface;
    
    match interface {
        CapabilityInterface::Database => "🗄️",
        CapabilityInterface::Cache => "⚡",
        CapabilityInterface::HttpServer => "🌐",
        CapabilityInterface::WebSocket => "📡",
        CapabilityInterface::Queue => "📬",
        CapabilityInterface::ObjectStorage => "📦",
        CapabilityInterface::Email => "📧",
        CapabilityInterface::Sms => "📱",
        CapabilityInterface::PushNotification => "🔔",
        CapabilityInterface::Search => "🔍",
        CapabilityInterface::Analytics => "📉",
        CapabilityInterface::Payment => "💳",
        CapabilityInterface::AuthProvider => "🔐",
        CapabilityInterface::Logging => "📝",
        CapabilityInterface::Metrics => "📊",
        CapabilityInterface::Tracing => "🔍",
        CapabilityInterface::WebComponents => "🎨",
        CapabilityInterface::ReactiveUI => "⚛️",
        CapabilityInterface::Scheduler => "⏰",
        CapabilityInterface::Custom(_) => "📦",
        _ => "❓",
    }
}

/// Generate a compact tensor view showing the full composition
pub fn tensor_to_compact_ascii(network: &ModuleTensorNetwork) -> String {
    let mut result = String::new();
    
    // Show as tensor product with composition
    result.push_str("Tensor: ");
    
    let module_names: Vec<_> = network.module_boxes.keys()
        .map(|k| k.split('-').next().unwrap_or(k))
        .collect();
    
    if module_names.len() <= 3 {
        result.push_str(&module_names.join(" ⊗ "));
    } else {
        result.push_str(&format!(
            "{} ⊗ {} ⊗ ... ⊗ {}",
            module_names.first().unwrap_or(&"?"),
            module_names.get(1).unwrap_or(&"?"),
            module_names.last().unwrap_or(&"?")
        ));
    }
    
    result.push_str("\n\n");
    
    // Show wiring as a circuit diagram
    result.push_str("Circuit:\n");
    
    for (i, cup) in network.cups.iter().enumerate() {
        let emoji = interface_to_emoji(&cup.interface);
        result.push_str(&format!(
            "  ┌─[{}]─┐     ┌─[{}]─┐\n",
            cup.provider, cup.consumer
        ));
        result.push_str(&format!(
            "  │  {}  ╰─────╯  {}  │\n",
            emoji, emoji
        ));
        if i < network.cups.len() - 1 {
            result.push_str("  │         │         │\n");
        }
    }
    
    result
}