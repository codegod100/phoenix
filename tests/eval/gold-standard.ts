/**
 * Gold-standard annotated specs for measuring canonicalization quality.
 * Each spec has expected node types, edge types, and coverage.
 */

export interface GoldNode {
  statement: string;       // substring match (case-insensitive)
  type: string;            // expected CanonicalType
  tags?: string[];         // expected tags (subset)
}

export interface GoldEdge {
  from: string;            // statement substring of source
  to: string;              // statement substring of target
  type: string;            // expected EdgeType
}

export interface GoldSpec {
  name: string;
  path: string;
  docId: string;
  expectedNodes: GoldNode[];
  expectedEdges: GoldEdge[];
  expectedMinCoverage: number;  // minimum average coverage %
  expectedMinNodes: number;
  expectedMaxNodes: number;
}

export const GOLD_SPECS: GoldSpec[] = [
  {
    name: 'Auth v1',
    path: 'tests/fixtures/spec-auth-v1.md',
    docId: 'spec-auth.md',
    expectedMinCoverage: 80,
    expectedMinNodes: 8,
    expectedMaxNodes: 15,
    expectedNodes: [
      { statement: 'authenticate with email', type: 'REQUIREMENT' },
      { statement: 'rate-limited', type: 'CONSTRAINT' },
      { statement: 'hashed with bcrypt', type: 'REQUIREMENT' },
      { statement: 'https', type: 'CONSTRAINT' },
      { statement: 'signed with rs256', type: 'CONSTRAINT' },
      { statement: 'session management', type: 'CONTEXT' },
    ],
    expectedEdges: [],
  },
  {
    name: 'Auth v2',
    path: 'tests/fixtures/spec-auth-v2.md',
    docId: 'spec-auth.md',
    expectedMinCoverage: 80,
    expectedMinNodes: 8,
    expectedMaxNodes: 18,
    expectedNodes: [
      { statement: 'authenticate', type: 'REQUIREMENT' },
      { statement: 'oauth', type: 'REQUIREMENT' },
      { statement: 'rate-limited', type: 'CONSTRAINT' },
    ],
    expectedEdges: [],
  },
  {
    name: 'Notifications',
    path: 'tests/fixtures/spec-notifications.md',
    docId: 'spec/notifications.md',
    expectedMinCoverage: 90,
    expectedMinNodes: 12,
    expectedMaxNodes: 20,
    expectedNodes: [
      { statement: 'email delivery via smtp', type: 'REQUIREMENT' },
      { statement: 'never include raw user passwords', type: 'INVARIANT' },
      { statement: 'retried up to 3 times', type: 'CONSTRAINT' },
      { statement: 'push notification', type: 'REQUIREMENT' },
      { statement: 'template', type: 'REQUIREMENT' },
      { statement: 'sanitized against xss', type: 'CONSTRAINT' },
    ],
    expectedEdges: [],
  },
  {
    name: 'Gateway',
    path: 'tests/fixtures/spec-gateway.md',
    docId: 'spec/gateway.md',
    expectedMinCoverage: 85,
    expectedMinNodes: 15,
    expectedMaxNodes: 25,
    expectedNodes: [
      { statement: 'route requests to backend', type: 'REQUIREMENT' },
      { statement: 'rate-limited to 100', type: 'CONSTRAINT' },
      { statement: 'validate jwt', type: 'REQUIREMENT' },
      { statement: 'https', type: 'CONSTRAINT' },
      { statement: 'structured json', type: 'REQUIREMENT' },
      { statement: 'sql injection', type: 'CONSTRAINT' },
    ],
    expectedEdges: [],
  },
  {
    name: 'TaskFlow: tasks',
    path: 'examples/taskflow/spec/tasks.md',
    docId: 'spec/tasks.md',
    expectedMinCoverage: 95,
    expectedMinNodes: 15,
    expectedMaxNodes: 25,
    expectedNodes: [
      { statement: 'status transitions', type: 'REQUIREMENT' },
      { statement: 'invalid', type: 'REQUIREMENT' },
      { statement: 'task management', type: 'CONTEXT' },
    ],
    expectedEdges: [],
  },
  {
    name: 'TaskFlow: analytics',
    path: 'examples/taskflow/spec/analytics.md',
    docId: 'spec/analytics.md',
    expectedMinCoverage: 90,
    expectedMinNodes: 8,
    expectedMaxNodes: 20,
    expectedNodes: [
      { statement: 'completion rate', type: 'REQUIREMENT' },
    ],
    expectedEdges: [],
  },
];
