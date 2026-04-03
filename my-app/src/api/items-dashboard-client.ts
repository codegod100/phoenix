/**
 * Represents an item in the dashboard.
 */
export interface Item {
  id: number;
  name: string;
  description: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data required to create a new item.
 */
export interface CreateItemData {
  name: string;
  description: string;
  category: string;
}

/**
 * Data required to update an existing item.
 * All fields are optional for partial updates.
 */
export interface UpdateItemData {
  name?: string;
  description?: string;
  category?: string;
}

/**
 * Custom error class for API-related errors.
 */
export class ItemsDashboardApiError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ItemsDashboardApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Client for interacting with the Items Dashboard API.
 * Provides methods to list, get, create, update, and delete items.
 */
export class ItemsDashboardClient {
  private baseUrl: string;

  /**
   * Creates an instance of ItemsDashboardClient.
   * @param baseUrl - The base URL for the Items Dashboard API.
   */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Helper method to handle HTTP responses and errors.
   * @param response - The fetch Response object.
   * @returns The parsed JSON response.
   * @throws {ItemsDashboardApiError} When the response is not ok.
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ItemsDashboardApiError(
        `API Error (${response.status}): ${errorText}`,
        response.status
      );
    }
    return response.json() as Promise<T>;
  }

  /**
   * Fetches all items from the dashboard.
   * Supports filtering by category through query parameters.
   * @param category - Optional category filter.
   * @returns A promise that resolves to an array of items.
   * @throws {ItemsDashboardApiError} When the request fails.
   */
  async list(category?: string): Promise<Item[]> {
    const url = new URL(`${this.baseUrl}/items-dashboard`);
    if (category) {
      url.searchParams.append('category', category);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    return this.handleResponse<Item[]>(response);
  }

  /**
   * Fetches a single item by its ID.
   * @param id - The unique identifier of the item.
   * @returns A promise that resolves to the item.
   * @throws {ItemsDashboardApiError} When the item is not found or request fails.
   */
  async get(id: number): Promise<Item> {
    const response = await fetch(`${this.baseUrl}/items-dashboard/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    return this.handleResponse<Item>(response);
  }

  /**
   * Creates a new item in the dashboard.
   * @param data - The data for the new item.
   * @returns A promise that resolves to the created item.
   * @throws {ItemsDashboardApiError} When the request fails or data is invalid.
   */
  async create(data: CreateItemData): Promise<Item> {
    const response = await fetch(`${this.baseUrl}/items-dashboard`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse<Item>(response);
  }

  /**
   * Updates an existing item partially.
   * @param id - The unique identifier of the item to update.
   * @param data - The partial data to update.
   * @returns A promise that resolves to the updated item.
   * @throws {ItemsDashboardApiError} When the item is not found or request fails.
   */
  async update(id: number, data: UpdateItemData): Promise<Item> {
    const response = await fetch(`${this.baseUrl}/items-dashboard/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse<Item>(response);
  }

  /**
   * Deletes an item from the dashboard.
   * @param id - The unique identifier of the item to delete.
   * @returns A promise that resolves when the deletion is complete.
   * @throws {ItemsDashboardApiError} When the item is not found or request fails.
   */
  async delete(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/items-dashboard/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new ItemsDashboardApiError(
        `API Error (${response.status}): ${errorText}`,
        response.status
      );
    }
  }
}
