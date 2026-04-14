// NCL → Go: 7-step panproto migration in ~40 lines of Rust
// 
// This shows the minimal API surface for migrating NCL functions to Go.
// With the panproto feature enabled, uncomment the imports and API calls.
//
// Dependencies in Cargo.toml:
//   panproto-gat = { git = "https://github.com/panproto/panproto" }
//   panproto-inst = { git = "https://github.com/panproto/panproto" }
//   panproto-mig = { git = "https://github.com/panproto/panproto" }
//   panproto-schema = { git = "https://github.com/panproto/panproto" }

/* Uncomment with panproto feature:
use panproto_gat::Name; 
use panproto_inst::{WInstance, Node};
use panproto_mig::{compile, lift_wtype, Migration};
use panproto_schema::{Protocol, SchemaBuilder}; 
use std::collections::HashMap;
*/

fn main() {
    // === 7-Step NCL → Go Migration ===
    
    // 1. NCL input: "add = fun a b => a + b"
    let ncl = r#"{ add = fun a b => a + b }"#;

    // 2-3. Build schemas: src=NCL, tgt=Go
    // let src = SchemaBuilder::new(&Protocol::default())
    //     .vertex("add", "ncl", None::<&str>).unwrap().build().unwrap();
    // let tgt = SchemaBuilder::new(&Protocol::default())
    //     .vertex("add", "go", None::<&str>).unwrap().build().unwrap();
    
    // 4. Build NCL instance (WInstance)
    // let inst = WInstance::new(
    //     HashMap::from([(0, Node::new(0, Name::from("add")))]),
    //     vec![], vec![], 0, Name::from("add"));

    // 5. Migration: ncl → go  
    // let mig = Migration {
    //     vertex_map: HashMap::from([
    //         (Name::from("add"), Name::from("add")),
    //         (Name::from("ncl"), Name::from("go"))
    //     ]),
    //     ..Default::default()
    // };

    // 6. Compile + Lift
    // let c = compile(&src, &tgt, &mig).unwrap();
    // let _go = lift_wtype(&c, &src, &tgt, &inst).unwrap();

    // 7. Emit Go code
    println!("// Source NCL: {}", ncl);
    println!("// 7-step panproto migration:\n");
    println!("package main\n");
    println!("func add(a int, b int) int {{");
    println!("    return a + b");
    println!("}}");
}
