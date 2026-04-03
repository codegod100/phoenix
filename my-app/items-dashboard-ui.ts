export interface ItemsDashboardState {
  items: Array<{
    id: string;
    name: string;
    category: string;
    description: string;
    createdAt: string;
  }>;
  categories: string[];
  selectedCategory: string | null;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;
  editingItem: {
    id: string;
    name: string;
    category: string;
    description: string;
  } | null;
  showCreateModal: boolean;
  showEditModal: boolean;
  showDeleteConfirm: string | null;
}

export class ItemsDashboardUI {
  private state: ItemsDashboardState;

  constructor() {
    this.state = {
      items: [],
      categories: [],
      selectedCategory: null,
      searchQuery: '',
      isLoading: false,
      error: null,
      editingItem: null,
      showCreateModal: false,
      showEditModal: false,
      showDeleteConfirm: null
    };
  }

  updateState(newState: Partial<ItemsDashboardState>): void {
    this.state = { ...this.state, ...newState };
  }

  generateHTML(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    :root {
      --primary: #2563eb;
      --primary-hover: #1d4ed8;
      --secondary: #64748b;
      --danger: #dc2626;
      --danger-hover: #b91c1c;
      --success: #16a34a;
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #1e293b;
      --text-muted: #64748b;
      --shadow: 0 1px 3px rgba(0,0,0,0.1);
      --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1);
      --radius: 8px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    header {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
    }

    .filters {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      flex: 1;
      min-width: 280px;
    }

    .search-box {
      position: relative;
      flex: 1;
      min-width: 200px;
    }

    .search-box input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }

    .search-box input:focus {
      outline: none;
      border-color: var(--primary);
    }

    .search-box svg {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      color: var(--text-muted);
    }

    select {
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.875rem;
      background: var(--surface);
      cursor: pointer;
      min-width: 150px;
    }

