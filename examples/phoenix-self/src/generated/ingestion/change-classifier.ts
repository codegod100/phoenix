export type ChangeClass = 'A' | 'B' | 'C' | 'D';

export interface ClassificationResult {
  change_class: ChangeClass;
  confidence: number;
  signals: {
    norm_diff: number;
    semhash_delta: boolean;
    context_delta: boolean;
    term_ref_delta: number;
  };
}

export interface DRateMetrics {
  current_rate: number;
  rolling_window: number[];
  alarm_active: boolean;
}

export class ChangeClassifier {
  private dRateWindow: number[] = [];

  classify(normDiff: number, semhashDelta: boolean, contextDelta: boolean, termDelta: number): ClassificationResult {
    if (!semhashDelta) {
      return { change_class: 'A', confidence: 0.95, signals: { norm_diff: normDiff, semhash_delta: false, context_delta: contextDelta, term_ref_delta: termDelta } };
    }
    if (normDiff < 0.1 && termDelta < 0.2) {
      return { change_class: 'A', confidence: 0.85, signals: { norm_diff: normDiff, semhash_delta: true, context_delta: contextDelta, term_ref_delta: termDelta } };
    }
    if (contextDelta) {
      return { change_class: 'C', confidence: 0.8, signals: { norm_diff: normDiff, semhash_delta: true, context_delta: true, term_ref_delta: termDelta } };
    }
    if (normDiff < 0.5 && termDelta < 0.5) {
      return { change_class: 'B', confidence: 0.8, signals: { norm_diff: normDiff, semhash_delta: true, context_delta: false, term_ref_delta: termDelta } };
    }
    return { change_class: 'D', confidence: 0.4, signals: { norm_diff: normDiff, semhash_delta: true, context_delta: contextDelta, term_ref_delta: termDelta } };
  }

  recordClassification(result: ClassificationResult): void {
    this.dRateWindow.push(result.change_class === 'D' ? 1 : 0);
    if (this.dRateWindow.length > 100) this.dRateWindow.shift();
  }

  getDRateMetrics(): DRateMetrics {
    const total = this.dRateWindow.length;
    const dCount = this.dRateWindow.reduce((s, v) => s + v, 0);
    const rate = total > 0 ? dCount / total : 0;
    return { current_rate: rate, rolling_window: [...this.dRateWindow], alarm_active: rate > 0.15 };
  }
}

export function createChangeClassifier(): ChangeClassifier {
  return new ChangeClassifier();
}

export const _phoenix = {
  iu_id: 'e5f6a7b8',
  name: 'Change Classifier',
  risk_tier: 'high',
  canon_ids: [3, 4],
} as const;
