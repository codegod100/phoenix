/**
 * Represents a category in the system.
 */
export interface Categories {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

/**
 * Data required to create a new category.
 */
export interface CreateCategoriesData {
  name: string;
  description?: string;
}

/**
 * Data required to update an existing category.
 * All fields are optional for partial updates.
 */
export interface UpdateCategoriesData {
  name?: string;
  description?: string;
}

/**
 * Custom error class for API-related errors.
 */
export class CategoriesApiError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'CategoriesApiError';
    this.statusCode = statusCode;
  }
}

/**
 * Client for interacting with the Categories API.
 * Provides methods to list, get, create, update, and delete categories.
 */
export class CategoriesClient {
  private baseUrl: string;

  /**
   * Creates an instance of CategoriesClient.
   * @param baseUrl - The base URL for the Categories API.
   */
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Helper method to handle HTTP responses and errors.
   * @param response - The fetch Response object.
   * @returns The parsed JSON response.
   * @throws {CategoriesApiError} When the response is not ok.
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new CategoriesApiError(
        `API Error (${response.status}): ${errorText}`,
        response.status
      );
    }
    return response.json() as Promise<T>;
  }

  /**
   * Fetches all categories.
   * @returns A promise that resolves to an array of categories.
   * @throws {CategoriesApiError} When the request fails.
   */
  async list(): Promise<Categories[]> {
    const response = await fetch(`${this.baseUrl}/categories`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    return this.handleResponse<Categories[]>(response);
  }

  /**
   * Fetches a single category by its ID.
   * @param id - The unique identifier of the category.
   * @returns A promise that resolves to the category.
   * @throws {CategoriesApiError} When the category is not found or request fails.
   */
  async get(id: number): Promise<Categories> {
    const response = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    return this.handleResponse<Categories>(response);
  }

  /**
   * Creates a new category.
   * @param data - The data for the new category. Name is required, description is optional.
   * @returns A promise that resolves to the created category.
   * @throws {CategoriesApiError} When the request fails or data is invalid.
   */
  async create(data: CreateCategoriesData): Promise<Categories> {
    const response = await fetch(`${this.baseUrl}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse<Categories>(response);
  }

  /**
   * Updates an existing category partially.
   * @param id - The unique identifier of the category to update.
   * @param data - The partial data to update.
   * @returns A promise that resolves to the updated category.
   * @throws {CategoriesApiError} When the category is not found or request fails.
   */
  async update(id: number, data: UpdateCategoriesData): Promise<Categories> {
    const response = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
    });

    return this.handleResponse<Categories>(response);
  }

  /**
   * Deletes a category.
   * @param id - The unique identifier of the category to delete.
   * @returns A promise that resolves when the deletion is complete.
   * @throws {CategoriesApiError} When the category is not found or request fails.
   */
  async delete(id: number): Promise<void> {
    const response = await fetch(`${this.baseUrl}/categories/${id}`, {
      method: 'DELETE',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new CategoriesApiError(
        `API Error (${response.status}): ${errorText}`,
        response.status
      );
    }
  }
}

export default CategoriesClient;

export const _phoenix = { iu_id: 'a8b0eee61d73036c293347a0bdc01b99a2d5166d7b5f427b92f11e458745bd4e', name: 'Categories', risk_tier: 'medium', canon_ids: [6] } as const;
