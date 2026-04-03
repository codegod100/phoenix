/**
 * ItemsDashboard API Client
 * 
 * Provides CRUD operations for managing items with category filtering support.
 * All methods return Promises and include comprehensive error handling.
 */

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Represents an item in the dashboard
 */
export interface ItemsDashboard {
  /** Unique identifier for the item */
  id: number;
  /** Display name of the item */
  name: string;
  /** Category identifier for filtering */
  category: string;
  /** Detailed description of the item */
  description?: string;
  /** ISO timestamp when the item was created */
  createdAt: string;
  /** ISO timestamp when the item was last updated */
  updatedAt: string;
}

/**
 * Data required to create a new item
 */
export interface CreateItemsDashboardData {
  /** Display name of the item (required) */
  name: string;
  /** Category identifier for filtering (required) */
  category: string;
  /** Detailed description of the item (optional) */
  description?: string;
}

/**
 * Data for updating an existing item
 */
export interface UpdateItemsDashboardData {
  /** Updated display name (optional) */
  name?: string;
  /** Updated category (optional) */
  category?: string;
  /** Updated description (optional) */
  description?: string;
}

/**
 * Options for filtering items in list queries
 */
export interface ListItemsDashboardOptions {
  /** Filter items by category */
  category?: string;
}

/**
 * Custom error class for API errors
 */
export class ItemsDashboardError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
    public readonly response?: Response
  ) {
    super(message);
    this.name = 'ItemsDashboardError';
  }
}

// ============================================================================
// Client Implementation
// ============================================================================

/**
 * HTTP client for the ItemsDashboard API.
 * 
 * Supports filtering by category and provides full CRUD operations
 * with proper error handling and JSDoc documentation.
 * 
 * @example
 * ```typescript
 * const client = new ItemsDashboardClient('https://api.example.com');
 * 
 * // List all items in a category
 * const items = await client.list({ category: 'electronics' });
 * 
 * // Create a new item
 * const newItem = await client.create({
 *   name: 'Widget',
 *   category: 'electronics',
 *   description: 'A useful widget'
 * });
 * ```
 */
export class ItemsDashboardClient {
  /**
   * Creates a new ItemsDashboardClient instance.
   * @param baseUrl - The base URL of the API (e.g., 'https://api.example.com')
   */
  constructor(private baseUrl: string) {}

  /**
   * Constructs the full API URL for a given endpoint path.
   * @private
   */
  private getUrl(path: string): string {
    const base = this.baseUrl.replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  /**
   * Handles HTTP response errors and parses JSON responses.
   * @private
   * @throws {ItemsDashboardError} When response is not ok or JSON parsing fails
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new ItemsDashboardError(errorMessage, response.status, response);
    }

    try {
      return await response.json() as T;
    } catch (error) {
      throw new ItemsDashboardError(
        `Failed to parse JSON response: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Default headers for JSON API requests.
   * @private
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  /**
   * Retrieves a list of all items, optionally filtered by category.
   * 
   * Supports filtering by category as specified in requirements.
   * 
   * @param options - Optional filtering parameters
   * @param options.category - Filter results by category name
   * @returns Promise resolving to array of ItemsDashboard objects
   * @throws {ItemsDashboardError} When the request fails
   * 
   * @example
   * ```typescript
   * // Get all items
   * const allItems = await client.list();
   * 
   * // Get items filtered by category
   * const electronics = await client.list({ category: 'electronics' });
   * ```
   */
  async list(options?: ListItemsDashboardOptions): Promise<ItemsDashboard[]> {
    const url = new URL(this.getUrl('/items'));
    
    if (options?.category) {
      url.searchParams.append('category', options.category);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ItemsDashboard[]>(response);
  }

  /**
   * Retrieves a single item by its ID.
   * 
   * @param id - The unique identifier of the item
   * @returns Promise resolving to the ItemsDashboard object
   * @throws {ItemsDashboardError} When the item is not found or request fails
   * 
   * @example
   * ```typescript
   * const item = await client.get(123);
   * console.log(item.name); // 'Widget'
   * ```
   */
  async get(id: number): Promise<ItemsDashboard> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsDashboardError('Invalid ID: must be a positive integer');
    }

    const response = await fetch(this.getUrl(`/items/${id}`), {
      method: 'GET',
      headers: this.getHeaders(),
    });

    return this.handleResponse<ItemsDashboard>(response);
  }

  /**
   * Creates a new item in the dashboard.
   * 
   * Supports the create button functionality as specified in requirements.
   * 
   * @param data - The item data to create
   * @returns Promise resolving to the created ItemsDashboard object
   * @throws {ItemsDashboardError} When validation fails or request fails
   * 
   * @example
   * ```typescript
   * const newItem = await client.create({
   *   name: 'New Widget',
   *   category: 'electronics',
   *   description: 'A brand new widget'
   * });
   * ```
   */
  async create(data: CreateItemsDashboardData): Promise<ItemsDashboard> {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new ItemsDashboardError('Validation error: name is required');
    }
    if (!data.category || data.category.trim() === '') {
      throw new ItemsDashboardError('Validation error: category is required');
    }

    const response = await fetch(this.getUrl('/items'), {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ItemsDashboard>(response);
  }

  /**
   * Updates an existing item by ID.
   * 
   * Supports the edit button functionality as specified in requirements.
   * 
   * @param id - The unique identifier of the item to update
   * @param data - The partial item data to update
   * @returns Promise resolving to the updated ItemsDashboard object
   * @throws {ItemsDashboardError} When item not found, validation fails, or request fails
   * 
   * @example
   * ```typescript
   * // Update item name
   * const updated = await client.update(123, { name: 'Updated Widget' });
   * 
   * // Update multiple fields
   * const updated = await client.update(123, {
   *   name: 'Updated Widget',
   *   category: 'gadgets'
   * });
   * ```
   */
  async update(id: number, data: UpdateItemsDashboardData): Promise<ItemsDashboard> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsDashboardError('Invalid ID: must be a positive integer');
    }

    // Validate that at least one field is provided
    if (Object.keys(data).length === 0) {
      throw new ItemsDashboardError('Validation error: at least one field must be provided for update');
    }

    const response = await fetch(this.getUrl(`/items/${id}`), {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return this.handleResponse<ItemsDashboard>(response);
  }

  /**
   * Deletes an item by its ID.
   * 
   * Supports the delete button functionality as specified in requirements.
   * 
   * @param id - The unique identifier of the item to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {ItemsDashboardError} When item not found or request fails
   * 
   * @example
   * ```typescript
   * await client.delete(123);
   * console.log('Item deleted successfully');
   * ```
   */
  async delete(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsDashboardError('Invalid ID: must be a positive integer');
    }

    const response = await fetch(this.getUrl(`/items/${id}`), {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      let errorMessage: string;
      try {
        const errorData = await response.json();
        errorMessage = errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
      } catch {
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new ItemsDashboardError(errorMessage, response.status, response);
    }

    // DELETE returns 204 No Content on success, nothing to parse
    if (response.status !== 204) {
      // Some APIs might return the deleted object; handle if present
      try {
        await response.json();
      } catch {
        // Ignore parsing errors for empty responses
      }
    }
  }
}

// ============================================================================
// Phoenix Metadata
// ============================================================================

/**
 * Phoenix framework metadata for the ItemsDashboard client.
 * Used for system registration and integration.
 */
export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2]
} as const;