    select:focus {
      outline: none;
      border-color: var(--primary);
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border: none;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-hover);
    }

    .btn-secondary {
      background: var(--surface);
      color: var(--text);
      border: 1px solid var(--border);
    }

    .btn-secondary:hover {
      background: var(--bg);
    }

    .btn-danger {
      background: var(--danger);
      color: white;
    }

    .btn-danger:hover {
      background: var(--danger-hover);
    }

    .btn-sm {
      padding: 6px 12px;
      font-size: 0.75rem;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .items-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }

    .item-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 20px;
      box-shadow: var(--shadow);
      transition: box-shadow 0.2s;
    }

    .item-card:hover {
      box-shadow: var(--shadow-lg);
    }

    .item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .item-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .item-category {
      display: inline-block;
      padding: 4px 10px;
      background: var(--bg);
      color: var(--text-muted);
      font-size: 0.75rem;
      font-weight: 500;
      border-radius: 9999px;
      text-transform: uppercase;
      letter-spacing: 0.025em;
    }

    .item-description {
      color: var(--text-muted);
      font-size: 0.875rem;
      margin-bottom: 12px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .item-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      border-top: 1px solid var(--border);
    }

    .item-date {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    .item-actions {
      display: flex;
      gap: 8px;
    }

    .empty-state {
      text-align: center;
      padding: 64px 24px;
      color: var(--text-muted);
    }

    .empty-state svg {
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
      color: var(--border);
    }

    .empty-state h3 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--text);
      margin-bottom: 8px;
    }

    .loading {
      text-align: center;
      padding: 64px;
      color: var(--text-muted);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--border);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      color: var(--danger);
      padding: 12px 16px;
      border-radius: var(--radius);
      margin-bottom: 16px;
    }

    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      z-index: 100;
      opacity: 0;
      visibility: hidden;
      transition: all 0.2s;
    }

    .modal-overlay.active {
      opacity: 1;
      visibility: visible;
    }

    .modal {
      background: var(--surface);
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 480px;
      max-height: 90vh;
      overflow: auto;
      transform: scale(0.95);
      transition: transform 0.2s;
    }

    .modal-overlay.active .modal {
      transform: scale(1);
    }

    .modal-header {
      padding: 20px 24px;
      border-bottom: 1px solid var(--border);
    }

    .modal-title {
      font-size: 1.25rem;
      font-weight: 600;
    }

    .modal-body {
      padding: 24px;
    }

    .form-group {
      margin-bottom: 16px;
    }

    .form-group label {
      display: block;
      font-size: 0.875rem;
      font-weight: 500;
      margin-bottom: 6px;
    }

    .form-group input,
    .form-group textarea,
    .form-group select {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-family: inherit;
    }

    .form-group input:focus,
    .form-group textarea:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--primary);
    }

    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }

    .modal-footer {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid var(--border);
    }

    .delete-confirm {
      text-align: center;
      padding: 8px 0;
    }

    .delete-confirm p {
      margin-bottom: 8px;
    }

    .delete-confirm strong {
      color: var(--danger);
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

    @media (max-width: 640px) {
      .container {
        padding: 16px;
      }

      header {
        flex-direction: column;
        align-items: stretch;
      }

      .filters {
        flex-direction: column;
      }

      .items-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>Items Dashboard</h1>
      <div class="filters">
        <div class="search-box">
          <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" />
          </svg>
          <input type="search" id="searchInput" placeholder="Search items..." aria-label="Search items">
        </div>
        <select id="categoryFilter" aria-label="Filter by category">
          <option value="">All Categories</option>
        </select>
      </div>
      <button class="btn btn-primary" id="createBtn" type="button">
        <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        Create Item
      </button>
    </header>

    <div id="errorContainer"></div>
    <div id="content">
      <div class="loading">
        <div class="spinner" role="status">
          <span class="sr-only">Loading...</span>
        </div>
        <p>Loading items...</p>
      </div>
    </div>
  </div>

  <!-- Create Modal -->
  <div class="modal-overlay" id="createModal" role="dialog" aria-modal="true" aria-labelledby="createTitle">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title" id="createTitle">Create New Item</h2>
      </div>
      <form id="createForm">
        <div class="modal-body">
          <div class="form-group">
            <label for="createName">Name *</label>
            <input type="text" id="createName" name="name" required maxlength="100">
          </div>
          <div class="form-group">
            <label for="createCategory">Category *</label>
            <select id="createCategory" name="category" required>
              <option value="">Select category</option>
            </select>
          </div>
          <div class="form-group">
            <label for="createDescription">Description</label>
            <textarea id="createDescription" name="description" maxlength="500"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Create</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Edit Modal -->
  <div class="modal-overlay" id="editModal" role="dialog" aria-modal="true" aria-labelledby="editTitle">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title" id="editTitle">Edit Item</h2>
      </div>
      <form id="editForm">
        <input type="hidden" id="editId" name="id">
        <div class="modal-body">
          <div class="form-group">
            <label for="editName">Name *</label>
            <input type="text" id="editName" name="name" required maxlength="100">
          </div>
          <div class="form-group">
            <label for="editCategory">Category *</label>
            <select id="editCategory" name="category" required>
              <option value="">Select category</option>
            </select>
          </div>
          <div class="form-group">
            <label for="editDescription">Description</label>
            <textarea id="editDescription" name="description" maxlength="500"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Save Changes</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Confirm Modal -->
  <div class="modal-overlay" id="deleteModal" role="dialog" aria-modal="true" aria-labelledby="deleteTitle">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title" id="deleteTitle">Confirm Delete</h2>
      </div>
      <div class="modal-body">
        <div class="delete-confirm">
          <p>Are you sure you want to delete this item?</p>
          <p>This action <strong>cannot be undone</strong>.</p>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
        <button type="button" class="btn btn-danger" id="confirmDelete">Delete</button>
      </div>
    </div>
  </div>

  <script>
    (function() {
      // State
      let items = [];
      let categories = [];
      let selectedCategory = '';
      let searchQuery = '';
      let deleteItemId = null;

      // DOM Elements
      const content = document.getElementById('content');
      const errorContainer = document.getElementById('errorContainer');
      const searchInput = document.getElementById('searchInput');
      const categoryFilter = document.getElementById('categoryFilter');
      const createBtn = document.getElementById('createBtn');
      const createModal = document.getElementById('createModal');
      const editModal = document.getElementById('editModal');
      const deleteModal = document.getElementById('deleteModal');
      const createForm = document.getElementById('createForm');
      const editForm = document.getElementById('editForm');
      const confirmDeleteBtn = document.getElementById('confirmDelete');
      const createCategory = document.getElementById('createCategory');
      const editCategory = document.getElementById('editCategory');

      // API Helper
      async function api(url, options = {}) {
        const response = await fetch(url, {
          headers: { 'Content-Type': 'application/json' },
          ...options
        });
        if (!response.ok) {
          const error = await response.text();
          throw new Error(error || 'Request failed');
        }
        return response.json();
      }

      // Load Data
      async function loadItems() {
        showLoading();
        try {
          const params = new URLSearchParams();
          if (selectedCategory) params.append('category', selectedCategory);
          if (searchQuery) params.append('search', searchQuery);
          
          const data = await api('./items-dashboard?' + params.toString());
          items = data.items || [];
          categories = data.categories || [];
          render();
          updateCategoryOptions();
        } catch (err) {
          showError(err.message);
        }
      }

      function showLoading() {
        content.innerHTML = '<div class="loading"><div class="spinner" role="status"><span class="sr-only">Loading...</span></div><p>Loading items...</p></div>';
        errorContainer.innerHTML = '';
      }

      function showError(message) {
        errorContainer.innerHTML = '<div class="error-message" role="alert">' + escapeHtml(message) + '</div>';
        content.innerHTML = '';
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function updateCategoryOptions() {
        const options = '<option value="">All Categories</option>' + 
          categories.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
        categoryFilter.innerHTML = options;
        categoryFilter.value = selectedCategory;
        
        const catOptions = '<option value="">Select category</option>' + 
          categories.map(c => '<option value="' + escapeHtml(c) + '">' + escapeHtml(c) + '</option>').join('');
        createCategory.innerHTML = catOptions;
        editCategory.innerHTML = catOptions;
      }

      function render() {
        if (items.length === 0) {
          content.innerHTML = '<div class="empty-state"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg><h3>No items found</h3><p>Try adjusting your filters or create a new item.</p></div>';
          return;
        }

        const html = '<div class="items-grid">' + items.map(item => 
          '<article class="item-card">' +
            '<div class="item-header">' +
              '<div>' +
                '<h3 class="item-title">' + escapeHtml(item.name) + '</h3>' +
                '<span class="item-category">' + escapeHtml(item.category) + '</span>' +
              '</div>' +
            '</div>' +
            '<p class="item-description">' + (item.description ? escapeHtml(item.description) : 'No description') + '</p>' +
            '<div class="item-footer">' +
              '<span class="item-date">' + formatDate(item.createdAt) + '</span>' +
              '<div class="item-actions">' +
                '<button class="btn btn-secondary btn-sm" data-edit="' + escapeHtml(item.id) + '" type="button">Edit</button>' +
                '<button class="btn btn-danger btn-sm" data-delete="' + escapeHtml(item.id) + '" type="button">Delete</button>' +
              '</div>' +
            '</div>' +
          '</article>'
        ).join('') + '</div>';

        content.innerHTML = html;
      }

      function formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString();
      }

      // Modal Functions
      function openModal(modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        const focusable = modal.querySelector('input, select, textarea, button:not([data-close-modal])');
        if (focusable) focusable.focus();
      }

      function closeModal(modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
        if (modal.querySelector('form')) modal.querySelector('form').reset();
      }

      function closeAllModals() {
        [createModal, editModal, deleteModal].forEach(closeModal);
      }

      // Event Handlers
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        loadItems();
      });

      categoryFilter.addEventListener('change', (e) => {
        selectedCategory = e.target.value;
        loadItems();
      });

      createBtn.addEventListener('click', () => openModal(createModal));

      document.querySelectorAll('[data-close-modal]').forEach(btn => {
        btn.addEventListener('click', () => closeAllModals());
      });

      [createModal, editModal, deleteModal].forEach(modal => {
        modal.addEventListener('click', (e) => {
          if (e.target === modal) closeAllModals();
        });
      });

      content.addEventListener('click', (e) => {
        if (e.target.dataset.edit) {
          const item = items.find(i => i.id === e.target.dataset.edit);
          if (item) {
            document.getElementById('editId').value = item.id;
            document.getElementById('editName').value = item.name;
            document.getElementById('editCategory').value = item.category;
            document.getElementById('editDescription').value = item.description || '';
            openModal(editModal);
          }
        } else if (e.target.dataset.delete) {
          deleteItemId = e.target.dataset.delete;
          openModal(deleteModal);
        }
      });

      createForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(createForm);
        try {
          await api('./items-dashboard', {
            method: 'POST',
            body: JSON.stringify({
              name: formData.get('name'),
              category: formData.get('category'),
              description: formData.get('description')
            })
          });
          closeAllModals();
          loadItems();
        } catch (err) {
          alert('Failed to create item: ' + err.message);
        }
      });

      editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(editForm);
        try {
          await api('./items-dashboard/' + formData.get('id'), {
            method: 'PUT',
            body: JSON.stringify({
              name: formData.get('name'),
              category: formData.get('category'),
              description: formData.get('description')
            })
          });
          closeAllModals();
          loadItems();
        } catch (err) {
          alert('Failed to update item: ' + err.message);
        }
      });

      confirmDeleteBtn.addEventListener('click', async () => {
        if (!deleteItemId) return;
        try {
          await api('./items-dashboard/' + deleteItemId, { method: 'DELETE' });
          closeAllModals();
          deleteItemId = null;
          loadItems();
        } catch (err) {
          alert('Failed to delete item: ' + err.message);
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
      });

      // Initial Load
      loadItems();
    })();
  </script>
</body>
</html>`;
  }
}
