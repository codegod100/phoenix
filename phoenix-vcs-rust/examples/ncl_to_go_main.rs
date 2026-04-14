//! NCL to Go Function Converter Example - Binary
//!
//! Run with: cargo run --example ncl_to_go_main

mod ncl_to_go;

use ncl_to_go::{NclFunction, ncl_fn_to_go, generate_go_file};

fn main() {
    println!("NCL to Go Function Converter");
    println!("============================\n");

    let ncl_functions = vec![
        NclFunction {
            name: "add".to_string(),
            params: vec!["a".to_string(), "b".to_string()],
            body: "a + b".to_string(),
            doc: "Add two integers".to_string(),
            return_type: "int".to_string(),
        },
        NclFunction {
            name: "greet".to_string(),
            params: vec!["name".to_string()],
            body: "\"Hello, \" ++ name ++ \"!\"".to_string(),
            doc: "Greet a user by name".to_string(),
            return_type: "string".to_string(),
        },
        NclFunction {
            name: "max".to_string(),
            params: vec!["x".to_string(), "y".to_string()],
            body: "if x > y then x else y".to_string(),
            doc: "Return the maximum of two integers".to_string(),
            return_type: "int".to_string(),
        },
        NclFunction {
            name: "is_even".to_string(),
            params: vec!["n".to_string()],
            body: "n % 2 == 0".to_string(),
            doc: "Check if a number is even".to_string(),
            return_type: "bool".to_string(),
        },
        NclFunction {
            name: "factorial".to_string(),
            params: vec!["n".to_string()],
            body: "if n <= 1 then 1 else n * factorial(n - 1)".to_string(),
            doc: "Calculate factorial recursively".to_string(),
            return_type: "int".to_string(),
        },
    ];

    println!("Input NCL Functions:");
    println!("-------------------");
    for func in &ncl_functions {
        let params = func.params.join(", ");
        println!("  {}: fun {} => {}", func.name, params, func.body);
        println!("    Returns: {}", func.return_type);
    }

    let go_functions: Vec<_> = ncl_functions.iter()
        .map(ncl_fn_to_go)
        .collect();

    println!("\nConverted Go Signatures:");
    println!("----------------------");
    for func in &go_functions {
        let params_str = func.params.iter()
            .map(|p| format!("{} {}", p.name, p.go_type))
            .collect::<Vec<_>>()
            .join(", ");
        println!("  func {}({}) {}", func.name, params_str, func.return_type);
    }

    let go_source = generate_go_file("nclfuncs", &go_functions);

    println!("\nGenerated Go Source:");
    println!("-------------------");
    println!("{}", go_source);
}
