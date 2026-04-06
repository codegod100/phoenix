// IU-4: API Layer
// Auto-generated from Phoenix plan

export const _phoenix = {
  iu_id: 'api-layer-004',
  name: 'API Layer',
  risk_tier: 'high',
} as const;

// This IU is implemented in server.ts directly
// It provides RESTful endpoints for the kanban board

export interface ApiRoutes {
  // Board
  'GET /api/board': { response: { columns: any[]; cards: any[] } };

  // Cards
  'POST /api/cards': {
    body: { title: string; description?: string; column_id: string };
    response: { id: string; title: string; description: string | null; column_id: string; order_index: number; created_at: string };
  };
  'PATCH /api/cards/:id': {
    params: { id: string };
    body: { title: string; description: string | null };
    response: { id: string; title: string; description: string | null; column_id: string; order_index: number; created_at: string };
  };
  'PATCH /api/cards/:id/move': {
    params: { id: string };
    body: { column_id: string; order_index: number };
    response: { id: string; title: string; description: string | null; column_id: string; order_index: number; created_at: string };
  };
  'DELETE /api/cards/:id': {
    params: { id: string };
    response: null;
  };

  // Columns
  'POST /api/columns': {
    body: { name: string };
    response: { id: string; name: string; order_index: number; created_at: string };
  };
  'PATCH /api/columns/:id': {
    params: { id: string };
    body: { name: string };
    response: { id: string; name: string; order_index: number; created_at: string };
  };
  'PATCH /api/columns/:id/move': {
    params: { id: string };
    body: { order_index: number };
    response: { id: string; name: string; order_index: number; created_at: string };
  };
  'DELETE /api/columns/:id': {
    params: { id: string };
    response: null;
  };
}

// API types for type safety
export type ApiMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface ApiRequest {
  method: ApiMethod;
  path: string;
  body?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
  status: number;
  data: T;
  error?: string;
}
