/* tslint:disable */
/* eslint-disable */

/**
 * Apply a single protolens step to a schema.
 *
 * The `protolens_bytes` are `MessagePack`-encoded protolens step
 * description with fields `name`, `source`, `target`, and
 * `complement_constructor`.
 *
 * Returns a handle to the resulting compiled lens (stored as
 * `MigrationWithSchemas`).
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails, the schema handle is
 * invalid, or instantiation fails.
 */
export function apply_protolens_step(protolens_bytes: Uint8Array, schema: number): number;

/**
 * Auto-generate a protolens chain between two schemas.
 *
 * Returns a handle to the `ProtolensChain` resource.
 *
 * # Errors
 *
 * Returns `JsError` if schema handles are invalid, no morphism is
 * found, or protolens generation fails.
 */
export function auto_generate_protolens(schema1: number, schema2: number): number;

/**
 * Auto-generate a protolens chain with a full hint specification.
 *
 * Accepts `MessagePack`-encoded [`panproto_lens_dsl::HintSpec`]:
 * `{ anchors: { src: tgt, ... }, constraints: [...] }`.
 *
 * Runs forward-chaining anchor derivation and constrained morphism search.
 *
 * Returns a handle to the generated [`ProtolensChain`].
 */
export function auto_generate_protolens_with_hint_spec(schema1: number, schema2: number, hint_spec_bytes: Uint8Array): number;

/**
 * Auto-generate a protolens with initial morphism hints.
 *
 * The `hints_bytes` are `MessagePack`-encoded `HashMap<String, String>`
 * mapping source vertex names to target vertex names. These are used
 * as seed correspondences for the morphism search, enabling alignment
 * across schemas with different NSID namespaces.
 *
 * Returns a handle to the generated `ProtolensChain`.
 *
 * # Errors
 *
 * Returns `JsError` if no morphism is found even with hints.
 */
export function auto_generate_protolens_with_hints(schema1: number, schema2: number, hints_bytes: Uint8Array): number;

/**
 * Build a schema from a protocol handle and `MessagePack`-encoded
 * builder operations.
 *
 * The `ops` bytes are a `MessagePack`-encoded `Vec<BuildOp>`.
 *
 * # Errors
 *
 * Returns `JsError` if the protocol handle is invalid, ops cannot
 * be deserialized, or schema building fails.
 */
export function build_schema(proto: number, ops: Uint8Array): number;

/**
 * Check staleness: does this data set's schema match the given schema?
 *
 * Returns `MessagePack`-encoded `{ stale: bool, data_schema_id: String, target_schema_id: String }`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid.
 */
export function check_dataset_staleness(dataset_handle: number, schema_handle: number): Uint8Array;

/**
 * Check existence conditions for a migration mapping between two schemas.
 *
 * `proto` is the handle to the protocol (obtained from
 * [`define_protocol`]).  `src` and `tgt` are schema handles.
 * Returns `MessagePack`-encoded
 * [`ExistenceReport`](panproto_core::mig::ExistenceReport).
 * The `mapping` bytes are a `MessagePack`-encoded [`Migration`].
 *
 * Note: this function always returns `Vec<u8>` (never errors at the
 * boundary) because the report itself encodes validity.
 */
export function check_existence(proto: number, src: number, tgt: number, mapping: Uint8Array): Uint8Array;

/**
 * Type-check a GAT term, verifying it is well-formed against a theory.
 *
 * The `expr_bytes` are `MessagePack`-encoded
 * `{ "term": Term, "theory_handle": u32, "context": Vec<(String, String)> }`
 * where context maps variable names to their sort names.
 *
 * Returns `MessagePack`-encoded `{ "well_formed": bool, "output_sort": String | null, "error": String | null }`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function check_expr(expr_bytes: Uint8Array): Uint8Array;

/**
 * Check the `GetPut` lens law on a test instance.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 */
export function check_get_put(migration: number, instance_bytes: Uint8Array): Uint8Array;

/**
 * Check both `GetPut` and `PutGet` lens laws on a test instance.
 *
 * The `instance` bytes are `MessagePack`-encoded `WInstance`.
 * Returns `MessagePack`-encoded result: `{ "holds": bool, "violation": string | null }`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 */
export function check_lens_laws(migration: number, instance_bytes: Uint8Array): Uint8Array;

/**
 * Check morphism validity. Returns `MessagePack` result.
 *
 * The `morphism` bytes are `MessagePack`-encoded `TheoryMorphism`.
 * Returns `MessagePack`-encoded result: `{ "valid": bool, "error": string | null }`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 */
export function check_morphism(morphism: Uint8Array, domain: number, codomain: number): Uint8Array;

/**
 * Check the `PutGet` lens law on a test instance.
 *
 * The `instance` bytes are `MessagePack`-encoded `WInstance`.
 * Internally calls get to obtain a view/complement, then verifies `PutGet`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 */
export function check_put_get(migration: number, instance_bytes: Uint8Array): Uint8Array;

/**
 * Classify a schema diff against a protocol, producing a compatibility report.
 *
 * The `diff_bytes` are `MessagePack`-encoded `SchemaDiff`.
 * Returns `MessagePack`-encoded [`CompatReport`](panproto_core::check::CompatReport)
 * with breaking and non-breaking change lists.
 */
