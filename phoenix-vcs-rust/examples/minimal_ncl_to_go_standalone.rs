//! NCL → Go: 7-step panproto lift in ~40 lines
//! 
//! This is a CONCEPTUAL EXAMPLE showing the panproto API structure.
//! With the panproto feature enabled, the imports would be:
//!   use panproto_gat::Name; use panproto_inst::{WInstance, Node};
//!   use panproto_mig::{compile, lift_wtype, Migration};
//!   use panproto_schema::{Protocol, SchemaBuilder}; use std::collections::HashMap;

fn main() {
    // 1. NCL input: "add = fun a b => a + b"
    let ncl = r#"{ add = fun a b => a + b }"#;

    // 2-3. Build schemas: src=NCL, tgt=Go
    // With panproto:
    //   let src = SchemaBuilder::new(&Protocol::default())
    //       .vertex("add", "ncl", None).unwrap().build().unwrap();
    //   let tgt = SchemaBuilder::new(&Protocol::default())
    //       .vertex("add", "go", None).unwrap().build().unwrap();
    println!("2-3. Built schemas: src=NCL, tgt=Go");

    // 4. Build NCL instance (WInstance)
    //   let inst = WInstance::new(
    //       HashMap::from([(0, Node::new(0, Name::from("add")))]),
    //       vec![], vec![], 0, Name::from("add"));
    println!("4. Built NCL instance: {{ add: ncl }}");

    // 5. Migration: ncl → go
    //   let mig = Migration {
    //       vertex_map: HashMap::from([(Name::from("add"), Name::from("add")),
    //           (Name::from("ncl"), Name::from("go"))]),
    //       ..Default::default()
    //   };
    println!("5. Migration: {{ ncl → go }}");

    // 6. Compile + Lift
    //   let c = compile(&src, &tgt, &mig).unwrap();
    //   let _go = lift_wtype(&c, &src, &tgt, &inst).unwrap();
    println!("6. Compiled + Lifted: NCL instance → Go instance");

    // 7. Emit Go
    println!("7. Emit Go:\n");
    println!("package main\n");
    println!("// From NCL: {}", ncl);
    println!("func add(a int, b int) int {{");
    println!("    return a + b");
    println!("}}");
}
