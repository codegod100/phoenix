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
  iu_id: '860b6c52862e00771c7d2556da143ca8e953766bd26cf246d1d4feda7c4e8093',
  name: 'Cards',
  risk_tier: 'medium',
  canon_ids: []
} as const;
