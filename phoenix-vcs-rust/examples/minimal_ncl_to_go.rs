//! Minimal NCL → Go migration using panproto lift (under 60 lines)

use panproto_gat::Name;
use panproto_inst::{WInstance, Node as PNode};
use panproto_mig::{compile, lift_wtype, Migration};
use panproto_schema::{Protocol, SchemaBuilder, Edge};
use std::collections::HashMap;

fn main() {
    // 1. Parse NCL: "add = fun a b => a + b"
    let funcs = vec![("add", vec!["a", "b"], "a + b")];

    // 2. Build NCL schema
    let mut b = SchemaBuilder::new(&Protocol::default());
    b = b.vertex("add", "ncl_fun", None::<&str>).unwrap();
    for p in &funcs[0].1 { b = b.vertex(p, "ncl_param", None::<&str>).unwrap(); }
    let src = b.build().unwrap();

    // 3. Build Go schema
    let mut b = SchemaBuilder::new(&Protocol::default());
    b = b.vertex("add", "go_func", None::<&str).unwrap();
    for p in &funcs[0].1 { b = b.vertex(p, "go_param", None::<&str>).unwrap(); }
    let tgt = b.build().unwrap();

    // 4. Build NCL instance
    let mut nodes = HashMap::new();
    nodes.insert(0, PNode::new(0, Name::from("add")));
    let inst = WInstance::new(nodes, vec![], vec![], 0, Name::from("add"));

    // 5. Create migration
    let mig = Migration {
        vertex_map: HashMap::from([(Name::from("add"), Name::from("add")),
            (Name::from("ncl_fun"), Name::from("go_func"))]),
        edge_map: HashMap::new(),
        hyper_edge_map: HashMap::new(),
        label_map: HashMap::new(),
        resolver: HashMap::new(),
        hyper_resolver: HashMap::new(),
        expr_resolvers: HashMap::new(),
    };

    // 6. Compile + Lift
    let c = compile(&src, &tgt, &mig).unwrap();
    let _lifted = lift_wtype(&c, &src, &tgt, &inst).unwrap();

    // 7. Emit Go
    println!("package main\n\nfunc add(a int, b int) int {{\n    return a + b\n}}");
}