export function classify_diff(proto: number, diff_bytes: Uint8Array): Uint8Array;

/**
 * Compute colimit of two theories over a shared base. Returns handle.
 *
 * # Errors
 *
 * Returns `JsError` if any handle is invalid or the colimit fails.
 */
export function colimit_theories(t1: number, t2: number, shared: number): number;

/**
 * Compile a migration for fast per-record application.
 *
 * The `mapping` bytes are a `MessagePack`-encoded [`Migration`].
 * Returns a handle to the compiled migration.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid, deserialization fails,
 * or compilation detects well-formedness violations.
 */
export function compile_migration(src: number, tgt: number, mapping: Uint8Array): number;

/**
 * Compose two lenses sequentially.
 *
 * Returns a handle to the composed lens.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid or composition fails.
 */
export function compose_lenses(l1: number, l2: number): number;

/**
 * Compose two compiled migrations into a single migration.
 *
 * Returns a handle to the composed compiled migration.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid or composition fails.
 */
export function compose_migrations(m1: number, m2: number): number;

/**
 * Compute the shortest distance between two schemas in a lens graph.
 *
 * The `graph_bytes` format is the same as for
 * [`preferred_conversion_path`]. Returns [`f64::INFINITY`] if no path
 * exists.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function conversion_distance(graph_bytes: Uint8Array, source_schema: string, target_schema: string): number;

/**
 * Create a theory from a `MessagePack` spec. Returns handle.
 *
 * The `spec` bytes are `MessagePack`-encoded [`Theory`].
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function create_theory(spec: Uint8Array): number;

/**
 * Register a protocol specification and return a handle.
 *
 * The `spec` bytes are MessagePack-encoded `Protocol` data.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function define_protocol(spec: Uint8Array): number;

/**
 * Diff two schemas, returning a `MessagePack`-encoded diff report.
 *
 * The result encodes vertex additions, removals, and edge changes
 * between the two schemas.
 */
export function diff_schemas(s1: number, s2: number): Uint8Array;

/**
 * Diff two schemas using the full `panproto-check` diff engine.
 *
 * Returns `MessagePack`-encoded [`SchemaDiff`](panproto_core::check::SchemaDiff)
 * with 20+ change categories including constraints, hyper-edges, variants,
 * recursion points, usage modes, spans, and nominal identity changes.
 */
export function diff_schemas_full(s1: number, s2: number): Uint8Array;

/**
 * Emit an instance to raw format bytes using a protocol codec.
 *
 * The `proto_name` is the protocol name. The `instance` is
 * `MessagePack`-encoded (W-type or Functor).
 *
 * # Errors
 *
 * Returns `JsError` if emission fails.
 */
export function emit_instance(registry: number, proto_name: Uint8Array, schema_handle: number, instance_bytes: Uint8Array): Uint8Array;

/**
 * Evaluate a GAT term with a variable environment and a theory.
 *
 * The `expr_bytes` are `MessagePack`-encoded [`Term`](panproto_core::gat::Term).
 * The `env_bytes` are `MessagePack`-encoded `Vec<(String, ModelValue)>` mapping
 * variable names to their values.
 * The `config_bytes` are `MessagePack`-encoded theory handle (`u32`) specifying
 * which theory's operations to evaluate against.
 *
 * Returns `MessagePack`-encoded [`ModelValue`](panproto_core::gat::ModelValue).
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails or evaluation encounters
 * an unbound variable or unknown operation.
 */
export function eval_expr(expr_bytes: Uint8Array, env_bytes: Uint8Array, config_bytes: Uint8Array): Uint8Array;

/**
 * Evaluate a functional expression with a given environment.
 *
 * The `expr_bytes` are `MessagePack`-encoded [`panproto_expr::Expr`].
 * The `env_bytes` are `MessagePack`-encoded `Vec<(String, panproto_expr::Literal)>`.
 * Returns the result as `MessagePack`-encoded [`panproto_expr::Literal`].
 *
 * This evaluates expressions from the pure functional language (lambda
 * calculus with builtins), as opposed to `eval_expr` which evaluates
 * GAT terms against a theory.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails or evaluation errors.
 */
export function eval_func_expr(expr_bytes: Uint8Array, env_bytes: Uint8Array): Uint8Array;

/**
 * Execute a declarative query against a W-type instance.
 *
 * The `query_bytes` are `MessagePack`-encoded [`inst::InstanceQuery`].
 * The `instance_bytes` are `MessagePack`-encoded [`WInstance`].
 * The `schema_bytes` are `MessagePack`-encoded [`Schema`]. If empty,
 * a minimal placeholder schema is used (sufficient for queries that
 * do not require schema-aware operations).
 * Returns `MessagePack`-encoded query results as a list of match objects,
 * each containing `node_id`, `anchor`, `value`, and `fields`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function execute_query(query_bytes: Uint8Array, instance_bytes: Uint8Array, schema_bytes: Uint8Array): Uint8Array;

/**
 * Factorize a theory morphism into elementary endofunctors.
 *
 * The `morphism_bytes` are `MessagePack`-encoded [`TheoryMorphism`](panproto_core::gat::TheoryMorphism).
 * `theory1` and `theory2` are handles to the domain and codomain theories.
 *
 * Returns `MessagePack`-encoded result with the factorization steps
 * (each step's name and transform description).
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails, handles are invalid,
 * or factorization fails.
 */
