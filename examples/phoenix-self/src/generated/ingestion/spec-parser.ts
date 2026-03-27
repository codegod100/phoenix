import { createHash } from 'node:crypto';

export interface Clause {
  clause_id: string;
  source_doc_id: string;
  source_line_range: [number, number];
  raw_text: string;
  normalized_text: string;
  section_path: string[];
  clause_semhash: string;
  context_semhash_cold: string;
}

export class SpecParser {
  parseDocument(docId: string, content: string): Clause[] {
    const sections = content.split(/^(?=# )/m);
    const clauses: Clause[] = [];
    let lineOffset = 0;

    for (const section of sections) {
      if (!section.trim()) { lineOffset += section.split('\n').length; continue; }
      const lines = section.split('\n');
      const normalized = section.replace(/\s+/g, ' ').trim().toLowerCase();
      const semhash = createHash('sha256').update(normalized).digest('hex');
      const sectionPath = this.extractSectionPath(lines[0] ?? '');

      clauses.push({
        clause_id: createHash('sha256').update(`${docId}\x00${semhash}`).digest('hex').slice(0, 16),
        source_doc_id: docId,
        source_line_range: [lineOffset + 1, lineOffset + lines.length],
        raw_text: section.trim(),
        normalized_text: normalized,
        section_path: sectionPath,
        clause_semhash: semhash,
        context_semhash_cold: createHash('sha256').update(`${normalized}\x00${sectionPath.join('/')}`).digest('hex'),
      });
      lineOffset += lines.length;
    }
    return clauses;
  }

  private extractSectionPath(heading: string): string[] {
    const match = heading.match(/^(#{1,6})\s+(.*)/);
    if (!match) return [];
    return [match[2].trim()];
  }
}

export function createSpecParser(): SpecParser {
  return new SpecParser();
}

export const _phoenix = {
  iu_id: 'a1b2c3d4',
  name: 'Spec Parser',
  risk_tier: 'high',
  canon_ids: [1, 2],
} as const;
