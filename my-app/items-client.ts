<output>
/**
 * Category interface for item categorization
 */
export interface Category {
  id: number;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Main Items interface representing an inventory item
 */
export interface Items {
  id: number;
  name: string;
  description?: string;
  quantity: number;
  categoryId?: number;
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

/**
 * Data required to create a new item
 * - quantity must be a non-negative integer
 */
export interface CreateItemsData {
  name: string;
  description?: string;
  quantity: number;
  categoryId?: number;
}

/**
 * Data for updating an existing item
 * - quantity must be a non-negative integer when provided
 */
export interface UpdateItemsData {
  name?: string;
  description?: string;
  quantity?: number;
  categoryId?: number;
}

/**
 * Data required to create a new category
 */
export interface CreateCategoryData {
  name: string;
  description?: string;
}

/**
 * Data for updating an existing category
 */
export interface UpdateCategoryData {
  name?: string;
  description?: string;
}

/**
 * Custom error class for Items API errors
 */
export class ItemsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: Response
  ) {
    super(message);
    this.name = 'ItemsApiError';
  }
}

/**
 * Validates that quantity is a non-negative integer
 * @param quantity - The value to validate
 * @param fieldName - Name of the field for error messages
 * @throws {ItemsApiError} If validation fails
 */
function validateQuantity(quantity: number, fieldName: string): void {
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new ItemsApiError(
      `${fieldName} must be a non-negative integer, got: ${quantity}`
    );
  }
}

/**
 * ItemsClient provides CRUD operations for items and categories.
 * All methods use fetch() and return Promises with proper error handling.
 */
export class ItemsClient {
  /**
   * Creates a new ItemsClient instance
   * @param baseUrl - The base URL for the API (e.g., "./items")
   */
  constructor(private baseUrl: string) {}