export function factorize_morphism(morphism_bytes: Uint8Array, theory1: number, theory2: number): Uint8Array;

/**
 * Compute the fiber of a compiled migration at a specific target anchor.
 *
 * Given a source instance and a migration, returns the IDs of all source
 * nodes whose remapped anchor equals the given `target_anchor`.
 *
 * Both `instance_bytes` and `migration_bytes` are `MessagePack`-encoded.
 * Returns `MessagePack`-encoded `Vec<u32>`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization or serialization fails.
 */
export function fiber_at(instance_bytes: Uint8Array, migration_bytes: Uint8Array, target_anchor: string): Uint8Array;

/**
 * Compute fibers for all target anchors simultaneously.
 *
 * Returns a map from target anchor name to source node IDs. Every source
 * node appears in exactly one fiber (the fibers partition the source).
 *
 * Both `instance_bytes` and `migration_bytes` are `MessagePack`-encoded.
 * Returns `MessagePack`-encoded `HashMap<String, Vec<u32>>`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization or serialization fails.
 */
export function fiber_decomposition_wasm(instance_bytes: Uint8Array, migration_bytes: Uint8Array): Uint8Array;

/**
 * Release a resource handle, making it available for reuse.
 */
export function free_handle(handle: number): void;

/**
 * Get a built-in protocol specification by name.
 *
 * Returns `MessagePack`-encoded `Protocol` spec.
 *
 * # Errors
 *
 * Returns `JsError` if the protocol name is unknown.
 */
export function get_builtin_protocol(name: Uint8Array): Uint8Array;

/**
 * Retrieve a data set as JSON bytes.
 *
 * Returns a JSON-encoded array of records.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or deserialization fails.
 */
export function get_dataset(dataset_handle: number): Uint8Array;

/**
 * Bidirectional get on a JSON record, returning JSON view + complement.
 *
 * # Errors
 *
 * Returns `JsError` if parsing, get, or serialization fails.
 */
export function get_json(migration: number, json_bytes: Uint8Array, root_vertex: string): Uint8Array;

/**
 * Get the complement from a forward migration result.
 *
 * The `complement_bytes` are the raw complement data stored during
 * forward migration. Returns `MessagePack`-encoded complement data.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function get_migration_complement(complement_bytes: Uint8Array): Uint8Array;

/**
 * Get the protocol definition from a handle as `MessagePack` bytes.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or the resource is not a protocol.
 */
export function get_protocol_definition(handle: number): Uint8Array;

/**
 * Bidirectional get: extract a view and complement from a record.
 *
 * The `record` bytes are a `MessagePack`-encoded [`WInstance`].
 * Returns `MessagePack`-encoded `{ view: WInstance, complement: Vec<u8> }`
 * where `complement` is the serialized [`Complement`] needed by `put_record`.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid, deserialization fails,
 * or the lens get operation fails.
 */
export function get_record(migration: number, record: Uint8Array): Uint8Array;

/**
 * Get the element count of an instance.
 *
 * The `instance_bytes` are `MessagePack`-encoded [`WInstance`].
 * Returns the number of nodes.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function instance_element_count(instance_bytes: Uint8Array): number;

/**
 * Convert a W-type instance to JSON bytes.
 *
 * The `instance_bytes` are `MessagePack`-encoded [`WInstance`].
 * Returns JSON bytes.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function instance_to_json(schema_handle: number, instance_bytes: Uint8Array): Uint8Array;

/**
 * Instantiate a protolens chain at a specific schema.
 *
 * Returns a handle to the resulting compiled lens (stored as
 * `MigrationWithSchemas`).
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or instantiation fails.
 */
export function instantiate_protolens(chain: number, schema: number): number;

/**
 * Invert a bijective migration.
 *
 * The `mapping` bytes are `MessagePack`-encoded `Migration`.
 * Returns `MessagePack`-encoded `Migration` (the inverse) on success,
 * or a `JsError` if the migration is not bijective.
 *
 * # Errors
 *
 * Returns `JsError` if the migration is not invertible.
 */
export function invert_migration(mapping: Uint8Array, src: number, tgt: number): Uint8Array;

/**
 * Parse JSON bytes into a W-type instance.
 *
 * Returns `MessagePack`-encoded [`WInstance`].
 *
 * # Errors
 *
 * Returns `JsError` if parsing fails.
 */
export function json_to_instance(schema_handle: number, json_bytes: Uint8Array): Uint8Array;

/**
 * Parse JSON bytes into a W-type instance with an explicit root vertex.
 *
 * If `root_vertex` is empty, the root is inferred: first tries
 * `schema.protocol`, then looks for the first `object` or `record` vertex.
 *
 * Returns `MessagePack`-encoded [`WInstance`].
 *
 * # Errors
 *
 * Returns `JsError` if parsing fails.
 */
export function json_to_instance_with_root(schema_handle: number, json_bytes: Uint8Array, root_vertex: string): Uint8Array;

