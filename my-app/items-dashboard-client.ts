<output>
export interface ItemsDashboard {
  id: number;
  name: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateItemsDashboardData {
  name: string;
  description: string;
  category: string;
}

export interface UpdateItemsDashboardData {
  name?: string;
  description?: string;
  category?: string;
}

export interface ListItemsDashboardOptions {
  category?: string;
}

export class ItemsDashboardClient {
  constructor(private baseUrl: string) {}

  /**
   * Fetches a list of all items, optionally filtered by category.
   * @param options - Optional filtering options (e.g., category)
   * @returns Promise resolving to an array of ItemsDashboard
   * @throws Error if the request fails
   */
  async list(options?: ListItemsDashboardOptions): Promise<ItemsDashboard[]> {
    const url = new URL(`${this.baseUrl}/items`);
    
    if (options?.category) {
      url.searchParams.append('category', options.category);
    }

    const response = await fetch(url.toString(), {
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

  /**
   * Fetches a single item by its ID.
   * @param id - The unique identifier of the item
   * @returns Promise resolving to the ItemsDashboard
   * @throws Error if the item is not found or request fails
   */
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

  /**
   * Creates a new item.
   * @param data - The data to create the item with
   * @returns Promise resolving to the created ItemsDashboard
   * @throws Error if the creation fails
   */
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

  /**
   * Updates an existing item by its ID.
   * @param id - The unique identifier of the item to update
   * @param data - The partial data to update the item with
   * @returns Promise resolving to the updated ItemsDashboard
   * @throws Error if the item is not found or update fails
   */
  async update(id: number, data: UpdateItemsDashboardData): Promise<ItemsDashboard> {
    const response = await fetch(`${this.baseUrl}/items/${id}`, {
      method: 'PATCH',
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

  /**
   * Deletes an item by its ID.
   * @param id - The unique identifier of the item to delete
   * @returns Promise that resolves when deletion is complete
   * @throws Error if the item is not found or deletion fails
   */
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

export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2]
} as const;
</output>
