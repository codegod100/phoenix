export interface Item {
  id: string;
  name: string;
  quantity: number;
  categoryId: string | null;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ItemsState {
  items: Item[];
  categories: Category[];
  selectedItem: Item | null;
  selectedCategory: Category | null;
  isLoading: boolean;
  error: string | null;
  view: 'items' | 'categories' | 'item-form' | 'category-form';
  formMode: 'create' | 'edit';
}

export class ItemsUI {
  private state: ItemsState;

  constructor() {
    this.state = {
      items: [],
      categories: [],
      selectedItem: null,
      selectedCategory: null,
      isLoading: false,
      error: null,
      view: 'items',
      formMode: 'create'
    };
  }

  updateState(newState: Partial<ItemsState>): void {
    this.state = { ...this.state, ...newState };
  }

  generateHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Management</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    :root {
      --primary: #2563eb;
      --primary-dark: #1d4ed8;
      --danger: #dc2626;
      --danger-dark: #b91c1c;
      --success: #16a34a;
      --success-dark: #15803d;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-500: #6b7280;
      --gray-700: #374151;
      --gray-900: #111827;
      --white: #ffffff;
      --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
      --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
      --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
      --radius: 0.5rem;
    }
    
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: var(--gray-900);
      background-color: var(--gray-50);
      min-height: 100vh;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }
    
    header {
      background-color: var(--white);
      border-bottom: 1px solid var(--gray-200);
      padding: 1.5rem 0;
      margin-bottom: 2rem;
      box-shadow: var(--shadow-sm);
    }
    
    header h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--gray-900);
    }
    
    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid var(--gray-200);
    }
    
    .tab {
      padding: 0.75rem 1.5rem;
      font-weight: 500;
      color: var(--gray-500);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: -2px;
    }
    
    .tab:hover {
      color: var(--primary);
    }
    
    .tab.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      border: none;
      border-radius: var(--radius);
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background-color: var(--primary);
      color: var(--white);
    }
    
    .btn-primary:hover {
      background-color: var(--primary-dark);
    }
    
    .btn-success {
      background-color: var(--success);
      color: var(--white);
    }
    
    .btn-success:hover {
      background-color: var(--success-dark);
    }
    
    .btn-danger {
      background-color: var(--danger);
      color: var(--white);
    }
    
    .btn-danger:hover {
      background-color: var(--danger-dark);
    }
    
    .btn-secondary {
      background-color: var(--gray-100);
      color: var(--gray-700);
    }
    
    .btn-secondary:hover {
      background-color: var(--gray-200);
    }
    
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }
    
    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    
    .card {
      background-color: var(--white);
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }
    
    .card-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--gray-200);
    }
    
    .card-body {
      padding: 1.5rem;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
    }
    
    th, td {
      padding: 0.875rem 1rem;
      text-align: left;
    }
    
    th {
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--gray-500);
      background-color: var(--gray-50);
    }
    
    td {
      border-bottom: 1px solid var(--gray-200);
    }
    
    tr:hover td {
      background-color: var(--gray-50);
    }
    
    .badge {
      display: inline-flex;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
      background-color: var(--gray-100);
      color: var(--gray-700);
    }
    
    .badge-primary {
      background-color: #dbeafe;
      color: var(--primary);
    }
    
    .actions {
      display: flex;
      gap: 0.5rem;
    }
    
    .form-group {
      margin-bottom: 1.25rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gray-700);
    }
    
    label .required {
      color: var(--danger);
      margin-left: 0.25rem;
    }
    
    input[type="text"],
    input[type="number"],
    select,
    textarea {
      width: 100%;
      padding: 0.625rem 0.875rem;
      font-size: 0.875rem;
      border: 1px solid var(--gray-300);
      border-radius: var(--radius);
      background-color: var(--white);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    
    input:focus,
    select:focus,
    textarea:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
    
    input:invalid,
    .input-error {
      border-color: var(--danger);
    }
    
    .error-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1rem;
      margin-bottom: 1rem;
      background-color: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: var(--radius);
      color: var(--danger);
      font-size: 0.875rem;
    }
    
    .success-message {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.875rem 1rem;
      margin-bottom: 1rem;
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-radius: var(--radius);
      color: var(--success-dark);
      font-size: 0.875rem;
    }
    
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
      color: var(--gray-500);
    }
    
    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 2px solid var(--gray-200);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin-right: 0.75rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .empty-state {
      text-align: center;
      padding: 3rem 1.5rem;
      color: var(--gray-500);
    }
    
    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--gray-700);
      margin-bottom: 0.5rem;
    }
    
    .modal-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 50;
    }
    
    .modal {
      background-color: var(--white);
      border-radius: var(--radius);
      box-shadow: var(--shadow-md);
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
    }
    
    .modal-header {
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--gray-200);
    }
    
    .modal-header h2 {
      font-size: 1.25rem;
      font-weight: 600;
    }
    
    .modal-body {
      padding: 1.5rem;
    }
    
    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--gray-200);
      background-color: var(--gray-50);
    }
    
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
    
    .help-text {
      font-size: 0.75rem;
      color: var(--gray-500);
      margin-top: 0.25rem;
    }
    
    @media (max-width: 768px) {
      .toolbar {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }
      
      table {
        font-size: 0.875rem;
      }
      
      th, td {
        padding: 0.625rem;
      }
      
      .actions {
        flex-direction: column;
      }
    }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>📦 Items Management</h1>
    </div>
  </header>
  
  <main class="container">
    <nav class="tabs" role="tablist" aria-label="Main navigation">
      <button class="tab active" role="tab" aria-selected="true" data-view="items" id="tab-items">
        Items
      </button>
      <button class="tab" role="tab" aria-selected="false" data-view="categories" id="tab-categories">
        Categories
      </button>
    </nav>
    
    <div id="notification-area" role="alert" aria-live="polite"></div>
    
    <div id="content">
      <div class="loading">
        <div class="spinner" aria-hidden="true"></div>
        <span>Loading...</span>
      </div>
    </div>
  </main>
  
  <div id="modal-container"></div>

  <script>
    // State management
    const state = {
      items: [],
      categories: [],
      currentView: 'items',
      loading: false,
      error: null
    };

    // API endpoints
    const API_BASE = './items';
    const CATEGORIES_API = './categories';

    // DOM elements
    const contentEl = document.getElementById('content');
    const notificationEl = document.getElementById('notification-area');
    const modalContainer = document.getElementById('modal-container');
    const tabItems = document.getElementById('tab-items');
    const tabCategories = document.getElementById('tab-categories');

    // Utility functions
    function showNotification(message, type = 'error') {
      notificationEl.innerHTML = type === 'error' 
        ? \`<div class="error-message"><span aria-hidden="true">⚠️</span> \${escapeHtml(message)}</div>\`
        : \`<div class="success-message"><span aria-hidden="true">✅</span> \${escapeHtml(message)}</div>\`;
      setTimeout(() => notificationEl.innerHTML = '', 5000);
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function formatDate(dateString) {
      return new Date(dateString).toLocaleDateString();
    }

    function getCategoryName(categoryId) {
      if (!categoryId) return 'Uncategorized';
      const cat = state.categories.find(c => c.id === categoryId);
      return cat ? cat.name : 'Unknown';
    }

    // API functions
    async function fetchItems() {
      const response = await fetch(API_BASE);
      if (!response.ok) throw new Error('Failed to fetch items');
      return response.json();
    }

    async function fetchCategories() {
      const response = await fetch(CATEGORIES_API);
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    }

    async function createItem(item) {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!response.ok) throw new Error('Failed to create item');
      return response.json();
    }

    async function updateItem(id, item) {
      const response = await fetch(\`\${API_BASE}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      });
      if (!response.ok) throw new Error('Failed to update item');
      return response.json();
    }

    async function deleteItem(id) {
      const response = await fetch(\`\${API_BASE}/\${id}\`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete item');
    }

    async function createCategory(category) {
      const response = await fetch(CATEGORIES_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
      if (!response.ok) throw new Error('Failed to create category');
      return response.json();
    }

    async function updateCategory(id, category) {
      const response = await fetch(\`\${CATEGORIES_API}/\${id}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(category)
      });
      if (!response.ok) throw new Error('Failed to update category');
      return response.json();
    }

    async function deleteCategory(id) {
      const response = await fetch(\`\${CATEGORIES_API}/\${id}\`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete category');
    }

    // Validation functions
    function validateItem(item) {
      const errors = [];
      if (!item.name || item.name.trim() === '') {
        errors.push('Name is required');
      }
      if (item.quantity === undefined || item.quantity === null) {
        errors.push('Quantity is required');
      } else if (!Number.isInteger(item.quantity) || item.quantity < 0) {
        errors.push('Quantity must be a non-negative integer');
      }
      return errors;
    }

    function validateCategory(category) {
      const errors = [];
      if (!category.name || category.name.trim() === '') {
        errors.push('Name is required');
      }
      return errors;
    }

    // View rendering
    function renderItemsView() {
      if (state.items.length === 0) {
        return \`
          <div class="card">
            <div class="empty-state">
              <h3>No items yet</h3>
              <p>Get started by creating your first item.</p>
              <br>
              <button class="btn btn-primary" onclick="showItemModal()">
                <span aria-hidden="true">+</span> Create Item
              </button>
            </div>
          </div>
        \`;
      }

      return \`
        <div class="toolbar">
          <div></div>
          <button class="btn btn-primary" onclick="showItemModal()">
            <span aria-hidden="true">+</span> Create Item
          </button>
        </div>
        <div class="card">
          <table role="grid" aria-label="Items list">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Category</th>
                <th scope="col">Quantity</th>
                <th scope="col">Updated</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              \${state.items.map(item => \`
                <tr>
                  <td><strong>\${escapeHtml(item.name)}</strong></td>
                  <td><span class="badge badge-primary">\${escapeHtml(getCategoryName(item.categoryId))}</span></td>
                  <td>\${item.quantity}</td>
                  <td>\${formatDate(item.updatedAt)}</td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-sm btn-secondary" onclick="showItemModal('\${item.id}')" aria-label="Edit \${escapeHtml(item.name)}">
                        Edit
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="confirmDeleteItem('\${item.id}', '\${escapeHtml(item.name)}')" aria-label="Delete \${escapeHtml(item.name)}">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
    }

    function renderCategoriesView() {
      if (state.categories.length === 0) {
        return \`
          <div class="card">
            <div class="empty-state">
              <h3>No categories yet</h3>
              <p>Create categories to organize your items.</p>
              <br>
              <button class="btn btn-success" onclick="showCategoryModal()">
                <span aria-hidden="true">+</span> Create Category
              </button>
            </div>
          </div>
        \`;
      }

      return \`
        <div class="toolbar">
          <div></div>
          <button class="btn btn-success" onclick="showCategoryModal()">
            <span aria-hidden="true">+</span> Create Category
          </button>
        </div>
        <div class="card">
          <table role="grid" aria-label="Categories list">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Description</th>
                <th scope="col">Items Count</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              \${state.categories.map(cat => \`
                <tr>
                  <td><strong>\${escapeHtml(cat.name)}</strong></td>
                  <td>\${cat.description ? escapeHtml(cat.description) : '—'}</td>
                  <td>\${state.items.filter(i => i.categoryId === cat.id).length}</td>
                  <td>
                    <div class="actions">
                      <button class="btn btn-sm btn-secondary" onclick="showCategoryModal('\${cat.id}')" aria-label="Edit \${escapeHtml(cat.name)}">
                        Edit
                      </button>
                      <button class="btn btn-sm btn-danger" onclick="confirmDeleteCategory('\${cat.id}', '\${escapeHtml(cat.name)}')" aria-label="Delete \${escapeHtml(cat.name)}">
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              \`).join('')}
            </tbody>
          </table>
        </div>
      \`;
    }

    // Modal functions
    function showItemModal(itemId = null) {
      const isEdit = !!itemId;
      const item = isEdit ? state.items.find(i => i.id === itemId) : null;
      
      const categoryOptions = state.categories.map(c => 
        \`<option value="\${c.id}" \${item?.categoryId === c.id ? 'selected' : ''}>\${escapeHtml(c.name)}</option>\`
      ).join('');

      modalContainer.innerHTML = \`
        <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="item-modal-title">
            <form id="item-form" onsubmit="handleItemSubmit(event)">
              <div class="modal-header">
                <h2 id="item-modal-title">\${isEdit ? 'Edit Item' : 'Create Item'}</h2>
              </div>
              <div class="modal-body">
                <input type="hidden" name="id" value="\${item?.id || ''}">
                <div class="form-group">
                  <label for="item-name">
                    Name<span class="required" aria-label="required">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="item-name" 
                    name="name" 
                    value="\${item?.name || ''}" 
                    required
                    minlength="1"
                    aria-describedby="item-name-help"
                    placeholder="Enter item name"
                  >
                  <p id="item-name-help" class="help-text">Name cannot be empty.</p>
                </div>
                <div class="form-group">
                  <label for="item-category">Category</label>
                  <select id="item-category" name="categoryId">
                    <option value="">— Select category —</option>
                    \${categoryOptions}
                  </select>
                </div>
                <div class="form-group">
                  <label for="item-quantity">
                    Quantity<span class="required" aria-label="required">*</span>
                  </label>
                  <input 
                    type="number" 
                    id="item-quantity" 
                    name="quantity" 
                    value="\${item?.quantity ?? 0}" 
                    min="0"
                    step="1"
                    required
                    aria-describedby="item-quantity-help"
                  >
                  <p id="item-quantity-help" class="help-text">Must be a non-negative integer.</p>
                </div>
                <div class="form-group">
                  <label for="item-description">Description</label>
                  <textarea 
                    id="item-description" 
                    name="description" 
                    rows="3"
                    placeholder="Optional description"
                  >\${item?.description || ''}</textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-primary">
                  \${isEdit ? 'Update Item' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      \`;
      
      document.getElementById('item-name').focus();
    }

    function showCategoryModal(categoryId = null) {
      const isEdit = !!categoryId;
      const category = isEdit ? state.categories.find(c => c.id === categoryId) : null;

      modalContainer.innerHTML = \`
        <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
          <div class="modal" role="dialog" aria-modal="true" aria-labelledby="category-modal-title">
            <form id="category-form" onsubmit="handleCategorySubmit(event)">
              <div class="modal-header">
                <h2 id="category-modal-title">\${isEdit ? 'Edit Category' : 'Create Category'}</h2>
              </div>
              <div class="modal-body">
                <input type="hidden" name="id" value="\${category?.id || ''}">
                <div class="form-group">
                  <label for="category-name">
                    Name<span class="required" aria-label="required">*</span>
                  </label>
                  <input 
                    type="text" 
                    id="category-name" 
                    name="name" 
                    value="\${category?.name || ''}" 
                    required
                    minlength="1"
                    aria-describedby="category-name-help"
                    placeholder="Enter category name"
                  >
                  <p id="category-name-help" class="help-text">Name cannot be empty.</p>
                </div>
                <div class="form-group">
                  <label for="category-description">Description</label>
                  <textarea 
                    id="category-description" 
                    name="description" 
                    rows="3"
                    placeholder="Optional description"
                  >\${category?.description || ''}</textarea>
                </div>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
                <button type="submit" class="btn btn-success">
                  \${isEdit ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      \`;
      
      document.getElementById('category-name').focus();
    }

    function confirmDeleteItem(id, name) {
      modalContainer.innerHTML = \`
        <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
          <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title" aria-describedby="delete-desc">
            <div class="modal-header">
              <h2 id="delete-title">Delete Item</h2>
            </div>
            <div class="modal-body">
              <p id="delete-desc">Are you sure you want to delete "\${escapeHtml(name)}"? This action cannot be undone.</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="button" class="btn btn-danger" onclick="handleDeleteItem('\${id}')">Delete</button>
            </div>
          </div>
        </div>
      \`;
    }

    function confirmDeleteCategory(id, name) {
      const itemCount = state.items.filter(i => i.categoryId === id).length;
      const warningText = itemCount > 0 
        ? \`<p class="error-message"><strong>Warning:</strong> This category has \${itemCount} item(s). Items will become uncategorized.</p>\`
        : '';
      
      modalContainer.innerHTML = \`
        <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
          <div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-cat-title" aria-describedby="delete-cat-desc">
            <div class="modal-header">
              <h2 id="delete-cat-title">Delete Category</h2>
            </div>
            <div class="modal-body">
              <p id="delete-cat-desc">Are you sure you want to delete "\${escapeHtml(name)}"? This action cannot be undone.</p>
              \${warningText}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
              <button type="button" class="btn btn-danger" onclick="handleDeleteCategory('\${id}')">Delete</button>
            </div>
          </div>
        </div>
      \`;
    }

    function closeModal() {
      modalContainer.innerHTML = '';
    }

    // Form handlers
    async function handleItemSubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const id = formData.get('id');
      const item = {
        name: formData.get('name').trim(),
        categoryId: formData.get('categoryId') || null,
        quantity: parseInt(formData.get('quantity'), 10),
        description: formData.get('description').trim() || undefined
      };

      const errors = validateItem(item);
      if (errors.length > 0) {
        showNotification(errors.join(', '));
        return;
      }

      try {
        state.loading = true;
        if (id) {
          await updateItem(id, item);
          showNotification('Item updated successfully', 'success');
        } else {
          await createItem(item);
          showNotification('Item created successfully', 'success');
        }
        closeModal();
        await loadData();
      } catch (err) {
        showNotification(err.message);
      } finally {
        state.loading = false;
      }
    }

    async function handleCategorySubmit(event) {
      event.preventDefault();
      const formData = new FormData(event.target);
      const id = formData.get('id');
      const category = {
        name: formData.get('name').trim(),
        description: formData.get('description').trim() || undefined
      };

      const errors = validateCategory(category);
      if (errors.length > 0) {
        showNotification(errors.join(', '));
        return;
      }

      try {
        state.loading = true;
        if (id) {
          await updateCategory(id, category);
          showNotification('Category updated successfully', 'success');
        } else {
          await createCategory(category);
          showNotification('Category created successfully', 'success');
        }
        closeModal();
        await loadData();
      } catch (err) {
        showNotification(err.message);
      } finally {
        state.loading = false;
      }
    }

    async function handleDeleteItem(id) {
      try {
        state.loading = true;
        await deleteItem(id);
        closeModal();
        showNotification('Item deleted successfully', 'success');
        await loadData();
      } catch (err) {
        showNotification(err.message);
      } finally {
        state.loading = false;
      }
    }

    async function handleDeleteCategory(id) {
      try {
        state.loading = true;
        await deleteCategory(id);
        closeModal();
        showNotification('Category deleted successfully', 'success');
        await loadData();
      } catch (err) {
        showNotification(err.message);
      } finally {
        state.loading = false;
      }
    }

    // Data loading
    async function loadData() {
      contentEl.innerHTML = '<div class="loading"><div class="spinner" aria-hidden="true"></div><span>Loading...</span></div>';
      
      try {
        const [items, categories] = await Promise.all([fetchItems(), fetchCategories()]);
        state.items = items;
        state.categories = categories;
        render();
      } catch (err) {
        contentEl.innerHTML = \`
          <div class="error-message">
            Failed to load data. <button class="btn btn-sm btn-secondary" onclick="loadData()">Retry</button>
          </div>
        \`;
      }
    }

    // Rendering
    function render() {
      if (state.currentView === 'items') {
        contentEl.innerHTML = renderItemsView();
      } else {
        contentEl.innerHTML = renderCategoriesView();
      }
    }

    // Tab switching
    function switchView(view) {
      state.currentView = view;
      tabItems.classList.toggle('active', view === 'items');
      tabItems.setAttribute('aria-selected', view === 'items');
      tabCategories.classList.toggle('active', view === 'categories');
      tabCategories.setAttribute('aria-selected', view === 'categories');
      render();
    }

    // Event listeners
    tabItems.addEventListener('click', () => switchView('items'));
    tabCategories.addEventListener('click', () => switchView('categories'));

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modalContainer.innerHTML) {
        closeModal();
      }
    });

    // Initialize
    loadData();
  </script>
</body>
</html>`;
  }
}