/**
 * Lift a JSON record through a compiled migration, returning JSON.
 *
 * `root_vertex` specifies which schema vertex the JSON object maps to.
 * If empty, auto-detects (first "object" kind vertex).
 *
 * # Errors
 *
 * Returns `JsError` if parsing, lifting, or serialization fails.
 */
export function lift_json(migration: number, json_bytes: Uint8Array, root_vertex: string): Uint8Array;

/**
 * Apply a compiled migration to a W-type record.
 *
 * The `record` bytes are a `MessagePack`-encoded [`WInstance`].
 * Returns `MessagePack`-encoded migrated instance.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid, deserialization fails,
 * or the lift operation fails.
 */
export function lift_record(migration: number, record: Uint8Array): Uint8Array;

/**
 * List all built-in protocol names.
 *
 * Returns `MessagePack`-encoded `Vec<String>`.
 */
export function list_builtin_protocols(): Uint8Array;

/**
 * List all protocol names registered in an I/O registry.
 *
 * Returns `MessagePack`-encoded `Vec<String>`.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid.
 */
export function list_io_protocols(registry: number): Uint8Array;

/**
 * Migrate a data set backward using a stored complement.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid, lens generation fails,
 * or migration fails.
 */
export function migrate_dataset_backward(dataset_handle: number, complement_bytes: Uint8Array, src_schema: number, tgt_schema: number): number;

/**
 * Migrate a data set forward between two schemas.
 *
 * Auto-generates a lens between the source and target schemas,
 * then applies it to each record in the data set. Returns
 * `MessagePack`-encoded `{ data_handle: u32, complement_handle: u32 }`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid, lens generation fails,
 * or migration fails.
 */
export function migrate_dataset_forward(dataset_handle: number, src_schema: number, tgt_schema: number): Uint8Array;

/**
 * Migrate a model through a morphism. Returns `MessagePack` model.
 *
 * The `model` and `morphism` bytes are `MessagePack`-encoded
 * `Model` and `TheoryMorphism` respectively.
 *
 * Note: Only the sort interpretations can be serialized; operation
 * interpretations (functions) cannot cross the WASM boundary. This
 * returns a `MessagePack` result containing the reindexed sort
 * interpretations.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization or migration fails.
 */
export function migrate_model(model: Uint8Array, morphism: Uint8Array): Uint8Array;

/**
 * Run coverage analysis (dry-run migration).
 *
 * Tests how many instances from the source schema can be successfully
 * migrated to the target schema using the compiled migration.
 *
 * The `instances_bytes` are `MessagePack`-encoded `Vec<WInstance>`.
 * Returns `MessagePack`-encoded coverage report with counts and details.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid, deserialization fails, or
 * analysis fails.
 */
export function migration_coverage(compiled_handle: number, instances_bytes: Uint8Array, src_schema_handle: number, tgt_schema_handle: number): Uint8Array;

/**
 * Normalize a schema by collapsing reference chains.
 *
 * Returns a handle to the normalized schema.
 *
 * # Errors
 *
 * Returns `JsError` if the schema handle is invalid.
 */
export function normalize_schema(schema_handle: number): number;

/**
 * Parse an `ATProto` lexicon JSON document into a schema.
 *
 * Takes the raw JSON bytes of a lexicon file (e.g., `app.bsky.feed.post`
 * or `pub.layers.annotation.annotationLayer`) and returns a schema handle.
 * This is the generic entry point for any `ATProto`-compatible lexicon;
 * works for `Bluesky`, `RelationalText`, Layers, and any custom lexicon.
 *
 * # Errors
 *
 * Returns `JsError` if the JSON cannot be parsed or the lexicon is
 * not a valid `ATProto` Lexicon document.
 */
export function parse_atproto_lexicon(json_bytes: Uint8Array): number;

/**
 * Parse source text into a panproto expression.
 *
 * Tokenizes the input using the surface syntax lexer, then parses
 * the token stream into an `Expr` AST. Returns the expression as
 * `MessagePack` bytes.
 *
 * # Errors
 *
 * Returns `JsError` if tokenization or parsing fails.
 */
export function parse_expr(source: string): Uint8Array;

/**
 * Parse raw format bytes into an instance using a protocol codec.
 *
 * The `proto_name` is the protocol name (e.g., `b"atproto"`).
 * Returns `MessagePack`-encoded instance (W-type or Functor depending
 * on the protocol's native representation).
 *
 * # Errors
 *
 * Returns `JsError` if parsing fails, handles are invalid, or the
 * protocol is unknown.
 */
export function parse_instance(registry: number, proto_name: Uint8Array, schema_handle: number, input: Uint8Array): Uint8Array;

/**
 * Construct the internal hom schema `[S, T]`.
 *
 * For each source vertex in `S`, the hom schema contains choice vertices
 * and backward vertices encoding all possible structure-preserving maps
 * from `S` to `T`.
 *
 * Both `source_schema_bytes` and `target_schema_bytes` are
 * `MessagePack`-encoded [`Schema`](panproto_core::schema::Schema).
 * Returns `MessagePack`-encoded `Schema`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization or serialization fails.
 */
