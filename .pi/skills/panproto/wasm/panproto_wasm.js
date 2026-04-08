/* @ts-self-types="./panproto_wasm.d.ts" */

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
 * @param {Uint8Array} protolens_bytes
 * @param {number} schema
 * @returns {number}
 */
export function apply_protolens_step(protolens_bytes, schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(protolens_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.apply_protolens_step(retptr, ptr0, len0, schema);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Auto-generate a protolens chain between two schemas.
 *
 * Returns a handle to the `ProtolensChain` resource.
 *
 * # Errors
 *
 * Returns `JsError` if schema handles are invalid, no morphism is
 * found, or protolens generation fails.
 * @param {number} schema1
 * @param {number} schema2
 * @returns {number}
 */
export function auto_generate_protolens(schema1, schema2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.auto_generate_protolens(retptr, schema1, schema2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Auto-generate a protolens chain with a full hint specification.
 *
 * Accepts `MessagePack`-encoded [`panproto_lens_dsl::HintSpec`]:
 * `{ anchors: { src: tgt, ... }, constraints: [...] }`.
 *
 * Runs forward-chaining anchor derivation and constrained morphism search.
 *
 * Returns a handle to the generated [`ProtolensChain`].
 * @param {number} schema1
 * @param {number} schema2
 * @param {Uint8Array} hint_spec_bytes
 * @returns {number}
 */
export function auto_generate_protolens_with_hint_spec(schema1, schema2, hint_spec_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(hint_spec_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.auto_generate_protolens_with_hint_spec(retptr, schema1, schema2, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} schema1
 * @param {number} schema2
 * @param {Uint8Array} hints_bytes
 * @returns {number}
 */
export function auto_generate_protolens_with_hints(schema1, schema2, hints_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(hints_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.auto_generate_protolens_with_hints(retptr, schema1, schema2, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} proto
 * @param {Uint8Array} ops
 * @returns {number}
 */
export function build_schema(proto, ops) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(ops, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.build_schema(retptr, proto, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Check staleness: does this data set's schema match the given schema?
 *
 * Returns `MessagePack`-encoded `{ stale: bool, data_schema_id: String, target_schema_id: String }`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid.
 * @param {number} dataset_handle
 * @param {number} schema_handle
 * @returns {Uint8Array}
 */
export function check_dataset_staleness(dataset_handle, schema_handle) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.check_dataset_staleness(retptr, dataset_handle, schema_handle);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} proto
 * @param {number} src
 * @param {number} tgt
 * @param {Uint8Array} mapping
 * @returns {Uint8Array}
 */
export function check_existence(proto, src, tgt, mapping) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(mapping, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.check_existence(retptr, proto, src, tgt, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} expr_bytes
 * @returns {Uint8Array}
 */
export function check_expr(expr_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(expr_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.check_expr(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Check the `GetPut` lens law on a test instance.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 * @param {number} migration
 * @param {Uint8Array} instance_bytes
 * @returns {Uint8Array}
 */
export function check_get_put(migration, instance_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.check_get_put(retptr, migration, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Check both `GetPut` and `PutGet` lens laws on a test instance.
 *
 * The `instance` bytes are `MessagePack`-encoded `WInstance`.
 * Returns `MessagePack`-encoded result: `{ "holds": bool, "violation": string | null }`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 * @param {number} migration
 * @param {Uint8Array} instance_bytes
 * @returns {Uint8Array}
 */
export function check_lens_laws(migration, instance_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.check_lens_laws(retptr, migration, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Check morphism validity. Returns `MessagePack` result.
 *
 * The `morphism` bytes are `MessagePack`-encoded `TheoryMorphism`.
 * Returns `MessagePack`-encoded result: `{ "valid": bool, "error": string | null }`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 * @param {Uint8Array} morphism
 * @param {number} domain
 * @param {number} codomain
 * @returns {Uint8Array}
 */
export function check_morphism(morphism, domain, codomain) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(morphism, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.check_morphism(retptr, ptr0, len0, domain, codomain);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Check the `PutGet` lens law on a test instance.
 *
 * The `instance` bytes are `MessagePack`-encoded `WInstance`.
 * Internally calls get to obtain a view/complement, then verifies `PutGet`.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 * @param {number} migration
 * @param {Uint8Array} instance_bytes
 * @returns {Uint8Array}
 */
export function check_put_get(migration, instance_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.check_put_get(retptr, migration, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Classify a schema diff against a protocol, producing a compatibility report.
 *
 * The `diff_bytes` are `MessagePack`-encoded `SchemaDiff`.
 * Returns `MessagePack`-encoded [`CompatReport`](panproto_core::check::CompatReport)
 * with breaking and non-breaking change lists.
 * @param {number} proto
 * @param {Uint8Array} diff_bytes
 * @returns {Uint8Array}
 */
export function classify_diff(proto, diff_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(diff_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.classify_diff(retptr, proto, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Compute colimit of two theories over a shared base. Returns handle.
 *
 * # Errors
 *
 * Returns `JsError` if any handle is invalid or the colimit fails.
 * @param {number} t1
 * @param {number} t2
 * @param {number} shared
 * @returns {number}
 */
export function colimit_theories(t1, t2, shared) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.colimit_theories(retptr, t1, t2, shared);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} src
 * @param {number} tgt
 * @param {Uint8Array} mapping
 * @returns {number}
 */
export function compile_migration(src, tgt, mapping) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(mapping, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.compile_migration(retptr, src, tgt, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Compose two lenses sequentially.
 *
 * Returns a handle to the composed lens.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid or composition fails.
 * @param {number} l1
 * @param {number} l2
 * @returns {number}
 */
export function compose_lenses(l1, l2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.compose_lenses(retptr, l1, l2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Compose two compiled migrations into a single migration.
 *
 * Returns a handle to the composed compiled migration.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid or composition fails.
 * @param {number} m1
 * @param {number} m2
 * @returns {number}
 */
export function compose_migrations(m1, m2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.compose_migrations(retptr, m1, m2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} graph_bytes
 * @param {string} source_schema
 * @param {string} target_schema
 * @returns {number}
 */
export function conversion_distance(graph_bytes, source_schema, target_schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(graph_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(source_schema, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(target_schema, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len2 = WASM_VECTOR_LEN;
        wasm.conversion_distance(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getFloat64(retptr + 8 * 0, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        return r0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Create a theory from a `MessagePack` spec. Returns handle.
 *
 * The `spec` bytes are `MessagePack`-encoded [`Theory`].
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 * @param {Uint8Array} spec
 * @returns {number}
 */
export function create_theory(spec) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(spec, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.create_theory(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Register a protocol specification and return a handle.
 *
 * The `spec` bytes are MessagePack-encoded `Protocol` data.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 * @param {Uint8Array} spec
 * @returns {number}
 */
export function define_protocol(spec) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(spec, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.define_protocol(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Diff two schemas, returning a `MessagePack`-encoded diff report.
 *
 * The result encodes vertex additions, removals, and edge changes
 * between the two schemas.
 * @param {number} s1
 * @param {number} s2
 * @returns {Uint8Array}
 */
export function diff_schemas(s1, s2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.diff_schemas(retptr, s1, s2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Diff two schemas using the full `panproto-check` diff engine.
 *
 * Returns `MessagePack`-encoded [`SchemaDiff`](panproto_core::check::SchemaDiff)
 * with 20+ change categories including constraints, hyper-edges, variants,
 * recursion points, usage modes, spans, and nominal identity changes.
 * @param {number} s1
 * @param {number} s2
 * @returns {Uint8Array}
 */
export function diff_schemas_full(s1, s2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.diff_schemas_full(retptr, s1, s2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Emit an instance to raw format bytes using a protocol codec.
 *
 * The `proto_name` is the protocol name. The `instance` is
 * `MessagePack`-encoded (W-type or Functor).
 *
 * # Errors
 *
 * Returns `JsError` if emission fails.
 * @param {number} registry
 * @param {Uint8Array} proto_name
 * @param {number} schema_handle
 * @param {Uint8Array} instance_bytes
 * @returns {Uint8Array}
 */
export function emit_instance(registry, proto_name, schema_handle, instance_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(proto_name, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.emit_instance(retptr, registry, ptr0, len0, schema_handle, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} expr_bytes
 * @param {Uint8Array} env_bytes
 * @param {Uint8Array} config_bytes
 * @returns {Uint8Array}
 */
export function eval_expr(expr_bytes, env_bytes, config_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(expr_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(env_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(config_bytes, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.eval_expr(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} expr_bytes
 * @param {Uint8Array} env_bytes
 * @returns {Uint8Array}
 */
export function eval_func_expr(expr_bytes, env_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(expr_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(env_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.eval_func_expr(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} query_bytes
 * @param {Uint8Array} instance_bytes
 * @param {Uint8Array} schema_bytes
 * @returns {Uint8Array}
 */
export function execute_query(query_bytes, instance_bytes, schema_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(query_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(schema_bytes, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.execute_query(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} morphism_bytes
 * @param {number} theory1
 * @param {number} theory2
 * @returns {Uint8Array}
 */
export function factorize_morphism(morphism_bytes, theory1, theory2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(morphism_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.factorize_morphism(retptr, ptr0, len0, theory1, theory2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} instance_bytes
 * @param {Uint8Array} migration_bytes
 * @param {string} target_anchor
 * @returns {Uint8Array}
 */
export function fiber_at(instance_bytes, migration_bytes, target_anchor) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(migration_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(target_anchor, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len2 = WASM_VECTOR_LEN;
        wasm.fiber_at(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} instance_bytes
 * @param {Uint8Array} migration_bytes
 * @returns {Uint8Array}
 */
export function fiber_decomposition_wasm(instance_bytes, migration_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(migration_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.fiber_decomposition_wasm(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Release a resource handle, making it available for reuse.
 * @param {number} handle
 */
export function free_handle(handle) {
    wasm.free_handle(handle);
}

/**
 * Get a built-in protocol specification by name.
 *
 * Returns `MessagePack`-encoded `Protocol` spec.
 *
 * # Errors
 *
 * Returns `JsError` if the protocol name is unknown.
 * @param {Uint8Array} name
 * @returns {Uint8Array}
 */
export function get_builtin_protocol(name) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(name, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.get_builtin_protocol(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Retrieve a data set as JSON bytes.
 *
 * Returns a JSON-encoded array of records.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or deserialization fails.
 * @param {number} dataset_handle
 * @returns {Uint8Array}
 */
export function get_dataset(dataset_handle) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.get_dataset(retptr, dataset_handle);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Bidirectional get on a JSON record, returning JSON view + complement.
 *
 * # Errors
 *
 * Returns `JsError` if parsing, get, or serialization fails.
 * @param {number} migration
 * @param {Uint8Array} json_bytes
 * @param {string} root_vertex
 * @returns {Uint8Array}
 */
export function get_json(migration, json_bytes, root_vertex) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(json_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(root_vertex, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        wasm.get_json(retptr, migration, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Get the complement from a forward migration result.
 *
 * The `complement_bytes` are the raw complement data stored during
 * forward migration. Returns `MessagePack`-encoded complement data.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 * @param {Uint8Array} complement_bytes
 * @returns {Uint8Array}
 */
export function get_migration_complement(complement_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(complement_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.get_migration_complement(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Get the protocol definition from a handle as `MessagePack` bytes.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or the resource is not a protocol.
 * @param {number} handle
 * @returns {Uint8Array}
 */
export function get_protocol_definition(handle) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.get_protocol_definition(retptr, handle);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} migration
 * @param {Uint8Array} record
 * @returns {Uint8Array}
 */
export function get_record(migration, record) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(record, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.get_record(retptr, migration, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Get the element count of an instance.
 *
 * The `instance_bytes` are `MessagePack`-encoded [`WInstance`].
 * Returns the number of nodes.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 * @param {Uint8Array} instance_bytes
 * @returns {number}
 */
export function instance_element_count(instance_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.instance_element_count(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Convert a W-type instance to JSON bytes.
 *
 * The `instance_bytes` are `MessagePack`-encoded [`WInstance`].
 * Returns JSON bytes.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 * @param {number} schema_handle
 * @param {Uint8Array} instance_bytes
 * @returns {Uint8Array}
 */
export function instance_to_json(schema_handle, instance_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.instance_to_json(retptr, schema_handle, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Instantiate a protolens chain at a specific schema.
 *
 * Returns a handle to the resulting compiled lens (stored as
 * `MigrationWithSchemas`).
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or instantiation fails.
 * @param {number} chain
 * @param {number} schema
 * @returns {number}
 */
export function instantiate_protolens(chain, schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.instantiate_protolens(retptr, chain, schema);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} mapping
 * @param {number} src
 * @param {number} tgt
 * @returns {Uint8Array}
 */
export function invert_migration(mapping, src, tgt) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(mapping, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.invert_migration(retptr, ptr0, len0, src, tgt);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Parse JSON bytes into a W-type instance.
 *
 * Returns `MessagePack`-encoded [`WInstance`].
 *
 * # Errors
 *
 * Returns `JsError` if parsing fails.
 * @param {number} schema_handle
 * @param {Uint8Array} json_bytes
 * @returns {Uint8Array}
 */
export function json_to_instance(schema_handle, json_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(json_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.json_to_instance(retptr, schema_handle, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} schema_handle
 * @param {Uint8Array} json_bytes
 * @param {string} root_vertex
 * @returns {Uint8Array}
 */
export function json_to_instance_with_root(schema_handle, json_bytes, root_vertex) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(json_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(root_vertex, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        wasm.json_to_instance_with_root(retptr, schema_handle, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Lift a JSON record through a compiled migration, returning JSON.
 *
 * `root_vertex` specifies which schema vertex the JSON object maps to.
 * If empty, auto-detects (first "object" kind vertex).
 *
 * # Errors
 *
 * Returns `JsError` if parsing, lifting, or serialization fails.
 * @param {number} migration
 * @param {Uint8Array} json_bytes
 * @param {string} root_vertex
 * @returns {Uint8Array}
 */
export function lift_json(migration, json_bytes, root_vertex) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(json_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(root_vertex, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        wasm.lift_json(retptr, migration, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} migration
 * @param {Uint8Array} record
 * @returns {Uint8Array}
 */
export function lift_record(migration, record) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(record, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.lift_record(retptr, migration, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * List all built-in protocol names.
 *
 * Returns `MessagePack`-encoded `Vec<String>`.
 * @returns {Uint8Array}
 */
export function list_builtin_protocols() {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.list_builtin_protocols(retptr);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * List all protocol names registered in an I/O registry.
 *
 * Returns `MessagePack`-encoded `Vec<String>`.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid.
 * @param {number} registry
 * @returns {Uint8Array}
 */
export function list_io_protocols(registry) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.list_io_protocols(retptr, registry);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Migrate a data set backward using a stored complement.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid, lens generation fails,
 * or migration fails.
 * @param {number} dataset_handle
 * @param {Uint8Array} complement_bytes
 * @param {number} src_schema
 * @param {number} tgt_schema
 * @returns {number}
 */
export function migrate_dataset_backward(dataset_handle, complement_bytes, src_schema, tgt_schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(complement_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.migrate_dataset_backward(retptr, dataset_handle, ptr0, len0, src_schema, tgt_schema);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} dataset_handle
 * @param {number} src_schema
 * @param {number} tgt_schema
 * @returns {Uint8Array}
 */
export function migrate_dataset_forward(dataset_handle, src_schema, tgt_schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.migrate_dataset_forward(retptr, dataset_handle, src_schema, tgt_schema);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} model
 * @param {Uint8Array} morphism
 * @returns {Uint8Array}
 */
export function migrate_model(model, morphism) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(model, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(morphism, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.migrate_model(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} compiled_handle
 * @param {Uint8Array} instances_bytes
 * @param {number} src_schema_handle
 * @param {number} tgt_schema_handle
 * @returns {Uint8Array}
 */
export function migration_coverage(compiled_handle, instances_bytes, src_schema_handle, tgt_schema_handle) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instances_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.migration_coverage(retptr, compiled_handle, ptr0, len0, src_schema_handle, tgt_schema_handle);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Normalize a schema by collapsing reference chains.
 *
 * Returns a handle to the normalized schema.
 *
 * # Errors
 *
 * Returns `JsError` if the schema handle is invalid.
 * @param {number} schema_handle
 * @returns {number}
 */
export function normalize_schema(schema_handle) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.normalize_schema(retptr, schema_handle);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} json_bytes
 * @returns {number}
 */
export function parse_atproto_lexicon(json_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(json_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.parse_atproto_lexicon(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {string} source
 * @returns {Uint8Array}
 */
export function parse_expr(source) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(source, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        wasm.parse_expr(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} registry
 * @param {Uint8Array} proto_name
 * @param {number} schema_handle
 * @param {Uint8Array} input
 * @returns {Uint8Array}
 */
export function parse_instance(registry, proto_name, schema_handle, input) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(proto_name, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(input, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.parse_instance(retptr, registry, ptr0, len0, schema_handle, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} source_schema_bytes
 * @param {Uint8Array} target_schema_bytes
 * @returns {Uint8Array}
 */
export function poly_hom(source_schema_bytes, target_schema_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(source_schema_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(target_schema_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.poly_hom(retptr, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} graph_bytes
 * @param {string} source_schema
 * @param {string} target_schema
 * @returns {Uint8Array}
 */
export function preferred_conversion_path(graph_bytes, source_schema, target_schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(graph_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(source_schema, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(target_schema, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len2 = WASM_VECTOR_LEN;
        wasm.preferred_conversion_path(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Serialize a protolens chain to JSON.
 *
 * Returns JSON bytes describing each step in the chain (name,
 * source/target endofunctor names, complement type, lossless flag).
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or serialization fails.
 * @param {number} chain
 * @returns {Uint8Array}
 */
export function protolens_chain_to_json(chain) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.protolens_chain_to_json(retptr, chain);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Check applicability of a protolens chain against a schema.
 *
 * Returns `MessagePack`-encoded JSON: `{ "applicable": bool, "reasons": string[] }`.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid or serialization fails.
 * @param {number} chain
 * @param {number} schema
 * @returns {Uint8Array}
 */
export function protolens_check_applicability(chain, schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.protolens_check_applicability(retptr, chain, schema);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Get the complement spec for a protolens chain at a schema.
 *
 * Returns `MessagePack`-encoded [`ComplementSpec`](panproto_core::lens::ComplementSpec).
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or serialization fails.
 * @param {number} chain
 * @param {number} schema
 * @returns {Uint8Array}
 */
export function protolens_complement_spec(chain, schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.protolens_complement_spec(retptr, chain, schema);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Compose two protolens chains.
 *
 * Returns a handle to the composed `ProtolensChain`.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid.
 * @param {number} chain1
 * @param {number} chain2
 * @returns {number}
 */
export function protolens_compose(chain1, chain2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.protolens_compose(retptr, chain1, chain2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} chain
 * @param {Uint32Array} schema_handles
 * @returns {Uint8Array}
 */
export function protolens_fleet(chain, schema_handles) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray32ToWasm0(schema_handles, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.protolens_fleet(retptr, chain, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} diff_bytes
 * @param {number} schema1
 * @param {number} schema2
 * @returns {number}
 */
export function protolens_from_diff(diff_bytes, schema1, schema2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(diff_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.protolens_from_diff(retptr, ptr0, len0, schema1, schema2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Deserialize a protolens chain from JSON bytes.
 *
 * Returns a handle to the `ProtolensChain` resource.
 *
 * # Errors
 *
 * Returns `JsError` if the JSON is invalid.
 * @param {Uint8Array} json_bytes
 * @returns {number}
 */
export function protolens_from_json(json_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(json_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.protolens_from_json(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Fuse a protolens chain into a single protolens.
 *
 * Composes all steps into a single step with a composite complement.
 * Returns a handle to a new `ProtolensChain` containing the fused step.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or the chain is empty.
 * @param {number} chain
 * @returns {number}
 */
export function protolens_fuse(chain) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.protolens_fuse(retptr, chain);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Lift a protolens chain along a theory morphism.
 *
 * Given a chain and a `MessagePack`-encoded `TheoryMorphism`, produces
 * a new chain that operates on schemas of the codomain theory.
 *
 * # Errors
 *
 * Returns `JsError` if the handle is invalid or deserialization fails.
 * @param {number} chain
 * @param {Uint8Array} morphism_bytes
 * @returns {number}
 */
export function protolens_lift(chain, morphism_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(morphism_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.protolens_lift(retptr, chain, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} chain_handle
 * @returns {string}
 */
export function protolens_optic_kind(chain_handle) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.protolens_optic_kind(retptr, chain_handle);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr1 = r0;
        var len1 = r1;
        if (r3) {
            ptr1 = 0; len1 = 0;
            throw takeObject(r2);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export2(deferred2_0, deferred2_1, 1);
    }
}

/**
 * Build a protolens chain from a pipeline of step specs.
 *
 * Takes `MessagePack`-encoded array of `ProtolensStepSpec` objects.
 * Returns a handle to the composed `ProtolensChain`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization or chain construction fails.
 * @param {Uint8Array} steps_bytes
 * @returns {number}
 */
export function protolens_pipeline(steps_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(steps_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.protolens_pipeline(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} chain_handle
 * @returns {number}
 */
export function protolens_simplify(chain_handle) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.protolens_simplify(retptr, chain_handle);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Bidirectional put: restore from a JSON view + complement.
 *
 * # Errors
 *
 * Returns `JsError` if parsing, put, or serialization fails.
 * @param {number} migration
 * @param {Uint8Array} view_json_bytes
 * @param {Uint8Array} complement
 * @param {string} root_vertex
 * @returns {Uint8Array}
 */
export function put_json(migration, view_json_bytes, complement, root_vertex) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(view_json_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(complement, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passStringToWasm0(root_vertex, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len2 = WASM_VECTOR_LEN;
        wasm.put_json(retptr, migration, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} migration
 * @param {Uint8Array} view
 * @param {Uint8Array} complement
 * @returns {Uint8Array}
 */
export function put_record(migration, view, complement) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(view, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(complement, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.put_record(retptr, migration, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {string} base_sort
 * @param {Uint8Array} sub_constraints
 * @param {Uint8Array} super_constraints
 * @returns {boolean}
 */
export function refinement_subsort(base_sort, sub_constraints, super_constraints) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(base_sort, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(sub_constraints, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(super_constraints, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.refinement_subsort(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 !== 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Create an I/O protocol registry with all built-in protocol codecs.
 *
 * Returns a handle to the registry, which can be used with
 * [`parse_instance`] and [`emit_instance`].
 *
 * # Errors
 *
 * Returns `JsError` if registry creation fails.
 * @returns {number}
 */
export function register_io_protocols() {
    const ret = wasm.register_io_protocols();
    return ret >>> 0;
}

/**
 * Render a compatibility report as a JSON string.
 *
 * The `report_bytes` are `MessagePack`-encoded `CompatReport`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 * @param {Uint8Array} report_bytes
 * @returns {string}
 */
export function report_json(report_bytes) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(report_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.report_json(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr2 = r0;
        var len2 = r1;
        if (r3) {
            ptr2 = 0; len2 = 0;
            throw takeObject(r2);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export2(deferred3_0, deferred3_1, 1);
    }
}

/**
 * Render a compatibility report as human-readable text.
 *
 * The `report_bytes` are `MessagePack`-encoded `CompatReport`.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 * @param {Uint8Array} report_bytes
 * @returns {string}
 */
export function report_text(report_bytes) {
    let deferred3_0;
    let deferred3_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(report_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.report_text(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        var ptr2 = r0;
        var len2 = r1;
        if (r3) {
            ptr2 = 0; len2 = 0;
            throw takeObject(r2);
        }
        deferred3_0 = ptr2;
        deferred3_1 = len2;
        return getStringFromWasm0(ptr2, len2);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_export2(deferred3_0, deferred3_1, 1);
    }
}

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
 * @param {number} schema_handle
 * @param {string} from_kind
 * @param {string} to_kind
 * @param {Uint8Array} expr_bytes
 * @returns {number}
 */
export function schema_add_coercion(schema_handle, from_kind, to_kind, expr_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(from_kind, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(to_kind, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(expr_bytes, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.schema_add_coercion(retptr, schema_handle, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} schema_handle
 * @param {string} vertex_name
 * @param {Uint8Array} expr_bytes
 * @returns {number}
 */
export function schema_add_default(schema_handle, vertex_name, expr_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(vertex_name, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(expr_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.schema_add_default(retptr, schema_handle, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} schema_handle
 * @param {string} vertex_name
 * @param {Uint8Array} expr_bytes
 * @returns {number}
 */
export function schema_add_merger(schema_handle, vertex_name, expr_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(vertex_name, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(expr_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.schema_add_merger(retptr, schema_handle, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} schema_handle
 * @param {string} vertex_name
 * @param {Uint8Array} expr_bytes
 * @returns {number}
 */
export function schema_add_policy(schema_handle, vertex_name, expr_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(vertex_name, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(expr_bytes, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.schema_add_policy(retptr, schema_handle, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} schema_handle
 * @returns {Uint8Array}
 */
export function schema_metadata(schema_handle) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.schema_metadata(retptr, schema_handle);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} schema_handle
 * @param {Uint8Array} data_json
 * @returns {number}
 */
export function store_dataset(schema_handle, data_json) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(data_json, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.store_dataset(retptr, schema_handle, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Store a protocol definition in the slab and return a handle.
 *
 * The `protocol_bytes` are `MessagePack`-encoded `Protocol` data.
 *
 * # Errors
 *
 * Returns `JsError` if deserialization fails.
 * @param {Uint8Array} protocol_bytes
 * @returns {number}
 */
export function store_protocol_definition(protocol_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(protocol_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.store_protocol_definition(retptr, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {Uint8Array} expr_bytes
 * @param {string} var_name
 * @param {Uint8Array} replacement_bytes
 * @returns {Uint8Array}
 */
export function substitute_expr(expr_bytes, var_name, replacement_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(expr_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passStringToWasm0(var_name, wasm.__wbindgen_export, wasm.__wbindgen_export3);
        const len1 = WASM_VECTOR_LEN;
        const ptr2 = passArray8ToWasm0(replacement_bytes, wasm.__wbindgen_export);
        const len2 = WASM_VECTOR_LEN;
        wasm.substitute_expr(retptr, ptr0, len0, ptr1, len1, ptr2, len2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v4 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v4;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Auto-generate a symmetric lens from two schemas.
 *
 * Returns a handle to the `SymmetricLens` resource.
 *
 * # Errors
 *
 * Returns `JsError` if schema handles are invalid or symmetric lens
 * generation fails.
 * @param {number} schema1
 * @param {number} schema2
 * @returns {number}
 */
export function symmetric_lens_from_schemas(schema1, schema2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.symmetric_lens_from_schemas(retptr, schema1, schema2);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        if (r2) {
            throw takeObject(r1);
        }
        return r0 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

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
 * @param {number} sym_lens
 * @param {Uint8Array} view
 * @param {Uint8Array} complement
 * @param {number} direction
 * @returns {Uint8Array}
 */
export function symmetric_lens_sync(sym_lens, view, complement, direction) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(view, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(complement, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.symmetric_lens_sync(retptr, sym_lens, ptr0, len0, ptr1, len1, direction);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Validate a W-type instance against a schema.
 *
 * Returns `MessagePack`-encoded `Vec<String>` of validation error
 * messages. An empty vector means the instance is valid.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or deserialization fails.
 * @param {number} schema_handle
 * @param {Uint8Array} instance_bytes
 * @returns {Uint8Array}
 */
export function validate_instance(schema_handle, instance_bytes) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(instance_bytes, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.validate_instance(retptr, schema_handle, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Validate a schema against a protocol's rules.
 *
 * Returns `MessagePack`-encoded `Vec<SerializableValidationError>`.
 * An empty vector means the schema is valid.
 *
 * # Errors
 *
 * Returns `JsError` if either handle is invalid.
 * @param {number} schema_handle
 * @param {number} proto
 * @returns {Uint8Array}
 */
export function validate_schema(schema_handle, proto) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.validate_schema(retptr, schema_handle, proto);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Stage a schema in a VCS repository.
 *
 * The `schema` handle must point to a Schema resource.
 * Returns `MessagePack`-encoded result with the schema object ID.
 *
 * # Errors
 *
 * Returns `JsError` if handles are invalid or staging fails.
 * @param {number} repo
 * @param {number} schema
 * @returns {Uint8Array}
 */
export function vcs_add(repo, schema) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vcs_add(retptr, repo, schema);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Blame a vertex: find which commit introduced it.
 *
 * # Errors
 *
 * Returns `JsError` if the vertex is not found.
 * @param {number} repo
 * @param {Uint8Array} vertex
 * @returns {Uint8Array}
 */
export function vcs_blame(repo, vertex) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(vertex, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.vcs_blame(retptr, repo, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Create a new branch in the VCS repository.
 *
 * # Errors
 *
 * Returns `JsError` if the repo handle is invalid or branch creation fails.
 * @param {number} repo
 * @param {Uint8Array} name
 * @returns {Uint8Array}
 */
export function vcs_branch(repo, name) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(name, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.vcs_branch(retptr, repo, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Checkout a branch or commit in the VCS repository.
 *
 * # Errors
 *
 * Returns `JsError` if the target is not found.
 * @param {number} repo
 * @param {Uint8Array} target
 * @returns {Uint8Array}
 */
export function vcs_checkout(repo, target) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(target, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.vcs_checkout(retptr, repo, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Commit the staged schema in a VCS repository.
 *
 * Returns `MessagePack`-encoded commit ID string.
 *
 * # Errors
 *
 * Returns `JsError` if nothing is staged or commit fails.
 * @param {number} repo
 * @param {Uint8Array} message
 * @param {Uint8Array} author
 * @returns {Uint8Array}
 */
export function vcs_commit(repo, message, author) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(message, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray8ToWasm0(author, wasm.__wbindgen_export);
        const len1 = WASM_VECTOR_LEN;
        wasm.vcs_commit(retptr, repo, ptr0, len0, ptr1, len1);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v3 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v3;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Diff HEAD schema against a staged schema.
 *
 * Returns `MessagePack`-encoded diff result.
 *
 * # Errors
 *
 * Returns `JsError` if the repo handle is invalid or diff fails.
 * @param {number} repo
 * @returns {Uint8Array}
 */
export function vcs_diff(repo) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vcs_diff(retptr, repo);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Initialize an in-memory VCS repository. Returns handle.
 *
 * The `protocol_name` is the UTF-8 protocol name bytes.
 * @param {Uint8Array} _protocol_name
 * @returns {number}
 */
export function vcs_init(_protocol_name) {
    const ptr0 = passArray8ToWasm0(_protocol_name, wasm.__wbindgen_export);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.vcs_init(ptr0, len0);
    return ret >>> 0;
}

/**
 * Walk the commit log from HEAD.
 *
 * Returns `MessagePack`-encoded list of commit info.
 *
 * # Errors
 *
 * Returns `JsError` if the repo handle is invalid.
 * @param {number} repo
 * @param {number} count
 * @returns {Uint8Array}
 */
export function vcs_log(repo, count) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vcs_log(retptr, repo, count);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Merge a branch into the current branch.
 *
 * # Errors
 *
 * Returns `JsError` if merge fails.
 * @param {number} repo
 * @param {Uint8Array} branch
 * @returns {Uint8Array}
 */
export function vcs_merge(repo, branch) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passArray8ToWasm0(branch, wasm.__wbindgen_export);
        const len0 = WASM_VECTOR_LEN;
        wasm.vcs_merge(retptr, repo, ptr0, len0);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v2 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v2;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Stash the current working state.
 *
 * # Errors
 *
 * Returns `JsError` if stash fails.
 * @param {number} repo
 * @returns {Uint8Array}
 */
export function vcs_stash(repo) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vcs_stash(retptr, repo);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Pop the most recent stash entry.
 *
 * # Errors
 *
 * Returns `JsError` if no stash exists.
 * @param {number} repo
 * @returns {Uint8Array}
 */
export function vcs_stash_pop(repo) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vcs_stash_pop(retptr, repo);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
 * Get repository status.
 *
 * Returns `MessagePack`-encoded status info.
 *
 * # Errors
 *
 * Returns `JsError` if the repo handle is invalid.
 * @param {number} repo
 * @returns {Uint8Array}
 */
export function vcs_status(repo) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.vcs_status(retptr, repo);
        var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
        var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
        var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
        var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
        if (r3) {
            throw takeObject(r2);
        }
        var v1 = getArrayU8FromWasm0(r0, r1).slice();
        wasm.__wbindgen_export2(r0, r1 * 1, 1);
        return v1;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg_Error_83742b46f01ce22d: function(arg0, arg1) {
            const ret = Error(getStringFromWasm0(arg0, arg1));
            return addHeapObject(ret);
        },
        __wbindgen_object_drop_ref: function(arg0) {
            takeObject(arg0);
        },
    };
    return {
        __proto__: null,
        "./panproto_wasm_bg.js": import0,
    };
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint32ArrayMemory0 = null;
function getUint32ArrayMemory0() {
    if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
        cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
    }
    return cachedUint32ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function passArray32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getUint32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint32ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('panproto_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
