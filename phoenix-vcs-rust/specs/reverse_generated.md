# Reverse Requirements

Generated from source code analysis.

## Requirement

- REQUIREMENT: Run the reverse pipeline
  <!-- Source: ./src/reverse.rs:81 -->
- REQUIREMENT: Extract code items from source files
  <!-- Source: ./src/reverse.rs:126 -->
- REQUIREMENT: Find the end of a function (heuristic based on indentation/braces)
  <!-- Source: ./src/reverse.rs:448 -->
- REQUIREMENT: Find the end of a Python function (heuristic based on indentation)
  <!-- Source: ./src/reverse.rs:472 -->
- REQUIREMENT: Extract parameters from a function signature line
  <!-- Source: ./src/reverse.rs:505 -->
- REQUIREMENT: Extract parameters from Python function
  <!-- Source: ./src/reverse.rs:529 -->
- REQUIREMENT: Extract return type from function signature
  <!-- Source: ./src/reverse.rs:548 -->
- REQUIREMENT: Group extracted items into logical domains/modules
  <!-- Source: ./src/reverse.rs:563 -->
- REQUIREMENT: Generate requirement clauses from grouped items
  <!-- Source: ./src/reverse.rs:623 -->
- REQUIREMENT: Format a requirement from a function signature
  <!-- Source: ./src/reverse.rs:665 -->
- REQUIREMENT: Write spec files from generated clauses
  <!-- Source: ./src/reverse.rs:741 -->
- REQUIREMENT: Count source files for statistics
  <!-- Source: ./src/reverse.rs:825 -->

## Definition

- DEFINITION: Options for reverse engineering
  <!-- Source: ./src/reverse.rs:21 -->
- DEFINITION: Reverse pipeline result
  <!-- Source: ./src/reverse.rs:48 -->

## Constraint

- CONSTRAINT: Determine the domain/category for an item
  <!-- Source: ./src/reverse.rs:581 -->
- CONSTRAINT: Determine clause type based on item characteristics
  <!-- Source: ./src/reverse.rs:706 -->

## Traceability

| Requirement | Source File | Line | Item |
|-------------|-------------|------|------|
| reverse_ReverseOptions | ./src/reverse.rs | 21 | `ReverseOptions` |
| reverse_ReverseResult | ./src/reverse.rs | 48 | `ReverseResult` |
| reverse_reverse_pipeline | ./src/reverse.rs | 81 | `reverse_pipeline` |
| reverse_extract_code_items | ./src/reverse.rs | 126 | `extract_code_items` |
| reverse_find_function_end | ./src/reverse.rs | 448 | `find_function_end` |
| reverse_find_function_end_python | ./src/reverse.rs | 472 | `find_function_end_python` |
| reverse_extract_parameters | ./src/reverse.rs | 505 | `extract_parameters` |
| reverse_extract_parameters_python | ./src/reverse.rs | 529 | `extract_parameters_python` |
| reverse_extract_return_type | ./src/reverse.rs | 548 | `extract_return_type` |
| reverse_group_into_domains | ./src/reverse.rs | 563 | `group_into_domains` |
| reverse_determine_domain | ./src/reverse.rs | 581 | `determine_domain` |
| reverse_generate_clauses | ./src/reverse.rs | 623 | `generate_clauses` |
| reverse_format_requirement_from_signature | ./src/reverse.rs | 665 | `format_requirement_from_signature` |
| reverse_determine_clause_type | ./src/reverse.rs | 706 | `determine_clause_type` |
| reverse_write_spec_files | ./src/reverse.rs | 741 | `write_spec_files` |
| reverse_count_source_files | ./src/reverse.rs | 825 | `count_source_files` |