export function poly_hom(source_schema_bytes: Uint8Array, target_schema_bytes: Uint8Array): Uint8Array;

/**
 * Find the cheapest conversion path between two schemas in a lens graph.
 *
 * The `graph_bytes` are `MessagePack`-encoded `Vec<GraphEdge>`, where
 * each edge has `source`, `target`, and `chain` (a `MessagePack`-encoded
 * `ProtolensChain`).
 *
 * Returns `MessagePack`-encoded `{ cost: f64, steps: Vec<String> }` with
 * the total cost and the schema names along the shortest path. Returns an
 * error if no path exists.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails or no path exists.
 */
export function preferred_conversion_path(graph_bytes: Uint8Array, source_schema: string, target_schema: string): Uint8Array;

/**
 * Serialize a protolens chain to JSON.
 *
 * Returns JSON bytes describing each step in the chain (name,
 * source/target endofunctor names, complement type, lossless flag).
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or serialization fails.
 */
export function protolens_chain_to_json(chain: number): Uint8Array;

/**
 * Check applicability of a protolens chain against a schema.
 *
 * Returns `MessagePack`-encoded JSON: `{ "applicable": bool, "reasons": string[] }`.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid or serialization fails.
 */
export function protolens_check_applicability(chain: number, schema: number): Uint8Array;

/**
 * Get the complement spec for a protolens chain at a schema.
 *
 * Returns `MessagePack`-encoded [`ComplementSpec`](panproto_core::lens::ComplementSpec).
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or serialization fails.
 */
export function protolens_complement_spec(chain: number, schema: number): Uint8Array;

/**
 * Compose two protolens chains.
 *
 * Returns a handle to the composed `ProtolensChain`.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid.
 */
export function protolens_compose(chain1: number, chain2: number): number;

/**
 * Apply a protolens chain to a fleet of schemas.
 *
 * The `schema_handles` are slab handles to `Schema` resources.
 * Each schema's name is taken from its `protocol` field.
 *
 * Returns `MessagePack`-encoded fleet result:
 * `{ "applied": [name, ...], "skipped": [[name, [reasons]], ...] }`.
 *
 * # Errors
 *
 * Returns `JsError` if any handle is invalid or serialization fails.
 */
export function protolens_fleet(chain: number, schema_handles: Uint32Array): Uint8Array;

/**
 * Build a protolens chain from a diff spec.
 *
 * The `diff_bytes` are `MessagePack`-encoded [`DiffSpec`](panproto_core::lens::DiffSpec).
 * Returns a handle to the `ProtolensChain` resource.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails, handles are invalid,
 * or diff-to-protolens conversion fails.
 */
export function protolens_from_diff(diff_bytes: Uint8Array, schema1: number, schema2: number): number;

/**
 * Deserialize a protolens chain from JSON bytes.
 *
 * Returns a handle to the `ProtolensChain` resource.
 *
 * # Errors
 *
 * Returns `JsError` if the JSON is invalid.
 */
export function protolens_from_json(json_bytes: Uint8Array): number;

/**
 * Fuse a protolens chain into a single protolens.
 *
 * Composes all steps into a single step with a composite complement.
 * Returns a handle to a new `ProtolensChain` containing the fused step.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or the chain is empty.
 */
export function protolens_fuse(chain: number): number;

/**
 * Lift a protolens chain along a theory morphism.
 *
 * Given a chain and a `MessagePack`-encoded `TheoryMorphism`, produces
 * a new chain that operates on schemas of the codomain theory.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or deserialization fails.
 */
export function protolens_lift(chain: number, morphism_bytes: Uint8Array): number;

/**
 * Classify a protolens chain's optic kind.
 *
 * Analyzes the complement constructors in the chain to determine the
 * overall optic classification:
 * - `"iso"`: all steps are lossless (complement is empty)
 * - `"lens"`: some steps have `AddedElement` complements (data is added)
 * - `"prism"`: some steps have `DroppedSortData` or `DroppedOpData` (data is removed)
 * - `"affine"`: mix of added and dropped data
 * - `"traversal"`: composite complements spanning multiple elements
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid.
 */
export function protolens_optic_kind(chain_handle: number): string;

/**
 * Build a protolens chain from a pipeline of step specs.
 *
 * Takes `MessagePack`-encoded array of `ProtolensStepSpec` objects.
 * Returns a handle to the composed `ProtolensChain`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization or chain construction fails.
 */
export function protolens_pipeline(steps_bytes: Uint8Array): number;

/**
 * Simplify a protolens chain symbolically.
 *
 * Eliminates redundant steps (e.g., an `add_sort` followed by a
 * `drop_sort` of the same element, or consecutive renames that can
 * be fused). Returns a handle to the simplified chain.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid.
 */
export function protolens_simplify(chain_handle: number): number;

/**
 * Bidirectional put: restore from a JSON view + complement.
 *
 * # Errors
 *
 * Returns `JsError` if parsing, put, or serialization fails.
 */
export function put_json(migration: number, view_json_bytes: Uint8Array, complement: Uint8Array, root_vertex: string): Uint8Array;

