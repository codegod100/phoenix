---
name: phoenix-testing
description: Testing guidelines for Phoenix projects. Ensures proper test coverage by risk tier.
---

# Phoenix Testing

Testing standards for generated code.

## Risk-Based Testing

| Risk | Tests Required |
|------|----------------|
| low | Optional unit tests |
| medium | Unit tests |
| high | Unit + integration tests |
| critical | Full suite |

## Test Structure

```typescript
// Unit test example
describe('Task creation', () => {
  it('creates task with valid title', () => {
    const task = createTask({ title: 'Test' });
    expect(task.title).toBe('Test');
  });
  
  it('rejects empty title', () => {
    expect(() => createTask({ title: '' })).toThrow();
  });
});
```

## Principles

1. **Test invariants** from IU contract
2. **Test edge cases** (empty, null, max values)
3. **Isolate** tests (no shared state)
4. **Verify traceability** (exports, IDs)

## File Location

```
src/generated/app/
├── feature.ts
└── __tests__/
    └── feature.test.ts
```

## Coverage Check

- [ ] All IUs have tests (medium+)
- [ ] Tests pass
- [ ] Invariants verified
