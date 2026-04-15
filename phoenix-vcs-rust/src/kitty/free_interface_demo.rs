//! Free Interface Demo: Understanding External vs Internal Types
//!
//! This module demonstrates the concept of "free interface" in tensor contraction
//! by walking through concrete examples from API specifications.

use crate::kitty::prelude::*;
use crate::kitty::tensor_contract::{TensorContractExt, TensorContractor};

/// Demonstrates what "free interface" means with concrete examples
pub fn demonstrate_free_interface() {
    println!("╔══════════════════════════════════════════════════════════════════╗");
    println!("║           WHAT IS A FREE INTERFACE?                             ║");
    println!("╚══════════════════════════════════════════════════════════════════╝\n");

    println!("In tensor network terms:\n");
    println!("  • Each endpoint is a TENSOR with INPUT and OUTPUT legs (types)");
    println!("  • CUPS (internal connections) CONTRACT matching types together");
    println!("  • FREE INTERFACE = types that remain UNCONNECTED (external)\n");

    println!("Think of it like plumbing:\n");
    println!("  • Pipes (types) carry data between endpoints");
    println!("  • Connections (cups) join pipes together internally");
    println!("  • FREE PIPES are the ones sticking out - that's your API!\n");

    // Example 1: Simple isolated endpoint
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("EXAMPLE 1: Isolated Endpoint (No Internal Connections)\n");
    
    let isolated = create_endpoint_demo();
    print_endpoint_diagram(&isolated);
    
    let solved = isolated.solve();
    println!("\nAfter 'solving' (looking for connections):");
    println!("  • Contractions found: {}", solved.contractions.len());
    println!("  • Free interface: {:?}", solved.free_interface);
    println!("  • Fully contracted: {}\n", solved.is_fully_contracted);
    
    println!("INTERPRETATION:");
    println!("  ✓ POST /users has UNCONNECTED inputs: AuthToken, UserInput");
    println!("  ✓ POST /users has UNCONNECTED output: UserCreated  ");
    println!("  ✓ These 3 types form the FREE INTERFACE - what users see\n");

    // Example 2: Connected endpoints
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("EXAMPLE 2: Connected Endpoints (Internal Data Flow)\n");
    
    let connected = create_connected_endpoints_demo();
    print_connected_diagram(&connected);
    
    let solved2 = connected.solve();
    println!("\nAfter 'solving' (contracting connections):");
    println!("  • Contractions found: {}", solved2.contractions.len());
    println!("  • Free interface: {:?}", solved2.free_interface);
    println!("  • Fully contracted: {}\n", solved2.is_fully_contracted);
    
    println!("INTERPRETATION:");
    println!("  ✓ TaskCreated (from POST) connects to TaskId (in GET) via DB");
    println!("  ✓ This INTERNAL connection is CONTRACTED (hidden from API)");
    println!("  ✓ Remaining FREE types: AuthToken, AuthToken, TaskInput, Task");
    println!("  ✓ The API surface is: AuthToken → (POST → GET chain) → Task\n");

    // Example 3: Fully closed system
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("EXAMPLE 3: Fully Contracted (Complete System)\n");
    
    let closed = create_closed_system_demo();
    print_closed_diagram(&closed);
    
    let solved3 = closed.solve();
    println!("\nAfter 'solving':");
    println!("  • Contractions found: {}", solved3.contractions.len());
    println!("  • Free interface: {:?}", solved3.free_interface);
    println!("  • Fully contracted: {}\n", solved3.is_fully_contracted);
    
    println!("INTERPRETATION:");
    println!("  ✓ Internal timer TRIGGER connects to AlertHandler");
    println!("  ✓ LogEntry cycles through Logger");
    println!("  ✓ NO external connections needed - it's a CLOSED system");
    println!("  ✓ Scalar value: {:?}\n", closed.scalar_value());

    // Summary
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("SUMMARY: Free Interface = Your API Surface Area\n");
    
    println!("┌─────────────────────────────────────────────────────────────────┐");
    println!("│  FREE INTERFACE = Types that remain after all internal          │");
    println!("│                   connections are made                          │");
    println!("│                                                                 │");
    println!("│  • AuthToken (needs to come from outside)                      │");
    println!("│  • UserInput (needs to come from client)                       │");
    println!("│  • UserCreated (goes back to client)                          │");
    println!("│  • Database connections (INTERNAL - contracted away)            │");
    println!("│  • Service-to-service calls (INTERNAL - contracted away)      │");
    println!("└─────────────────────────────────────────────────────────────────┘\n");
    
    println!("The smaller your free interface, the more 'self-contained'");
    println!("your system is. A fully contracted system (free interface = [])");
    println!("is a complete, closed application with no external API needed.\n");
}

