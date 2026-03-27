# Spec Ingestion & Change Classification

The ingestion pipeline transforms raw specification documents into structured, content-addressed clauses and classifies changes between spec versions.

## Clause Extraction

- Each spec document must be parsed into atomic clauses with unique clause_id
- A clause is a content-addressed unit containing: clause_id, source_doc_id, source_line_range, raw_text, normalized_text, and section_path
- Clause IDs must be deterministic: identical content always produces the same ID
- The parser must preserve section hierarchy from markdown headings
- Clauses must never span multiple top-level sections

## Semantic Hashing

- Each clause must have a clause_semhash computed from its normalized text via SHA-256
- Each clause must have a context_semhash_cold computed from normalized text, section path, and neighbor clause hashes
- After canonicalization, a context_semhash_warm must be computed incorporating canonical graph context
- Semantic hashes must be stable: identical input always produces identical hash
- The warm hash must exclude weak 'relates_to' edges to prevent incidental invalidation

## Change Classification

- Every clause change must be classified into exactly one of four classes: A (trivial), B (local semantic), C (contextual shift), or D (uncertain)
- Class A changes include formatting-only modifications where the semantic hash is unchanged
- Class B changes are local semantic modifications with moderate edit distance
- Class C changes affect the canonical graph or structural context
- Class D changes are uncertain and require human or LLM review
- The classifier must use multiple signals: normalized edit distance, semhash delta, context hash delta, term-reference deltas, and section structure deltas

## D-Rate Trust Loop

- The D-rate is defined as the percentage of changes classified as D (uncertain) over a rolling window
- The target D-rate must be at most 5%
- D-rate above 10% is acceptable but triggers a warning
- D-rate above 15% must trigger an alarm requiring classifier tuning
- When the D-rate alarm fires, override friction must increase and PolicyBot must surface a trust degradation warning
- D-rate must always be tracked as a first-class metric
