---
name: phoenix-constraint-review
description: Systematic constraint discovery and validation for Phoenix specs. Catches missing negative constraints and UX anti-patterns before they become implementation bugs.
---

# Phoenix Constraint Review

Systematic constraint discovery to prevent "correct by letter, wrong by spirit" implementations.

## Purpose

Every functional requirement needs matching **negative constraints** that define what the system must NEVER do. Without them, developers can satisfy specs while breaking UX.

## When to Use

- After writing spec, before `phoenix-ingest`
- When adding new features
- During spec review
- After discovering implementation bugs that spec should have prevented

## Usage

```bash
/skill:phoenix-constraint-review              # Review current spec
/skill:phoenix-constraint-review --add        # Add missing constraints to spec
/skill:phoenix-constraint-review --strict     # Fail on any missing constraints
```

## The Gap

**Without negative constraints:**
```markdown
- CONSTRAINT: Board fills viewport width
```
→ Developer uses `min-height: 100vh`
→ Board scrolls vertically ❌
→ Audit passes (spec satisfied) ❌

**With negative constraints:**
```markdown
- CONSTRAINT: Board fills viewport width
- CONSTRAINT: Board height exactly 100vh, no vertical scroll
```
→ Developer uses `height: 100vh; overflow-y: hidden`
→ No scroll ✅
→ Audit validates against spec ✅

## Constraint Discovery Checklist

### For Every Functional Requirement

Ask: **"How could this be implemented correctly by letter but wrong in spirit?"**

Example:
- **Requirement**: "Cards can be dragged between columns"
- **Wrong implementation**: Dragging card also drags column
- **Missing constraint**: "Dragging card moves only card, not column"

### UX Anti-Pattern Categories

#### Layout & Scrolling
| Pattern | Missing Constraint | Bug |
|---------|-------------------|-----|
| Board fills viewport | No vertical scroll | `min-height: 100vh` scrolls |
| Columns scroll horizontally | No horizontal body scroll | Body gets `overflow-x` |
| Fixed column headers | Headers don't scroll away | Headers scroll with content |
| Modal centered | No page scroll behind modal | Body scrolls under modal |

**Constraint Pattern:**
```markdown
- CONSTRAINT: Board fills viewport without vertical scroll
- CONSTRAINT: Body overflow-x: hidden, overflow-y: hidden
- CONSTRAINT: Column headers position: sticky top
- CONSTRAINT: Modal opens with body overflow: hidden
```

#### Modals & Dialogs
| Pattern | Missing Constraint | Bug |
|---------|-------------------|-----|
| Styled modals | No native modals | `alert()`, `prompt()`, `confirm()` |
| Modal on click | No accidental double-opens | Rapid clicks open multiple |
| Modal backdrop | Click backdrop closes | Click does nothing |
| Focus management | First input auto-focused | No focus, user must tab |

**Constraint Pattern:**
```markdown
- CONSTRAINT: Never use browser native alert(), prompt(), confirm()
- CONSTRAINT: Modal open guards against double-trigger
- CONSTRAINT: Backdrop click MUST close modal
- CONSTRAINT: First input in modal auto-focuses on open
```

#### Data & Persistence
| Pattern | Missing Constraint | Bug |
|---------|-------------------|-----|
| SQLite database | No in-memory storage | Uses `new Map()` instead |
| Data persists | Database initialized | `initDatabase()` is no-op |
| Card order saved | Order index persisted | Order lost on refresh |
| Column rename saved | PATCH API called | Only local state updates |

**Constraint Pattern:**
```markdown
- CONSTRAINT: Use SQLite database file, never in-memory Maps
- CONSTRAINT: initDatabase() creates tables, not empty
- CONSTRAINT: All mutations call API before UI update
```

#### Drag & Drop
| Pattern | Missing Constraint | Bug |
|---------|-------------------|-----|
| Cards draggable | Cards move, columns don't | Card drag moves column |
| Columns draggable | Columns move, cards don't | Column drag disconnects cards |
| Drop zones | Visual feedback | No indicator where drop lands |
| Card counts | Update on move | Counts wrong after drag |

**Constraint Pattern:**
```markdown
- CONSTRAINT: Card drag events stopPropagation to prevent column drag
- CONSTRAINT: Column drag checks target !== card before starting
- CONSTRAINT: Drop zones show visual indicator on dragover
- CONSTRAINT: Card counts update in source AND destination columns
```

#### Dynamic Updates
| Pattern | Missing Constraint | Bug |
|---------|-------------------|-----|
| No page reload | DOM updates directly | `location.reload()` after action |
| Real-time counts | Badge updates immediately | Count updates after refresh only |
| Added cards appear | Card rendered immediately | Need refresh to see new card |

**Constraint Pattern:**
```markdown
- CONSTRAINT: Operations update DOM directly, no page reload
- CONSTRAINT: Count badges update immediately on mutation
- CONSTRAINT: Created items render in DOM before API responds
```

## Implementation Steps

### Step 1: Parse Existing Spec

```typescript
// Find all constraints
const constraints = specClauses.filter(c => c.type === 'CONSTRAINT');
const requirements = specClauses.filter(c => c.type === 'REQUIREMENT');
```

### Step 2: Check Constraint Completeness

