// Types for ItemsDashboard
export interface ItemsDashboard {
  id: number;
  name: string;
  description: string;
  categoryId: number;
  categoryName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemsDashboardData {
  name: string;
  description: string;
  categoryId: number;
}

export interface UpdateItemsDashboardData {
  name?: string;
  description?: string;
  categoryId?: number;
}

export class ItemsDashboardClient {
  constructor(private baseUrl: string) {}

  async list(): Promise<ItemsDashboard[]> {
    const response = await fetch(`${this.baseUrl}/items`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch items: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async get(id: number): Promise<ItemsDashboard> {
    const response = await fetch(`${this.baseUrl}/items/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch item ${id}: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async create(data: CreateItemsDashboardData): Promise<ItemsDashboard> {
    const response = await fetch(`${this.baseUrl}/items`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create item: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async update(id: number, data: UpdateItemsDashboardData): Promise<ItemsDashboard> {
    const response = await fetch(`${this.baseUrl}/items/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update item ${id}: ${response.status} ${response.statusText}`);
    }
    
    return response.json();
  }

  async delete(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/items/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete item ${id}: ${response.status} ${response.statusText}`);
    }
  }
}

export default ItemsDashboardClient;

export const _phoenix = { 
  iu_id: '1962345af6925fa1a24046d3e9f1417bcf288f37b2c5a02b2a038b0567df2445', 
  name: 'Items Dashboard', 
  risk_tier: 'high', 
  canon_ids: [18] 
} as const;