/**
 * Restore a record from a view and complement (lens put direction).
 *
 * The `view` and `complement` bytes are `MessagePack`-encoded
 * [`WInstance`] and [`Complement`] respectively.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid, deserialization fails,
 * or the put operation fails.
 */
export function put_record(migration: number, view: Uint8Array, complement: Uint8Array): Uint8Array;

/**
 * Check refinement subsort relationship.
 *
 * Given a base sort and two sets of constraints (encoded as `MessagePack`
 * `Vec<(String, String)>` of `(sort, value)` pairs), determines whether
 * the refinement type defined by `constraints_a` is a subsort of the
 * refinement defined by `constraints_b`.
 *
 * Returns `true` if every constraint in `constraints_b` is also
 * satisfied by `constraints_a` (i.e., `A` refines at least as much as `B`).
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function refinement_subsort(base_sort: string, sub_constraints: Uint8Array, super_constraints: Uint8Array): boolean;

/**
 * Create an I/O protocol registry with all built-in protocol codecs.
 *
 * Returns a handle to the registry, which can be used with
 * [`parse_instance`] and [`emit_instance`].
 *
 * # Errors
 *
 * Returns `JsError` if registry creation fails.
 */
export function register_io_protocols(): number;

/**
 * Render a compatibility report as a JSON string.
 *
 * The `report_bytes` are `MessagePack`-encoded `CompatReport`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function report_json(report_bytes: Uint8Array): string;

/**
 * Render a compatibility report as human-readable text.
 *
 * The `report_bytes` are `MessagePack`-encoded `CompatReport`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function report_text(report_bytes: Uint8Array): string;

/**
 * Add a coercion to a schema.
 *
 * A coercion is encoded as a protolens step between two vertex kinds.
 * `from_kind` and `to_kind` identify the source and target vertex kinds.
 * `expr_bytes` are `MessagePack`-encoded [`Term`](panproto_core::gat::Term)
 * describing the coercion expression.
 *
 * Returns a handle to a new schema with the coercion applied
 * (via a generated protolens step).
 *
 * # Errors
 *
 * Returns `JsError` if the schema handle is invalid, deserialization fails,
 * or coercion construction fails.
 */
export function schema_add_coercion(schema_handle: number, from_kind: string, to_kind: string, expr_bytes: Uint8Array): number;

/**
 * Add a default value expression to a schema vertex.
 *
 * The `expr_bytes` are `MessagePack`-encoded
 * [`Value`](panproto_core::inst::value::Value) for the default.
 *
 * Returns a handle to a new schema with the default applied. Internally,
 * this builds a protolens `add_sort` step with the specified default value.
 *
 * # Errors
 *
 * Returns `JsError` if the schema handle is invalid, deserialization fails,
 * or the default cannot be applied.
 */
export function schema_add_default(schema_handle: number, vertex_name: string, expr_bytes: Uint8Array): number;

/**
 * Add a merger expression to a schema vertex.
 *
 * A merger defines how to combine two values for the same vertex during
 * a merge operation. The `expr_bytes` are `MessagePack`-encoded
 * `{ "strategy": String, "args": Vec<String> }`.
 *
 * Returns a handle to a new schema with the merger annotation added.
 *
 * # Errors
 *
 * Returns `JsError` if the schema handle is invalid, deserialization fails,
 * or the vertex does not exist.
 */
export function schema_add_merger(schema_handle: number, vertex_name: string, expr_bytes: Uint8Array): number;

/**
 * Add a conflict policy to a schema vertex.
 *
 * A conflict policy controls how conflicts are resolved during merge.
 * The `expr_bytes` are `MessagePack`-encoded `{ "policy": String }`.
 *
 * Returns a handle to a new schema with the policy annotation added.
 *
 * # Errors
 *
 * Returns `JsError` if the schema handle is invalid, deserialization fails,
 * or the vertex does not exist.
 */
export function schema_add_policy(schema_handle: number, vertex_name: string, expr_bytes: Uint8Array): number;

/**
 * Extract schema metadata from a schema handle.
 *
 * Returns `MessagePack`-encoded schema data including protocol name,
 * vertex IDs and kinds, edge sources/targets/kinds/names, and
 * constraint information. Used by the TypeScript SDK to populate
 * `SchemaData` for schemas built on the Rust side (e.g., via
 * [`parse_atproto_lexicon`]).
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid.
 */
export function schema_metadata(schema_handle: number): Uint8Array;

/**
 * Store a data set from JSON bytes, binding it to a schema.
 *
 * The `data_json` bytes are a JSON-encoded array of records. The schema
 * handle identifies which schema this data conforms to.
 *
 * Returns a handle to the stored `DataSet` resource.
 *
 * # Errors
 *
 * Returns `JsError` if the schema handle is invalid or JSON parsing fails.
 */
export function store_dataset(schema_handle: number, data_json: Uint8Array): number;

/**
 * Store a protocol definition in the slab and return a handle.
 *
 * The `protocol_bytes` are `MessagePack`-encoded `Protocol` data.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function store_protocol_definition(protocol_bytes: Uint8Array): number;

/**
 * Substitute a variable in a GAT term.
 *
 * The `expr_bytes` are `MessagePack`-encoded [`Term`](panproto_core::gat::Term).
 * `var_name` is the variable to substitute.
 * The `replacement_bytes` are `MessagePack`-encoded [`Term`](panproto_core::gat::Term).
 *
 * Returns `MessagePack`-encoded [`Term`](panproto_core::gat::Term).
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 */
export function substitute_expr(expr_bytes: Uint8Array, var_name: string, replacement_bytes: Uint8Array): Uint8Array;

