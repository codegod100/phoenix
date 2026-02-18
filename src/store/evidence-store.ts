/**
 * Evidence Store — persists evidence records.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { EvidenceRecord } from '../models/evidence.js';

interface EvidenceIndex {
  records: EvidenceRecord[];
}

export class EvidenceStore {
  private indexPath: string;

  constructor(phoenixRoot: string) {
    const dir = join(phoenixRoot, 'graphs');
    mkdirSync(dir, { recursive: true });
    this.indexPath = join(dir, 'evidence.json');
  }

  private load(): EvidenceIndex {
    if (!existsSync(this.indexPath)) return { records: [] };
    return JSON.parse(readFileSync(this.indexPath, 'utf8'));
  }

  private save(index: EvidenceIndex): void {
    writeFileSync(this.indexPath, JSON.stringify(index, null, 2), 'utf8');
  }

  addRecord(record: EvidenceRecord): void {
    const index = this.load();
    index.records.push(record);
    this.save(index);
  }

  addRecords(records: EvidenceRecord[]): void {
    const index = this.load();
    index.records.push(...records);
    this.save(index);
  }

  getByIU(iuId: string): EvidenceRecord[] {
    return this.load().records.filter(r => r.iu_id === iuId);
  }

  getAll(): EvidenceRecord[] {
    return this.load().records;
  }

  /** Get latest evidence of each kind for an IU */
  getLatestByIU(iuId: string): Map<string, EvidenceRecord> {
    const records = this.getByIU(iuId);
    const latest = new Map<string, EvidenceRecord>();
    for (const r of records) {
      const existing = latest.get(r.kind);
      if (!existing || r.timestamp > existing.timestamp) {
        latest.set(r.kind, r);
      }
    }
    return latest;
  }
}
