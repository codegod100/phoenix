import { randomUUID } from 'node:crypto';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';
export type IUKind = 'module' | 'function';

export interface ImplementationUnit {
  iu_id: string;
  kind: IUKind;
  risk_tier: RiskTier;
  contract: string[];
  dependencies: string[];
  boundary_policy: BoundaryPolicy;
}

export interface BoundaryPolicy {
  allowed_ius: string[];
  allowed_packages: string[];
  forbidden_ius: string[];
  forbidden_packages: string[];
  forbidden_paths: string[];
  side_channels: SideChannels;
}

export interface SideChannels {
  databases: string[];
  queues: string[];
  caches: string[];
  external_apis: string[];
}

export class IUManager {
  private units = new Map<string, ImplementationUnit>();

  createIU(kind: IUKind, riskTier: RiskTier, contract: string[]): ImplementationUnit {
    const iu: ImplementationUnit = {
      iu_id: randomUUID(),
      kind,
      risk_tier: riskTier,
      contract,
      dependencies: [],
      boundary_policy: { allowed_ius: [], allowed_packages: [], forbidden_ius: [], forbidden_packages: [], forbidden_paths: [], side_channels: { databases: [], queues: [], caches: [], external_apis: [] } },
    };
    this.units.set(iu.iu_id, iu);
    return iu;
  }

  getIU(id: string): ImplementationUnit | undefined { return this.units.get(id); }
  listIUs(): ImplementationUnit[] { return [...this.units.values()]; }
  addDependency(iuId: string, depId: string): void {
    const iu = this.units.get(iuId);
    if (iu && !iu.dependencies.includes(depId)) iu.dependencies.push(depId);
  }
}

export function createIUManager(): IUManager { return new IUManager(); }

export const _phoenix = {
  iu_id: 'f1e2d3c4',
  name: 'IU Manager',
  risk_tier: 'high',
  canon_ids: [8, 9],
} as const;