/**
 * Auto-generate a symmetric lens from two schemas.
 *
 * Returns a handle to the `SymmetricLens` resource.
 *
 * # Errors
 *
 * Returns `JsError` if schema handles are invalid or symmetric lens
 * generation fails.
 */
export function symmetric_lens_from_schemas(schema1: number, schema2: number): number;

/**
 * Sync data through a symmetric lens.
 *
 * The `view` and `complement` bytes are `MessagePack`-encoded
 * [`WInstance`] and [`Complement`] respectively.
 * `direction` is `0` for left-to-right, `1` for right-to-left.
 *
 * Returns `MessagePack`-encoded synced `WInstance`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid, deserialization fails,
 * or synchronization fails.
 */
export function symmetric_lens_sync(sym_lens: number, view: Uint8Array, complement: Uint8Array, direction: number): Uint8Array;

/**
 * Validate a W-type instance against a schema.
 *
 * Returns `MessagePack`-encoded `Vec<String>` of validation error
 * messages. An empty vector means the instance is valid.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 */
export function validate_instance(schema_handle: number, instance_bytes: Uint8Array): Uint8Array;

/**
 * Validate a schema against a protocol's rules.
 *
 * Returns `MessagePack`-encoded `Vec<SerializableValidationError>`.
 * An empty vector means the schema is valid.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid.
 */
export function validate_schema(schema_handle: number, proto: number): Uint8Array;

/**
 * Stage a schema in a VCS repository.
 *
 * The `schema` handle must point to a Schema resource.
 * Returns `MessagePack`-encoded result with the schema object ID.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or staging fails.
 */
export function vcs_add(repo: number, schema: number): Uint8Array;

/**
 * Blame a vertex: find which commit introduced it.
 *
 * # Errors
 *
 * Returns `JsError` if the vertex is not found.
 */
export function vcs_blame(repo: number, vertex: Uint8Array): Uint8Array;

/**
 * Create a new branch in the VCS repository.
 *
 * # Errors
 *
 * Returns `JsError` if the repo handle is invalid or branch creation fails.
 */
export function vcs_branch(repo: number, name: Uint8Array): Uint8Array;

/**
 * Checkout a branch or commit in the VCS repository.
 *
 * # Errors
 *
 * Returns `JsError` if the target is not found.
 */
export function vcs_checkout(repo: number, target: Uint8Array): Uint8Array;

/**
 * Commit the staged schema in a VCS repository.
 *
 * Returns `MessagePack`-encoded commit ID string.
 *
 * # Errors
 *
 * Returns `JsError` if nothing is staged or commit fails.
 */
export function vcs_commit(repo: number, message: Uint8Array, author: Uint8Array): Uint8Array;

/**
 * Diff HEAD schema against a staged schema.
 *
 * Returns `MessagePack`-encoded diff result.
 *
 * # Errors
 *
 * Returns `JsError` if the repo handle is invalid or diff fails.
 */
export function vcs_diff(repo: number): Uint8Array;

/**
 * Initialize an in-memory VCS repository. Returns handle.
 *
 * The `protocol_name` is the UTF-8 protocol name bytes.
 */
export function vcs_init(_protocol_name: Uint8Array): number;

/**
 * Walk the commit log from HEAD.
 *
 * Returns `MessagePack`-encoded list of commit info.
 *
 * # Errors
 *
 * Returns `JsError` if the repo handle is invalid.
 */
export function vcs_log(repo: number, count: number): Uint8Array;

/**
 * Merge a branch into the current branch.
 *
 * # Errors
 *
 * Returns `JsError` if merge fails.
 */
export function vcs_merge(repo: number, branch: Uint8Array): Uint8Array;

/**
 * Stash the current working state.
 *
 * # Errors
 *
 * Returns `JsError` if stash fails.
 */
export function vcs_stash(repo: number): Uint8Array;

/**
 * Pop the most recent stash entry.
 *
 * # Errors
 *
 * Returns `JsError` if no stash exists.
 */
export function vcs_stash_pop(repo: number): Uint8Array;

/**
 * Get repository status.
 *
 * Returns `MessagePack`-encoded status info.
 *
 * # Errors
 *
 * Returns `JsError` if the repo handle is invalid.
 */