  /**
   * Helper method to make HTTP requests
   * @param endpoint - API endpoint (relative to baseUrl)
   * @param options - Fetch options
   * @returns Promise resolving to the parsed JSON response
   * @throws {ItemsApiError} On HTTP errors or network failures
   */
  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new ItemsApiError(
          `HTTP Error ${response.status}: ${errorBody || response.statusText}`,
          response.status,
          response
        );
      }

      // Handle empty responses (e.g., DELETE)
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return undefined as T;
      }

      return await response.json() as T;
    } catch (error) {
      if (error instanceof ItemsApiError) {
        throw error;
      }
      throw new ItemsApiError(
        `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Retrieves a list of all items
   * @returns Promise resolving to an array of Items
   * @throws {ItemsApiError} On HTTP errors
   * @example
   * const items = await client.list();
   * console.log(items.length); // Number of items
   */
  async list(): Promise<Items[]> {
    return this.request<Items[]>('/');
  }

  /**
   * Retrieves a single item by its ID
   * @param id - The unique identifier of the item
   * @returns Promise resolving to the requested Items
   * @throws {ItemsApiError} If item not found (404) or other HTTP errors
   * @example
   * const item = await client.get(1);
   * console.log(item.name);
   */
  async get(id: number): Promise<Items> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsApiError('Invalid ID: must be a positive integer');
    }
    return this.request<Items>(`/${id}`);
  }

  /**
   * Creates a new item with validation
   * - Name is required
   * - Quantity must be a non-negative integer
   * @param data - The item data to create
   * @returns Promise resolving to the created Items with generated ID
   * @throws {ItemsApiError} On validation failure or HTTP errors
   * @example
   * const newItem = await client.create({
   *   name: 'Widget',
   *   quantity: 10,
   *   description: 'A useful widget'
   * });
   */
  async create(data: CreateItemsData): Promise<Items> {
    // Validate required fields
    if (!data.name || data.name.trim() === '') {
      throw new ItemsApiError('Validation error: name is required');
    }

    // Validate quantity constraint (non-negative integer)
    validateQuantity(data.quantity, 'quantity');

    return this.request<Items>('/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Updates an existing item with validation
   * - If quantity is provided, it must be a non-negative integer
   * @param id - The unique identifier of the item to update
   * @param data - The partial item data to update
   * @returns Promise resolving to the updated Items
   * @throws {ItemsApiError} On validation failure, if item not found (404), or other HTTP errors
   * @example
   * const updated = await client.update(1, { quantity: 5 });
   * const renamed = await client.update(1, { name: 'Super Widget' });
   */
  async update(id: number, data: UpdateItemsData): Promise<Items> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsApiError('Invalid ID: must be a positive integer');
    }

    // Validate quantity if provided
    if (data.quantity !== undefined) {
      validateQuantity(data.quantity, 'quantity');
    }

    // Validate name if provided (cannot be empty string)
    if (data.name !== undefined && data.name.trim() === '') {
      throw new ItemsApiError('Validation error: name cannot be empty');
    }

    return this.request<Items>(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Deletes an item by its ID
   * @param id - The unique identifier of the item to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {ItemsApiError} If item not found (404) or other HTTP errors
   * @example
   * await client.delete(1);
   * console.log('Item deleted successfully');
   */
  async delete(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsApiError('Invalid ID: must be a positive integer');
    }
    return this.request<void>(`/${id}`, {
      method: 'DELETE',
    });
  }

  // ==========================================
  // Category CRUD Operations
  // ==========================================

  /**
   * Retrieves a list of all categories
   * @returns Promise resolving to an array of Category
   * @throws {ItemsApiError} On HTTP errors
   * @example
   * const categories = await client.listCategories();
   */
  async listCategories(): Promise<Category[]> {
    return this.request<Category[]>('/categories');
  }

  /**
   * Retrieves a single category by its ID
   * @param id - The unique identifier of the category
   * @returns Promise resolving to the requested Category
   * @throws {ItemsApiError} If category not found (404) or other HTTP errors
   * @example
   * const category = await client.getCategory(1);
   */
  async getCategory(id: number): Promise<Category> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsApiError('Invalid ID: must be a positive integer');
    }
    return this.request<Category>(`/categories/${id}`);
  }

  /**
   * Creates a new category
   * @param data - The category data to create
   * @returns Promise resolving to the created Category with generated ID
   * @throws {ItemsApiError} On validation failure or HTTP errors
   * @example
   * const newCategory = await client.createCategory({
   *   name: 'Electronics',
   *   description: 'Electronic devices and accessories'
   * });
   */
  async createCategory(data: CreateCategoryData): Promise<Category> {
    if (!data.name || data.name.trim() === '') {
      throw new ItemsApiError('Validation error: name is required');
    }

    return this.request<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Updates an existing category
   * @param id - The unique identifier of the category to update
   * @param data - The partial category data to update
   * @returns Promise resolving to the updated Category
   * @throws {ItemsApiError} On validation failure, if category not found (404), or other HTTP errors
   * @example
   * const updated = await client.updateCategory(1, { name: 'Updated Electronics' });
   */
  async updateCategory(id: number, data: UpdateCategoryData): Promise<Category> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsApiError('Invalid ID: must be a positive integer');
    }

    if (data.name !== undefined && data.name.trim() === '') {
      throw new ItemsApiError('Validation error: name cannot be empty');
    }

    return this.request<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Deletes a category by its ID
   * @param id - The unique identifier of the category to delete
   * @returns Promise that resolves when deletion is complete
   * @throws {ItemsApiError} If category not found (404) or other HTTP errors
   * @example
   * await client.deleteCategory(1);
   */
  async deleteCategory(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) {
      throw new ItemsApiError('Invalid ID: must be a positive integer');
    }
    return this.request<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  }
}

/**
 * Phoenix framework metadata for the Items client
 * @internal
 */
export const _phoenix = {
  iu_id: 'eec5ac5bc606ad36de28ac8c69305dc84143fff6e480ecca9cbd3cebead7c3f8',
  name: 'Items',
  risk_tier: 'high',
  canon_ids: [4]
} as const;
</output>