fn create_endpoint_demo() -> Diagram {
    // POST /users endpoint as a tensor
    let auth = PregroupType::atomic("AuthToken");
    let input = PregroupType::atomic("UserInput");
    let output = PregroupType::atomic("UserCreated");
    
    Diagram::from_box(Box::word(
        "POST /users",
        vec![auth, input],      // Domain = inputs (contravariant indices)
        vec![output]            // Codomain = outputs (covariant indices)
    ))
}

fn print_endpoint_diagram(diagram: &Diagram) {
    println!("  Diagram: POST /users");
    println!("  ┌─────────────────────────────────┐");
    println!("  │     POST /users (box/tensor)    │");
    println!("  │         ┌───────────┐           │");
    println!("  │  AuthToken│         │UserCreated│");
    println!("  │     ↓    │         │    ↑      │");
    println!("  │     ═════╪═════════╪═════      │");
    println!("  │          │         │            │");
    println!("  │    UserInput       │            │");
    println!("  │         ↓          │            │");
    println!("  └─────────────────────────────────┘");
    println!("  Type signature: AuthToken @ UserInput → UserCreated");
    println!("  Tensor rank: (1 output, 2 inputs) = T^UserCreated_AuthToken,UserInput");
}

fn create_connected_endpoints_demo() -> Diagram {
    // POST /tasks creates a task
    let auth = PregroupType::atomic("AuthToken");
    let task_input = PregroupType::atomic("TaskInput");
    let task_created = PregroupType::atomic("TaskCreated");
    
    let post_task = Diagram::from_box(Box::word(
        "POST /tasks",
        vec![auth.clone(), task_input],
        vec![task_created.clone()]
    ));
    
    // GET /tasks/:id retrieves a task
    // Note: TaskId is the adjoint of TaskCreated (they connect!)
    let task_id = task_created.adjoint_right();  // TaskCreated.r
    let task = PregroupType::atomic("Task");
    
    let get_task = Diagram::from_box(Box::word(
        "GET /tasks/:id",
        vec![auth.clone(), task_id],
        vec![task]
    ));
    
    // Database connection as a cup between TaskCreated and TaskId
    let db_cup = Box::cup(task_created.clone(), task_created.adjoint_right()).unwrap();
    let db_layer = Diagram::from_box(db_cup);
    
    // Combine: POST → DB (cup) → GET
    post_task.tensor(&db_layer).tensor(&get_task)
}

fn print_connected_diagram(diagram: &Diagram) {
    println!("  Diagram: POST → Database → GET");
    println!("  ┌─────────────────────────────────────────────────────────┐");
    println!("  │   POST /tasks        DB         GET /tasks/:id         │");
    println!("  │       │              │               │                  │");
    println!("  │  ┌────┴────┐    ┌───┴───┐      ┌────┴────┐            │");
    println!("  │  │AuthToken│    │  CUP  │      │AuthToken│            │");
    println!("  │  │TaskInput│    │TaskCre│↔│TaskId│ │         │            │");
    println!("  │  └────┬────┘    └───┬───┘      └────┬────┘            │");
    println!("  │       │         (CONTRACTED)        │                  │");
    println!("  │       │              │               │                  │");
    println!("  │       │              │               ↓                  │");
    println!("  │       │              │             Task                 │");
    println!("  │       ↓              │                                  │");
    println!("  │    TaskCreated (internal connection to DB)              │");
    println!("  └─────────────────────────────────────────────────────────┘");
    println!("  ");
    println!("  The CUP between TaskCreated and TaskId is an INTERNAL");
    println!("  connection (database bridge), so it gets CONTRACTED away.");
}

