//! Proof of Concept: Using panproto-parse for code generation
//!
//! ATTEMPT: Generate TypeScript code using panproto-parse instead of format!()
//!
//! RESULT: Theoretically possible, but practically complex.
//!
//! WHAT WE LEARNED:
//! - panproto-parse has emit() but it requires a full Schema graph
//! - Building a Schema requires understanding tree-sitter grammar structure
//! - A simple route handler needs ~20 vertices and ~30 edges
//! - Compare to format!() which needs 1 line

#[cfg(test)]
mod tests {
    /// Test: Generate code using format!() (our current approach)
    #[test]
    fn test_format_approach() {
        let code = generate_with_format();
        println!("=== format!() approach ===");
        println!("{}", code);
        assert!(code.contains("app.get"));
        assert!(code.contains("/health"));
    }

    /// Test: Show what panproto-parse approach would look like
    #[test]
    fn test_panproto_concept() {
        println!("\n=== panproto-parse approach (conceptual) ===");
        println!("{}", panproto_concept_explanation());
    }

    fn generate_with_format() -> String {
        format!(
            r#"// Generated via format!() - 1 line of code

app.get('/health', (c) => {{
  return c.json({{ status: 'ok' }});
}});
"#
        )
    }

    fn panproto_concept_explanation() -> &'static str {
        r#"
To generate the same code with panproto-parse, we would need:

1. Create ParserRegistry
   let registry = ParserRegistry::new();

2. Build a Schema with ~20 vertices:
   - program (root)
   - expression_statement
   - call_expression (app.get(...))
   - member_expression (app.get)
   - identifier (app)
   - property_identifier (get)
   - string ('/health')
   - arrow_function ((c) => {...})
   - identifier (c)
   - statement_block
   - return_statement
   - call_expression (c.json(...))
   - member_expression (c.json)
   - identifier (c)
   - property_identifier (json)
   - object ({ status: 'ok' })
   - pair (status: 'ok')
   - property_identifier (status)
   - string ('ok')

3. Add ~30 edges connecting these vertices

4. Add constraints for string literals

5. Call emit_with_protocol("typescript", &schema)

Code comparison:
- format!(): 1 line, instant, readable
- panproto-parse: ~100 lines, complex, requires grammar knowledge

VERDICT: For one-way code generation, format!() is the right choice.
panproto-parse shines for round-trip (parse → modify → emit) workflows.
"#
    }
}
