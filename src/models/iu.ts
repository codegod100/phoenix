/**
 * Implementation Unit (IU) — stable compilation boundary.
 *
 * Maps canonical requirements to generated code modules.
 */

export type IUKind = 'module' | 'function' | 'web-ui' | 'api' | 'cli';
export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export interface IUOutput {
  /** Output type/architecture */
  type: 'api' | 'web-ui' | 'cli' | 'test' | 'client';
  /** File path for this output */
  file: string;
  /** Whether this output is primary or auxiliary */
  primary: boolean;
}

export interface IUContract {
  /** Description of what this IU does */
  description: string;
  /** Input types / parameters */
  inputs: string[];
  /** Output types / return values */
  outputs: string[];
  /** Invariants that must hold */
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

export interface EnforcementConfig {
  dependency_violation: { severity: 'error' | 'warning' };
  side_channel_violation: { severity: 'error' | 'warning' };
}

export interface EvidencePolicy {
  /** What evidence is required for this risk tier */
  required: string[];
}

export interface ImplementationUnit {
  iu_id: string;
  kind: IUKind;
  name: string;
  risk_tier: RiskTier;
  contract: IUContract;
  source_canon_ids: string[];
  dependencies: string[];
  boundary_policy: BoundaryPolicy;
  enforcement: EnforcementConfig;
  evidence_policy: EvidencePolicy;
  /** Legacy: single output file list */
  output_files: string[];
  /** New: typed outputs for different architectures */
  outputs?: IUOutput[];
}

export function defaultBoundaryPolicy(): BoundaryPolicy {
  return {
    code: {
      allowed_ius: [],
      allowed_packages: [],
      forbidden_ius: [],
      forbidden_packages: [],
      forbidden_paths: [],
    },
    side_channels: {
      databases: [],
      queues: [],
      caches: [],
      config: [],
      external_apis: [],
      files: [],
    },
  };
}

export function defaultEnforcement(): EnforcementConfig {
  return {
    dependency_violation: { severity: 'error' },
    side_channel_violation: { severity: 'warning' },
  };
}