export function vcs_status(repo: number): Uint8Array;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly apply_protolens_step: (a: number, b: number, c: number, d: number) => void;
    readonly auto_generate_protolens: (a: number, b: number, c: number) => void;
    readonly auto_generate_protolens_with_hint_spec: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly auto_generate_protolens_with_hints: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly build_schema: (a: number, b: number, c: number, d: number) => void;
    readonly check_dataset_staleness: (a: number, b: number, c: number) => void;
    readonly check_existence: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly check_expr: (a: number, b: number, c: number) => void;
    readonly check_get_put: (a: number, b: number, c: number, d: number) => void;
    readonly check_lens_laws: (a: number, b: number, c: number, d: number) => void;
    readonly check_morphism: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly check_put_get: (a: number, b: number, c: number, d: number) => void;
    readonly classify_diff: (a: number, b: number, c: number, d: number) => void;
    readonly colimit_theories: (a: number, b: number, c: number, d: number) => void;
    readonly compile_migration: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly compose_lenses: (a: number, b: number, c: number) => void;
    readonly compose_migrations: (a: number, b: number, c: number) => void;
    readonly conversion_distance: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly create_theory: (a: number, b: number, c: number) => void;
    readonly define_protocol: (a: number, b: number, c: number) => void;
    readonly diff_schemas: (a: number, b: number, c: number) => void;
    readonly diff_schemas_full: (a: number, b: number, c: number) => void;
    readonly emit_instance: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly eval_expr: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly eval_func_expr: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly execute_query: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly factorize_morphism: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly fiber_at: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly fiber_decomposition_wasm: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly get_builtin_protocol: (a: number, b: number, c: number) => void;
    readonly get_dataset: (a: number, b: number) => void;
    readonly get_json: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly get_migration_complement: (a: number, b: number, c: number) => void;
    readonly get_protocol_definition: (a: number, b: number) => void;
    readonly get_record: (a: number, b: number, c: number, d: number) => void;
    readonly instance_element_count: (a: number, b: number, c: number) => void;
    readonly instance_to_json: (a: number, b: number, c: number, d: number) => void;
    readonly instantiate_protolens: (a: number, b: number, c: number) => void;
    readonly invert_migration: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly json_to_instance: (a: number, b: number, c: number, d: number) => void;
    readonly json_to_instance_with_root: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly lift_json: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly lift_record: (a: number, b: number, c: number, d: number) => void;
    readonly list_builtin_protocols: (a: number) => void;
    readonly list_io_protocols: (a: number, b: number) => void;
    readonly migrate_dataset_backward: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly migrate_dataset_forward: (a: number, b: number, c: number, d: number) => void;
    readonly migrate_model: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly migration_coverage: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly normalize_schema: (a: number, b: number) => void;
    readonly parse_atproto_lexicon: (a: number, b: number, c: number) => void;
    readonly parse_expr: (a: number, b: number, c: number) => void;
    readonly parse_instance: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly poly_hom: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly preferred_conversion_path: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly protolens_chain_to_json: (a: number, b: number) => void;
    readonly protolens_check_applicability: (a: number, b: number, c: number) => void;
    readonly protolens_complement_spec: (a: number, b: number, c: number) => void;
    readonly protolens_compose: (a: number, b: number, c: number) => void;
    readonly protolens_fleet: (a: number, b: number, c: number, d: number) => void;
    readonly protolens_from_diff: (a: number, b: number, c: number, d: number, e: number) => void;
    readonly protolens_from_json: (a: number, b: number, c: number) => void;
    readonly protolens_fuse: (a: number, b: number) => void;
    readonly protolens_lift: (a: number, b: number, c: number, d: number) => void;
    readonly protolens_optic_kind: (a: number, b: number) => void;
    readonly protolens_pipeline: (a: number, b: number, c: number) => void;
    readonly protolens_simplify: (a: number, b: number) => void;
    readonly put_json: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly put_record: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly refinement_subsort: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly register_io_protocols: () => number;
    readonly report_json: (a: number, b: number, c: number) => void;
    readonly report_text: (a: number, b: number, c: number) => void;
    readonly schema_add_coercion: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => void;
    readonly schema_add_default: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly schema_add_merger: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly schema_add_policy: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly schema_metadata: (a: number, b: number) => void;
    readonly store_dataset: (a: number, b: number, c: number, d: number) => void;
    readonly substitute_expr: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly symmetric_lens_from_schemas: (a: number, b: number, c: number) => void;
    readonly symmetric_lens_sync: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
    readonly validate_instance: (a: number, b: number, c: number, d: number) => void;
    readonly validate_schema: (a: number, b: number, c: number) => void;
    readonly vcs_add: (a: number, b: number, c: number) => void;
    readonly vcs_blame: (a: number, b: number, c: number, d: number) => void;
    readonly vcs_branch: (a: number, b: number, c: number, d: number) => void;
    readonly vcs_checkout: (a: number, b: number, c: number, d: number) => void;
    readonly vcs_commit: (a: number, b: number, c: number, d: number, e: number, f: number) => void;
    readonly vcs_diff: (a: number, b: number) => void;
    readonly vcs_init: (a: number, b: number) => number;
    readonly vcs_log: (a: number, b: number, c: number) => void;
    readonly vcs_merge: (a: number, b: number, c: number, d: number) => void;
    readonly vcs_stash: (a: number, b: number) => void;
    readonly vcs_stash_pop: (a: number, b: number) => void;
    readonly vcs_status: (a: number, b: number) => void;
    readonly free_handle: (a: number) => void;
    readonly store_protocol_definition: (a: number, b: number, c: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
    readonly __wbindgen_export3: (a: number, b: number, c: number, d: number) => number;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
