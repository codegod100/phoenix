// Phoenix Types - Data structures for the entire pipeline
// Copy relevant interfaces when implementing Phoenix skills

// ============ SPEC PHASE (ingest) ============

export type ClauseType = 
  | 'REQUIREMENT' 
  | 'CONSTRAINT' 
  | 'DEFINITION' 
  | 'ASSUMPTION' 
  | 'SCENARIO'
  | 'CONTEXT';

export interface Clause {
  id: string;                    // SHA-256 of normalized text
  type: ClauseType;
  text: string;                  // Normalized (lowercased, punctuation standardized)
  section: string;               // Parent heading (e.g., "## Board")
  section_level: number;         // 1 for #, 2 for ##, etc.
  line_start: number;
  line_end: number;
  source_file: string;           // Relative path from project root
  raw_text: string;              // Original text before normalization
}

export interface SpecGraph {
  version: string;
  generated_at: string;
  documents: Record<string, {
    clauses: Clause[];
    metadata: {
      title?: string;
      total_lines: number;
    };
  }>;
}

// ============ CANONICAL PHASE (canonicalize) ============

export type CanonType = 
  | 'REQUIREMENT' 
  | 'CONSTRAINT' 
  | 'DEFINITION' 
  | 'INVARIANT'
  | 'CONTEXT';

export interface CanonicalNode {
  canon_id: string;              // SHA-256 of statement + type
  type: CanonType;
  statement: string;             // Decontextualized, active voice
  confidence: number;            // 0.0 - 1.0
  source_clause_ids: string[];   // Which clauses this came from
  linked_canon_ids: string[];    // Related canonical nodes
  link_types: Record<string, 'refines' | 'depends' | 'conflicts' | 'implements'>;
  tags: string[];                // Extracted keywords
  extraction_method: 'rule' | 'llm' | 'hybrid';
  parent_canon_id?: string;      // For hierarchical nodes
  canon_anchor?: string;         // Stable reference hash
}

export interface CanonicalGraph {
  version: string;
  generated_at: string;
  nodes: Record<string, CanonicalNode>;  // Keyed by canon_id
  provenance: {
    total_clauses: number;
    extraction_method: string;
    llm_model?: string;
  };
}

// ============ PLAN PHASE (plan) ============

export type IUKind = 'module' | 'api' | 'web-ui' | 'function' | 'client' | 'test';
export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface IUContract {
  description: string;
  inputs: string[];
  outputs: string[];
  invariants: string[];
}

export interface BoundaryPolicy {
  code: {
    allowed_ius: string[];
    allowed_packages: string[];
    forbidden_ius: string[];
    forbidden_packages: string[];
    forbidden_paths: string[];
  };
  side_channels: {
    databases: string[];
    queues: string[];
    caches: string[];
    config: string[];
    external_apis: string[];
    files: string[];
  };
}

export interface EvidencePolicy {
  required: Array<'typecheck' | 'lint' | 'boundary_validation' | 'unit_tests' | 'property_tests' | 'static_analysis'>;
}

export interface IUOutput {
  type: 'api' | 'web-ui' | 'client' | 'test' | 'styles';
  file: string;
  primary: boolean;
}

export interface ImplementationUnit {
  iu_id: string;                 // Content-addressed hash
  kind: IUKind;
  name: string;
  risk_tier: RiskTier;
  contract: IUContract;
  source_canon_ids: string[];    // Links to canonical.json
  dependencies: string[];         // Other IU iu_ids
  output_files: string[];
  outputs: IUOutput[];
  boundary_policy: BoundaryPolicy;
  evidence_policy: EvidencePolicy;
  enforcement: {
    dependency_violation: { severity: 'error' | 'warning' };
    side_channel_violation: { severity: 'error' | 'warning' };
  };
}

export interface IUGraph {
  version: string;
  generated_at: string;
  ius: ImplementationUnit[];
  coverage: {
    total_canon_nodes: number;
    covered_canon_nodes: number;
    orphan_canon_ids: string[];
  };
}

// ============ REGEN PHASE (code gen) ============

export interface GeneratedFile {
  path: string;
  content: string;
  iu_id: string;
}

export interface RegenResult {
  iu_id: string;
  files: Map<string, string>;    // path -> content
  success: boolean;
  errors: string[];
  manifest: IUManifestEntry;
}

export interface IUManifestEntry {
  iu_id: string;
  files: Array<{
    path: string;
    hash: string;
    size: number;
  }>;
  generated_at: string;
  model_id: string;
  promptpack_hash: string;
  toolchain_version: string;
}

export interface GeneratedManifest {
  version: string;
  generated_at: string;
  files: Record<string, {
    iu_id: string;
    hash: string;
    size: number;
  }>;
  regen_metadata: {
    model_id: string;
    toolchain_version: string;
    promptpack_hash: string;
  };
}

// ============ DRIFT & AUDIT ============

export interface DriftReport {
  status: 'clean' | 'drifted' | 'orphaned' | 'error';
  files: Array<{
    path: string;
    expected_hash: string;
    actual_hash: string;
    status: 'sync' | 'drift' | 'missing' | 'orphan';
  }>;
  ius_affected: string[];
}

export interface AuditResult {
  iu_id: string;
  ready: boolean;
  gaps: string[];
  recommendations: string[];
}

// ============ PHOENIX METADATA ============

export interface PhoenixProject {
  root: string;
  phoenixDir: string;
  specDir: string;
  generatedDir: string;
}

export interface BootstrapState {
  version: string;
  state: 'cold' | 'warm-pass-1' | 'warm-pass-2' | 'stable';
  last_ingest: string | null;
  last_canonicalize: string | null;
  last_plan: string | null;
  last_regen: string | null;
}
