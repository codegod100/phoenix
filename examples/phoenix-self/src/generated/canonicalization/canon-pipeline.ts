export type CanonicalType = 'REQUIREMENT' | 'CONSTRAINT' | 'INVARIANT' | 'DEFINITION' | 'CONTEXT';

export interface CanonicalNode {
  canon_id: string;
  type: CanonicalType;
  statement: string;
  confidence: number;
  source_clause_ids: string[];
  tags: string[];
}

export interface PipelineConfig {
  canon_pipeline_id: string;
  model_id: string;
  promptpack_version: string;
  extraction_rules_version: string;
  diff_policy_version: string;
}

export interface ExtractionCoverage {
  total_sentences: number;
  extracted: number;
  coverage_pct: number;
}

export class CanonPipeline {
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
  }

  getConfig(): PipelineConfig { return { ...this.config }; }

  extractNodes(clauseTexts: string[]): { nodes: CanonicalNode[]; coverage: ExtractionCoverage } {
    const nodes: CanonicalNode[] = [];
    for (const text of clauseTexts) {
      const type = this.classifyType(text);
      nodes.push({
        canon_id: `canon_${nodes.length}`,
        type,
        statement: text.trim(),
        confidence: type === 'CONTEXT' ? 0.3 : 0.7,
        source_clause_ids: [],
        tags: this.extractTags(text),
      });
    }
    return { nodes, coverage: { total_sentences: clauseTexts.length, extracted: nodes.length, coverage_pct: 100 } };
  }

  private classifyType(text: string): CanonicalType {
    const lower = text.toLowerCase();
    if (/\b(?:must not|cannot|forbidden|limited to|maximum|minimum)\b/.test(lower)) return 'CONSTRAINT';
    if (/\b(?:always|never|guaranteed|must remain)\b/.test(lower)) return 'INVARIANT';
    if (/\b(?:is defined as|means|refers to)\b/.test(lower)) return 'DEFINITION';
    if (/\b(?:must|shall|required)\b/.test(lower)) return 'REQUIREMENT';
    return 'CONTEXT';
  }

  private extractTags(text: string): string[] {
    return text.toLowerCase().split(/\s+/).filter(w => w.length > 3 && !/^(must|shall|the|and|for|with|from|that|this)$/.test(w)).slice(0, 5);
  }
}

export function createCanonPipeline(config: PipelineConfig): CanonPipeline {
  return new CanonPipeline(config);
}

export const _phoenix = {
  iu_id: 'c9d0e1f2',
  name: 'Canon Pipeline',
  risk_tier: 'high',
  canon_ids: [5, 6],
} as const;
