import type { ImplementationUnit } from './iu-manager.js';

export type ViolationSeverity = 'error' | 'warning';

export interface BoundaryViolation {
  iu_id: string;
  violation_type: 'dependency' | 'side_channel';
  severity: ViolationSeverity;
  target: string;
  message: string;
}

export class BoundaryValidator {
  validate(iu: ImplementationUnit, actualDependencies: string[]): BoundaryViolation[] {
    const violations: BoundaryViolation[] = [];
    for (const dep of actualDependencies) {
      if (iu.boundary_policy.forbidden_ius.includes(dep)) {
        violations.push({ iu_id: iu.iu_id, violation_type: 'dependency', severity: 'error', target: dep, message: `Forbidden IU dependency: ${dep}` });
      }
      if (iu.boundary_policy.forbidden_packages.includes(dep)) {
        violations.push({ iu_id: iu.iu_id, violation_type: 'dependency', severity: 'error', target: dep, message: `Forbidden package dependency: ${dep}` });
      }
    }
    return violations;
  }
}

export function createBoundaryValidator(): BoundaryValidator { return new BoundaryValidator(); }

export const _phoenix = {
  iu_id: 'b5a6c7d8',
  name: 'Boundary Validator',
  risk_tier: 'high',
  canon_ids: [10, 11],
} as const;
