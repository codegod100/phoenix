// CONTRACT: Cards Client IU - API client for card operations
// INVARIANT: Maximum 100 cards per board (enforced server-side)
// INVARIANT: Card title must be 1-200 characters

import type { Card, Column } from './api.js';

const API_BASE = '/api';

export async function fetchBoard(): Promise<{ columns: Column[] }> {
  const res = await fetch(`${API_BASE}/board`);
  if (!res.ok) throw new Error('Failed to fetch board');
  return res.json();
}

export async function createCard(
  columnId: number,
  title: string,
  description?: string
): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_id: columnId, title, description })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || 'Failed to create card');
  }
  return res.json();
}

export async function updateCard(
  id: number,
  title: string,
  description?: string | null
): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, description })
  });
  if (!res.ok) throw new Error('Failed to update card');
  return res.json();
}

export async function moveCard(
  id: number,
  columnId: number,
  orderIndex: number
): Promise<Card> {
  const res = await fetch(`${API_BASE}/cards/${id}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_id: columnId, order_index: orderIndex })
  });
  if (!res.ok) throw new Error('Failed to move card');
  return res.json();
}

export async function deleteCard(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/cards/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete card');
}

export async function createColumn(name: string): Promise<Column> {
  const res = await fetch(`${API_BASE}/columns`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error('Failed to create column');
  return res.json();
}

export async function renameColumn(id: number, name: string): Promise<Column> {
  const res = await fetch(`${API_BASE}/columns/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  });
  if (!res.ok) throw new Error('Failed to rename column');
  return res.json();
}

export const _phoenix = {
  iu_id: 'bd12de5e6c7da4dde0240c14791c662a3c6e97600512a34e471f35bcb9e3bca9',
  name: 'Cards',
  risk_tier: 'high',
  canon_ids: [
    '00b4eea5a8a71c96743cd313da67253f5394a9a4600e48e5ec91c17205e73d63',
    '2b5c45f1d1f47417041916189f8b457239fcb1c13fa9b79c0a8a96140de74d5a',
    '350d25951debdaf17e34adf6cf48b6159df47547e4d30c79d9ab7f82bec6fc28',
    '69e4d9bdc3dbcb2d59e96cf185a2aa13d95431ef56b8d07925d47eaf75d68123',
    '6cadda8ee994715c43002828bd4120390b8a3b44fc0bba182457d306b9ae29cc',
    '9a016fb7c5dfbb28f98eba08e36f9ad1729d920ca36eee0691fe7ae5dc0d54d5',
    'af029995d821b93e23643408b03bca4619fe8e7f9418a0b04136b42f7fa4f613',
    'b9e25d1912799fb8d8c97f7d1882befec780df0344453c7a5f54f28a85c8c3a1',
    'f285d8b1a8b19fc94bd6edaa9bc69f92614859c5a1d7954bbb2fcc3b4462dc87',
    'fb74dab8459d1d58cc9f411e0d9bb18f559956b34e10251902629243f5169c1b'
  ]
} as const;