For each requirement, verify it has matching negative constraints:

```typescript
interface ConstraintCheck {
  requirement: string;
  requiredConstraints: string[];
  missingConstraints: string[];
}

const checks: ConstraintCheck[] = [
  {
    requirement: 'Board fills viewport',
    requiredConstraints: [
      'Board without vertical scroll',
      'Body overflow hidden'
    ],
    missingConstraints: [] // To be filled
  },
  {
    requirement: 'Cards can be dragged between columns',
    requiredConstraints: [
      'Card drag does not drag column',
      'Card counts update on move'
    ],
    missingConstraints: []
  }
];
```

### Step 3: Generate Missing Constraints

```typescript
function generateMissingConstraints(checks: ConstraintCheck[]): string[] {
  const additions: string[] = [];
  
  for (const check of checks) {
    for (const required of check.requiredConstraints) {
      const hasConstraint = constraints.some(c => 
        c.text.toLowerCase().includes(required.toLowerCase())
      );
      
      if (!hasConstraint) {
        additions.push(`- CONSTRAINT: ${required}`);
      }
    }
  }
  
  return additions;
}
```

### Step 4: Suggest Spec Additions

Output:
```
=== Missing Negative Constraints ===

Requirement: "Board fills viewport"
  Missing:
    - CONSTRAINT: Board height exactly 100vh, no vertical scroll
    - CONSTRAINT: Body overflow-x: hidden, overflow-y: hidden

Requirement: "Cards can be dragged between columns"
  Missing:
    - CONSTRAINT: Card drag moves only card, not column
    - CONSTRAINT: Card drag stopPropagation prevents parent drag

=== Add to spec ===
Paste these into spec/app.md:

- CONSTRAINT: Board height exactly 100vh, overflow-y: hidden
- CONSTRAINT: Body margin and padding reset to 0
- CONSTRAINT: Card drag events use stopPropagation()
- CONSTRAINT: Column dragstart guards against card targets
```

## Integration with Pipeline

### Option A: Pre-Ingest Gate

```bash
/skill:phoenix-constraint-review --strict
# If missing constraints found, blocks ingest until fixed
```

### Option B: Post-Ingest Warning

```bash
/skill:phoenix-ingest  # Parses clauses
/skill:phoenix-constraint-review  # Checks constraint coverage
# Shows warnings but doesn't block
```

### Option C: Auto-Add to Spec

```bash
/skill:phoenix-constraint-review --add
# Automatically appends missing constraints to spec/app.md
# User reviews and commits
```

## Constraint Validation in Audit

Extend `phoenix-audit` to verify constraints in code:

```typescript
// In audit.ts
const constraintValidations = [
  {
    constraint: 'Board without vertical scroll',
    validate: (code) => {
      const hasVerticalScroll = code.includes('overflow-y: scroll') ||
        (code.includes('min-height: 100vh') && !code.includes('overflow-y: hidden'));
      return !hasVerticalScroll;
    }
  },
  {
    constraint: 'No native modals',
    validate: (code) => !code.match(/alert\(|prompt\(|confirm\(/)
  },
  {
    constraint: 'SQLite not in-memory Maps',
    validate: (code) => code.includes('bun:sqlite') && !code.match(/new Map\(\)/)
  }
];
```

## Example: Complete Constraint Set for Kanban

```markdown
## Layout Constraints
- CONSTRAINT: Board fills viewport width without horizontal body scroll
- CONSTRAINT: Board fills viewport height without vertical body scroll
- CONSTRAINT: Body margin: 0, padding: 0, overflow: hidden
- CONSTRAINT: Column height fixed with internal scroll for overflow cards
- CONSTRAINT: Modal opens with body overflow: hidden

## Modal Constraints
- CONSTRAINT: Never use browser native alert(), prompt(), or confirm()
- CONSTRAINT: Modal backdrop click MUST close modal
- CONSTRAINT: Modal ESC key MUST close modal
- CONSTRAINT: Modal first input auto-focuses on open
- CONSTRAINT: Modal prevents double-open on rapid clicks

## Data Constraints
- CONSTRAINT: Use SQLite database file at data/app.db
- CONSTRAINT: Never use in-memory Maps for persistence
- CONSTRAINT: initDatabase() creates tables, is not no-op
- CONSTRAINT: All mutations call API before updating local state

## Drag Constraints
- CONSTRAINT: Card drag moves only card, column position unchanged
- CONSTRAINT: Card drag events stopPropagation to prevent column drag
- CONSTRAINT: Column drag checks target !== card before dragstart
- CONSTRAINT: Drop zones show visual feedback on dragover
- CONSTRAINT: Card counts update immediately in source and destination

## Update Constraints
- CONSTRAINT: DOM updates directly, no page reload for any operation
- CONSTRAINT: Count badges update immediately on any mutation
- CONSTRAINT: Created items appear in DOM before API response
```

## Success Criteria

✅ **Spec has matching negative constraint for every functional requirement**
✅ **Audit validates constraints in generated code**
✅ **Pipeline fails when constraints are violated**

## See Also

- /skill:phoenix-ingest - Parse constraints
- /skill:phoenix-audit - Validate constraints in code
- /skill:phoenix-testing - Test constraint violations