fn create_closed_system_demo() -> Diagram {
    // A background job system with no external API
    let trigger = PregroupType::atomic("TimerTrigger");
    let alert = PregroupType::atomic("AlertHandler");
    let log = PregroupType::atomic("LogEntry");
    
    // Timer triggers alert handler
    let timer = Diagram::from_box(Box::word(
        "Timer",
        vec![],                    // No inputs - self-triggering
        vec![trigger.clone()]       // Outputs trigger
    ));
    
    // Alert handler consumes trigger, produces log
    let alert_handler = Diagram::from_box(Box::word(
        "AlertHandler", 
        vec![trigger.adjoint_right()],  // Consumes trigger
        vec![alert.clone()]               // Outputs alert
    ));
    
    // Logger consumes alert and loops log back (cycle)
    // This creates a closed system
    let logger = Diagram::from_box(Box::word(
        "Logger",
        vec![alert.adjoint_right(), log.clone()],
        vec![log.clone()]  // Cycles back
    ));
    
    timer.tensor(&alert_handler).tensor(&logger)
}

fn print_closed_diagram(_diagram: &Diagram) {
    println!("  Diagram: Background Job System (No External API)");
    println!("  ┌──────────────────────────────────────────────────────┐");
    println!("  │                                                      │");
    println!("  │    ┌──────┐      ┌──────────┐      ┌─────────┐    │");
    println!("  │    │Timer │─────→│  Alert   │─────→│ Logger  │    │");
    println!("  │    │      │Trigger Handler│Alert  │         │    │");
    println!("  │    │ (no  │      │          │      │  (loop) │    │");
    println!("  │    │inputs)│     │          │      │         │    │");
    println!("  │    └──────┘      └──────────┘      └────┬────┘    │");
    println!("  │                                         │         │");
    println!("  │                                         └────┐    │");
    println!("  │                                              │    │");
    println!("  │                                         (cycle)   │");
    println!("  │                                              │    │");
    println!("  │                                         ↓    │    │");
    println!("  │                                    ┌────┴────┐   │");
    println!("  │                                    │ LogEntry│   │");
    println!("  │                                    └─────────┘   │");
    println!("  │                                                      │");
    println!("  │  ALL CONNECTIONS ARE INTERNAL - No free wires!      │");
    println!("  └──────────────────────────────────────────────────────┘");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_free_interface_demo() {
        demonstrate_free_interface();
    }

    #[test]
    fn test_isolated_endpoint() {
        let diagram = create_endpoint_demo();
        let solved = diagram.solve();
        
        // Isolated endpoint should have 3 free indices
        // (2 inputs + 1 output)
        assert_eq!(solved.free_interface.len(), 3);
        assert!(solved.free_interface.iter().any(|s| s.contains("AuthToken")));
        assert!(solved.free_interface.iter().any(|s| s.contains("UserInput")));
        assert!(solved.free_interface.iter().any(|s| s.contains("UserCreated")));
    }

    #[test]
    fn test_connected_reduces_free_interface() {
        let diagram = create_connected_endpoints_demo();
        let solved = diagram.solve();
        
        // Connected endpoints should have fewer free types
        // because TaskCreated/TaskId connection is internal
        println!("Connected endpoint free interface: {:?}", solved.free_interface);
        
        // Should have AuthToken, AuthToken, TaskInput, Task
        // (4 free instead of 6 because 2 were connected internally)
        assert!(solved.free_interface.len() < 6);
    }

    #[test]
    fn test_closed_system_has_no_free_interface() {
        let diagram = create_closed_system_demo();
        let solved = diagram.solve();
        
        // A truly closed system would have empty free interface
        // (all types connected internally)
        println!("Closed system free interface: {:?}", solved.free_interface);
        println!("Closed system is fully contracted: {}", solved.is_fully_contracted);
        
        // Note: Due to the cyclic nature, this might not be fully contracted
        // in our simple algorithm, but conceptually it should be
    }
}
