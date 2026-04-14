//! Why We Skip the Lens Layer
//!
//! Lens provides bidirectional data transformations (get/put semantics).
//! For code generation, we only need ONE direction: Config → Code.

// ============================================================================
// What Lens provides
// ============================================================================

/// Lens: Focus on a substructure (bidirectional)
/// 
/// get: Source → Target     (extract substructure)
/// put: Target → Source     (update substructure)
pub trait Lens<Source, Target> {
    fn get(&self, source: &Source) -> Target;
    fn put(&self, target: Target, source: &mut Source);
}

/// Use case: Round-trip transformations
/// 
/// Example: Database view + update
/// - View (get): Database → JSON for frontend
/// - Update (put): JSON from frontend → Database

// ============================================================================
// Why we don't need it for code generation
// ============================================================================

/// Code generation is UNIDIRECTIONAL:
/// 
/// Config ──► Code
///     │        │
///     │        │
///   JSON    TypeScript
///     │        │
///     ▼        ▼
///  "litty"  "import { LitElement..."
///
/// We NEVER go: Code ──► Config
/// (That would be parsing, not generation)

/// What we need instead:
/// 
/// 1. Schema (Layer 2): Graph structure
///    - Vertices = file types (package.json, main.ts)
///    - Edges = dependencies/imports
///    
/// 2. Expr (Layer 4): Code generation
///    - String construction
///    - Template filling
///    - Conditional logic (theme selection)

// ============================================================================
// Our current architecture (Lens skipped)
// ============================================================================

/// Working pipeline:
/// 
/// spec.ncl ──► TheoryCompiler::compile() ──► Schema ──► Expr ──► Code
///                 (GAT → Graph)              (Graph)   (Eval)  (String)
///
/// Direct bridge: SchemaCodeGenerator::generate() calls ExprCodeGenerator
/// 
/// No need for:
/// - Lens composition (Rust function composition works fine)
/// - Bidirectional updates (we only generate, never parse back)

// ============================================================================
// When WOULD we need Lens?
// ============================================================================

/// If we added features like:
/// 
/// 1. **Code editing**: Edit generated code → update config
///    - User edits main.ts → sync back to spec.ncl
///    - Would need: Code ──► Config transformation
/// 
/// 2. **Hot reload**: Watch code changes → regenerate
///    - Detect user edits to generated files
///    - Update theory/schema to reflect changes
/// 
/// 3. **Bidirectional sync**: Keep spec.ncl and code in sync
///    - Two sources of truth that must match
///    - Conflict resolution when they diverge
///
/// Currently: None of these are requirements.
/// Generated code is WRITE-ONCE from spec.ncl.

// ============================================================================
// Summary
// ============================================================================

/// | Layer | Purpose | Need for Codegen? | Status |
/// |-------|---------|-------------------|--------|
/// | GAT | Math foundation | ✅ Yes (structure) | Implemented |
/// | Schema | Graph structure | ✅ Yes (dependencies) | Implemented |
/// | **Lens** | **Bidirectional xform** | **❌ No** | **Skipped** |
/// | Expr | Runtime execution | ✅ Yes (templates) | Implemented |
///
/// Lens is powerful for round-trip transformations.
/// Codegen is one-way: Config → Schema → Expr → Code.
/// We skip straight from Schema to Expr.

pub const LENS_NOT_NEEDED: &str = "Code generation is unidirectional";
