# Phoenix LLM Canonicalization — Experiment Program

You are an autonomous research agent optimizing Phoenix's LLM-enhanced canonicalization pipeline.

## Rules

1. **Edit ONLY `src/experiment-config.ts`** — only the `LLM_*` parameters
2. **Run `npx tsx experiments/eval-runner-llm.ts`** after every change
3. **Parse the composite score** from the last line: `val_score=X.XXXX`
4. **If score improved** → `git add src/experiment-config.ts && git commit -m "llm-experiment: <description> score=X.XXXX"`
5. **If score decreased or unchanged** → `git checkout src/experiment-config.ts` (revert)
6. **Never stop to ask the human** — run experiments indefinitely until interrupted
7. **Never install packages** — work within existing dependencies
8. **Log your reasoning** in commit messages

## Baseline

Rule-based pipeline score: **0.9635** (the target to beat)

## Available LLM Parameters

### Mode Selection
- `LLM_MODE` — `'normalizer'` (rule extraction + LLM polish) or `'extractor'` (full LLM extraction)
- `LLM_MODEL` — model ID (currently `'claude-sonnet-4-20250514'`)

### Normalizer Mode
- `LLM_NORMALIZER_TEMPERATURE` — temperature for single-shot normalization (currently 0)
- `LLM_NORMALIZER_MAX_TOKENS` — max response tokens (currently 150)
- `LLM_NORMALIZER_SYSTEM` — system prompt for normalization
- `LLM_SELF_CONSISTENCY_K` — number of samples for self-consistency (1 = disabled)
- `LLM_CONSISTENCY_TEMPERATURE` — temperature for consistency samples (currently 0.3)

### Extractor Mode
- `LLM_EXTRACTOR_TEMPERATURE` — temperature for extraction (currently 0.1)
- `LLM_EXTRACTOR_MAX_TOKENS` — max response tokens (currently 4096)
- `LLM_EXTRACTOR_BATCH_SIZE` — clauses per LLM call (currently 20)
- `LLM_EXTRACTOR_CONFIDENCE` — confidence assigned to LLM-extracted nodes (currently 0.7)
- `LLM_EXTRACTOR_SYSTEM` — system prompt for extraction

## Research Priorities

_Edit this section to steer the agent's focus._

1. **Beat the rule-based baseline (0.9635)** — the LLM should add value over rules alone
2. **Focus on type accuracy** — that's where rules hit their ceiling (89%). The LLM should classify REQUIREMENT vs CONSTRAINT vs INVARIANT better than keyword matching.
3. **Try normalizer mode first** — it preserves rule-based extraction (proven recall) and only uses LLM to polish statements. Lower risk, lower API cost.
4. **Try extractor mode second** — if normalizer can't beat baseline, try full LLM extraction. Higher risk but potentially higher reward.
5. **System prompt engineering** — the biggest lever. Try:
   - More specific type classification rules with examples
   - Few-shot examples in the system prompt
   - Domain-specific guidance (spec language patterns)
6. **Self-consistency** — try k=3 or k=5 to see if multiple samples improve stability

## Strategy Tips

- Normalizer mode costs ~1 API call per non-CONTEXT node (~15-25 per spec, ~200 total)
- Extractor mode costs ~1 API call per batch of 20 clauses (~1-2 per spec, ~12-24 total)
- Start with normalizer mode (cheaper, safer) before trying extractor
- System prompt changes are the highest-leverage parameter
- Temperature 0 is most deterministic but may miss nuance; try 0.1-0.2
- Self-consistency k>1 is expensive (k × normal cost) — try k=3 first
- Each run takes ~30-60 seconds due to API calls — be patient

## Cost Awareness

Each experiment run makes real API calls. Approximate costs:
- Normalizer mode: ~$0.02-0.05 per run (small prompts, many calls)
- Extractor mode: ~$0.05-0.15 per run (large prompts, fewer calls)
- Self-consistency k=3: ~3x normalizer cost

Keep experiments focused. Don't run more than 20-30 experiments per session.
