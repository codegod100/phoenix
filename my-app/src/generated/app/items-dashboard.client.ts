export interface Item {
  id: number;
  name: string;
  quantity: number;
  category_id: number | null;
  category_name: string | null;
  created_at: string;
}

export interface CreateItemData {
  name: string;
  quantity: number;
  category_id?: number | null;
}

export interface UpdateItemData {
  name?: string;
  quantity?: number;
  category_id?: number | null;
}

export interface ItemsListParams {
  search?: string;
  category_id?: number;
  sort?: 'name' | 'quantity' | 'created_at';
  order?: 'asc' | 'desc';
}

export class ItemsDashboardClient {
  constructor(private baseUrl: string = './items-dashboard') {}

  async list(params?: ItemsListParams): Promise<Item[]> {
    const url = new URL(this.baseUrl, window.location.origin);
    if (params) {
      if (params.search) url.searchParams.set('search', params.search);
      if (params.category_id) url.searchParams.set('category_id', String(params.category_id));
      if (params.sort) url.searchParams.set('sort', params.sort);
      if (params.order) url.searchParams.set('order', params.order);
    }
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async get(id: number): Promise<Item> {
    const url = new URL(`${this.baseUrl}/${id}`, window.location.origin);
    const response = await fetch(url.toString());
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async create(data: CreateItemData): Promise<Item> {
    const url = new URL(this.baseUrl, window.location.origin);
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async update(id: number, data: UpdateItemData): Promise<Item> {
    const url = new URL(`${this.baseUrl}/${id}`, window.location.origin);
    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
    return response.json();
  }

  async delete(id: number): Promise<void> {
    const url = new URL(`${this.baseUrl}/${id}`, window.location.origin);
    const response = await fetch(url.toString(), { method: 'DELETE' });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }
  }
}

export default ItemsDashboardClient;

export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2]
} as const;