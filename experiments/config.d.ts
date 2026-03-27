/**
 * Experiment Configuration — Single source of truth for all tunable parameters.
 *
 * The AI agent edits ONLY this file during experiment loops.
 * Default values match the original hardcoded constants exactly.
 */
export declare const CONFIG: {
    MAX_DEGREE: number;
    MIN_SHARED_TAGS: number;
    JACCARD_DEDUP_THRESHOLD: number;
    FINGERPRINT_PREFIX_COUNT: number;
    DOC_FREQ_CUTOFF: number;
    CONSTRAINT_NEGATION_WEIGHT: number;
    CONSTRAINT_LIMIT_WEIGHT: number;
    CONSTRAINT_NUMERIC_WEIGHT: number;
    INVARIANT_SIGNAL_WEIGHT: number;
    REQUIREMENT_MODAL_WEIGHT: number;
    REQUIREMENT_KEYWORD_WEIGHT: number;
    REQUIREMENT_VERB_WEIGHT: number;
    DEFINITION_EXPLICIT_WEIGHT: number;
    DEFINITION_COLON_WEIGHT: number;
    CONTEXT_NO_MODAL_WEIGHT: number;
    CONTEXT_SHORT_WEIGHT: number;
    HEADING_CONTEXT_BONUS: number;
    CONSTRAINT_MUST_BONUS: number;
    MIN_CONFIDENCE: number;
    MAX_CONFIDENCE: number;
    DEFINITION_MAX_LENGTH: number;
    MIN_EXTRACTION_LENGTH: number;
    MIN_TERM_LENGTH: number;
    MIN_WORD_LENGTH: number;
    MIN_LIST_ITEM_LENGTH: number;
    MIN_PROSE_SENTENCE_LENGTH: number;
    PROSE_SPLIT_THRESHOLD: number;
    MIN_SPLIT_PART_LENGTH: number;
    WARM_MIN_CONFIDENCE: number;
    CLASS_A_NORM_DIFF: number;
    CLASS_A_TERM_DELTA: number;
    CLASS_B_NORM_DIFF: number;
    CLASS_B_TERM_DELTA: number;
    CLASS_D_HIGH_CHANGE: number;
    ANCHOR_MATCH_THRESHOLD: number;
};
