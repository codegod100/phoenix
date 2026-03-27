# Phoenix Architecture Prompt Optimization — Experiment Program

You are an autonomous research agent optimizing the architecture target prompts so that Phoenix generates working multi-resource REST APIs from specs.

## Rules

1. **Edit ONLY `src/architectures/sqlite-web-api.ts`** — the system prompt extension and code examples
2. **Run `npx tsx experiments/eval-runner-arch.ts --skip-bootstrap`** to test changes (uses existing generated code)
3. **When you want to test with full regeneration**, run `npx tsx experiments/eval-runner-arch.ts` (takes ~2-3 min for LLM calls)
4. **Parse the score** from the last line: `val_score=X.XXXX`
5. **If score improved** → `git add src/architectures/sqlite-web-api.ts && git commit -m "arch-experiment: <description> score=X.XXXX"`
6. **If score decreased or unchanged** → `git checkout src/architectures/sqlite-web-api.ts` (revert)
7. **Never stop to ask the human**
8. **Never edit the eval runner or the spec**

## Current Score: 42% (8/19 tests passing)

## What Works (8/19)
- POST /categories creates category ✓
- POST /categories rejects empty name ✓
- GET /categories returns array ✓
- POST /todos creates todo without category ✓
- POST /todos rejects invalid category_id ✓
- POST /todos rejects empty title ✓
- GET /todos/999 returns 404 ✓
- GET /todos?completed=0 filters incomplete ✓

## What Fails (11/19)
- POST /todos creates todo with category — likely category_id not saved
- GET /todos returns todos with category_name — SQL JOIN missing
- GET /todos/:id returns todo with category_name — SQL JOIN missing
- PATCH /todos/:id marks completed — patch not working
- GET /todos?completed=1 filters completed — filter broken
- GET /todos?category_id=N filters by category — filter broken
- GET /stats returns counts — stats endpoint missing or wrong
- GET /stats includes by_category — stats endpoint missing
- DELETE /todos/:id returns 204 — delete broken
- DELETE /categories/:id with todos returns 400 — cascade check missing
- DELETE /categories/:id without todos returns 204 — delete broken

## Key Issues to Fix via Prompt Engineering

### 1. SQL JOINs for related data
The generated todo queries use `SELECT * FROM todos` but need:
```sql
SELECT todos.*, categories.name as category_name
FROM todos LEFT JOIN categories ON todos.category_id = categories.id
```
Add this pattern to the code examples.

### 2. Query parameter filtering
The spec says `GET /todos?completed=1` should filter. The generated code needs to:
```typescript
const completed = c.req.query('completed');
let query = 'SELECT ... FROM todos LEFT JOIN categories ON ...';
const params: unknown[] = [];
if (completed !== undefined) { query += ' WHERE todos.completed = ?'; params.push(Number(completed)); }
```

### 3. Stats endpoint as a separate module
The stats endpoint is a separate IU. It needs its own Hono router with a GET / handler that queries aggregate data.

### 4. Delete with cascade check
DELETE /categories/:id needs to check if any todos reference this category before deleting.

### 5. Multi-resource relationships
The code example only shows a single resource (notes). Add a second example showing:
- Foreign key relationships
- LEFT JOIN queries
- Cascade protection on delete
- Query parameter filtering

## Strategy

1. First: add a multi-resource code example to the architecture target showing JOINs, filtering, and cascade protection
2. Then: run full eval to see if the LLM picks up the new patterns
3. Iterate on prompt wording if specific tests still fail

## What You Can Change

In `src/architectures/sqlite-web-api.ts`:
- `SYSTEM_PROMPT_EXTENSION` — the architectural rules
- `CODE_EXAMPLES` — the few-shot examples (most powerful lever)
- Both strings are interpolated into the LLM prompt at generation time

## Cost

Each full eval run costs ~$0.05-0.15 in API calls (3 IU generations + canonicalization).
Keep experiments focused. 10-15 experiments should be enough.
