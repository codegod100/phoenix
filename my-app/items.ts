interface Item {
  id: string;
  name: string;
  quantity: number;
  categoryId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Category {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemsState {
  items: Item[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
  editingItem: Item | null;
  editingCategory: Category | null;
  showItemModal: boolean;
  showCategoryModal: boolean;
  modalMode: 'create' | 'edit';
}

class ItemsUI {
  private state: ItemsState;

  constructor() {
    this.state = {
      items: [],
      categories: [],
      isLoading: false,
      error: null,
      editingItem: null,
      editingCategory: null,
      showItemModal: false,
      showCategoryModal: false,
      modalMode: 'create'
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
      --primary: #3b82f6;
      --primary-dark: #2563eb;
      --danger: #ef4444;
      --danger-dark: #dc2626;
      --success: #10b981;
      --success-dark: #059669;
      --gray-50: #f9fafb;
      --gray-100: #f3f4f6;
      --gray-200: #e5e7eb;
      --gray-300: #d1d5db;
      --gray-400: #9ca3af;
      --gray-500: #6b7280;
      --gray-600: #4b5563;
      --gray-700: #374151;
      --gray-800: #1f2937;
      --gray-900: #111827;
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --radius: 0.5rem;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: var(--gray-50);
      color: var(--gray-800);
      line-height: 1.5;
      min-height: 100vh;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 1rem;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid var(--gray-200);
    }

    h1 {
      font-size: 1.875rem;
      font-weight: 700;
      color: var(--gray-900);
    }

    .tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      background: var(--gray-100);
      padding: 0.375rem;
      border-radius: var(--radius);
      width: fit-content;
    }

    .tab {
      padding: 0.5rem 1rem;
      border: none;
      background: transparent;
      color: var(--gray-600);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      border-radius: calc(var(--radius) - 0.25rem);
      transition: all 0.15s ease;
    }

    .tab:hover {
      color: var(--gray-800);
    }

    .tab.active {
      background: white;
      color: var(--gray-800);
      box-shadow: var(--shadow-sm);
    }

    .tab:focus {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .section {
      display: none;
    }

    .section.active {
      display: block;
    }

    .toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 1rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: var(--radius);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .btn:focus {
      outline: 2px solid var(--primary);
      outline-offset: 2px;
    }

    .btn-primary {
      background: var(--primary);
      color: white;
    }

    .btn-primary:hover {
      background: var(--primary-dark);
    }

    .btn-danger {
      background: var(--danger);
      color: white;
    }

    .btn-danger:hover {
      background: var(--danger-dark);
    }

    .btn-success {
      background: var(--success);
      color: white;
    }

    .btn-success:hover {
      background: var(--success-dark);
    }

    .btn-secondary {
      background: var(--gray-200);
      color: var(--gray-700);
    }

    .btn-secondary:hover {
      background: var(--gray-300);
    }

    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }

    .btn-icon {
      padding: 0.375rem;
    }

    .card {
      background: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }

    thead {
      background: var(--gray-50);
    }

    th {
      padding: 0.75rem 1rem;
      text-align: left;
      font-weight: 600;
      color: var(--gray-600);
      text-transform: uppercase;
      font-size: 0.75rem;
      letter-spacing: 0.025em;
      border-bottom: 1px solid var(--gray-200);
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid var(--gray-100);
    }

    tbody tr:hover {
      background: var(--gray-50);
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .badge {
      display: inline-flex;
      padding: 0.25rem 0.5rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      background: var(--gray-100);
      color: var(--gray-700);
    }

    .badge-primary {
      background: #dbeafe;
      color: #1e40af;
    }

    .empty-state {
      padding: 3rem 1rem;
      text-align: center;
      color: var(--gray-500);
    }

    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .modal-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 50;
      padding: 1rem;
    }

    .modal-overlay.active {
      display: flex;
    }

    .modal {
      background: white;
      border-radius: var(--radius);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 28rem;
      max-height: 90vh;
      overflow-y: auto;
      animation: modalIn 0.15s ease;
    }

    @keyframes modalIn {
      from {
        opacity: 0;
        transform: scale(0.95) translateY(-10px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    .modal-header {
      padding: 1rem 1.5rem;
      border-bottom: 1px solid var(--gray-200);
    }

    .modal-header h2 {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--gray-900);
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
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group:last-child {
      margin-bottom: 0;
    }

    .form-label {
      display: block;
      margin-bottom: 0.375rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--gray-700);
    }

    .form-input, .form-select {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid var(--gray-300);
      border-radius: var(--radius);
      font-size: 0.875rem;
      transition: border-color 0.15s ease, box-shadow 0.15s ease;
    }

    .form-input:focus, .form-select:focus {
      outline: none;
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .form-input:invalid, .form-select:invalid {
      border-color: var(--danger);
    }

    .form-input::placeholder {
      color: var(--gray-400);
    }

    .form-error {
      display: none;
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--danger);
    }

    .form-group.has-error .form-error {
      display: block;
    }

    .form-group.has-error .form-input,
    .form-group.has-error .form-select {
      border-color: var(--danger);
    }

    .form-hint {
      margin-top: 0.375rem;
      font-size: 0.75rem;
      color: var(--gray-500);
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 3rem;
    }

    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--gray-200);
      border-top-color: var(--primary);
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .alert {
      display: none;
      padding: 0.75rem 1rem;
      border-radius: var(--radius);
      margin-bottom: 1rem;
      font-size: 0.875rem;
    }

    .alert.active {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .alert-error {
      background: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    .alert-success {
      background: #d1fae5;
      color: #065f46;
      border: 1px solid #a7f3d0;
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
      .header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      h1 {
        font-size: 1.5rem;
      }

      th, td {
        padding: 0.75rem;
      }

      .actions {
        flex-direction: column;
      }

      .btn-sm {
        padding: 0.5rem 0.625rem;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert alert-error" id="errorAlert" role="alert">
      <span aria-hidden="true">⚠️</span>
      <span id="errorMessage"></span>
    </div>
    <div class="alert alert-success" id="successAlert" role="status">
      <span aria-hidden="true">✓</span>
      <span id="successMessage"></span>
    </div>

    <header class="header">
      <h1>Items Management</h1>
    </header>

    <nav class="tabs" role="tablist" aria-label="Management sections">
      <button class="tab active" id="tab-items" role="tab" aria-selected="true" aria-controls="items-section" tabindex="0">
        📦 Items
      </button>
      <button class="tab" id="tab-categories" role="tab" aria-selected="false" aria-controls="categories-section" tabindex="-1">
        🏷️ Categories
      </button>
    </nav>

    <section id="items-section" class="section active" role="tabpanel" aria-labelledby="tab-items">
      <div class="toolbar">
        <button class="btn btn-primary" onclick="openItemModal('create')" aria-label="Create new item">
          <span aria-hidden="true">+</span> Add Item
        </button>
      </div>
      <div class="card">
        <div class="table-container">
          <table aria-label="Items list">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Quantity</th>
                <th scope="col">Category</th>
                <th scope="col" class="actions">Actions</th>
              </tr>
            </thead>
            <tbody id="itemsTableBody">
              <tr>
                <td colspan="4">
                  <div class="loading" aria-label="Loading items">
                    <div class="spinner"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section id="categories-section" class="section" role="tabpanel" aria-labelledby="tab-categories" hidden>
      <div class="toolbar">
        <button class="btn btn-primary" onclick="openCategoryModal('create')" aria-label="Create new category">
          <span aria-hidden="true">+</span> Add Category
        </button>
      </div>
      <div class="card">
        <div class="table-container">
          <table aria-label="Categories list">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Item Count</th>
                <th scope="col" class="actions">Actions</th>
              </tr>
            </thead>
            <tbody id="categoriesTableBody">
              <tr>
                <td colspan="3">
                  <div class="loading" aria-label="Loading categories">
                    <div class="spinner"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  </div>

  <div class="modal-overlay" id="itemModalOverlay" role="dialog" aria-modal="true" aria-labelledby="itemModalTitle">
    <div class="modal">
      <div class="modal-header">
        <h2 id="itemModalTitle">Add Item</h2>
      </div>
      <form id="itemForm" novalidate>
        <div class="modal-body">
          <input type="hidden" id="itemId">
          <div class="form-group" id="itemNameGroup">
            <label class="form-label" for="itemName">Name *</label>
            <input type="text" id="itemName" class="form-input" required placeholder="Enter item name" aria-describedby="itemNameHint itemNameError">
            <p class="form-hint" id="itemNameHint">Item name must not be empty</p>
            <p class="form-error" id="itemNameError" role="alert">Name is required</p>
          </div>
          <div class="form-group" id="itemQuantityGroup">
            <label class="form-label" for="itemQuantity">Quantity *</label>
            <input type="number" id="itemQuantity" class="form-input" required min="0" step="1" placeholder="0" aria-describedby="itemQuantityHint itemQuantityError">
            <p class="form-hint" id="itemQuantityHint">Must be a non-negative integer</p>
            <p class="form-error" id="itemQuantityError" role="alert">Quantity must be a non-negative integer</p>
          </div>
          <div class="form-group">
            <label class="form-label" for="itemCategory">Category</label>
            <select id="itemCategory" class="form-select" aria-describedby="itemCategoryHint">
              <option value="">No category</option>
            </select>
            <p class="form-hint" id="itemCategoryHint">Optional category assignment</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Cancel</button>
          <button type="submit" class="btn btn-success">Save</button>
        </div>
      </form>
    </div>
  </div>

  <div class="modal-overlay" id="categoryModalOverlay" role="dialog" aria-modal="true" aria-labelledby="categoryModalTitle">
    <div class="modal">
      <div class="modal-header">
        <h2 id="categoryModalTitle">Add Category</h2>
      </div>
      <form id="categoryForm" novalidate>
        <div class="modal-body">
          <input type="hidden" id="categoryId">
          <div class="form-group" id="categoryNameGroup">
            <label class="form-label" for="categoryName">Name *</label>
            <input type="text" id="categoryName" class="form-input" required placeholder="Enter category name" aria-describedby="categoryNameHint categoryNameError">
            <p class="form-hint" id="categoryNameHint">Category name must not be empty</p>
            <p class="form-error" id="categoryNameError" role="alert">Name is required</p>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeModals()">Cancel</button>
          <button type="submit" class="btn btn-success">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let items = [];
    let categories = [];
    let itemModalMode = 'create';
    let categoryModalMode = 'create';

    function showError(message) {
      const alert = document.getElementById('errorAlert');
      const msg = document.getElementById('errorMessage');
      msg.textContent = message;
      alert.classList.add('active');
      setTimeout(() => alert.classList.remove('active'), 5000);
    }

    function showSuccess(message) {
      const alert = document.getElementById('successAlert');
      const msg = document.getElementById('successMessage');
      msg.textContent = message;
      alert.classList.add('active');
      setTimeout(() => alert.classList.remove('active'), 3000);
    }

    async function loadData() {
      try {
        const [itemsRes, categoriesRes] = await Promise.all([
          fetch('./items'),
          fetch('./categories')
        ]);
        if (!itemsRes.ok) throw new Error('Failed to load items');
        if (!categoriesRes.ok) throw new Error('Failed to load categories');
        items = await itemsRes.json();
        categories = await categoriesRes.json();
        renderItems();
        renderCategories();
        updateCategorySelect();
      } catch (err) {
        showError(err.message);
        renderEmpty('itemsTableBody', 4, 'Failed to load items');
        renderEmpty('categoriesTableBody', 3, 'Failed to load categories');
      }
    }

    function renderEmpty(tableId, colSpan, message) {
      const tbody = document.getElementById(tableId);
      tbody.innerHTML = \`
        <tr>
          <td colspan="\${colSpan}">
            <div class="empty-state">
              <div class="empty-state-icon">📭</div>
              <p>\${message}</p>
            </div>
          </td>
        </tr>
      \`;
    }

    function getCategoryName(categoryId) {
      if (!categoryId) return '-';
      const cat = categories.find(c => c.id === categoryId);
      return cat ? cat.name : '-';
    }

    function getItemCount(categoryId) {
      return items.filter(item => item.categoryId === categoryId).length;
    }

    function renderItems() {
      const tbody = document.getElementById('itemsTableBody');
      if (items.length === 0) {
        renderEmpty('itemsTableBody', 4, 'No items yet. Create your first item!');
        return;
      }
      tbody.innerHTML = items.map(item => \`
        <tr>
          <td>\${escapeHtml(item.name)}</td>
          <td>\${item.quantity}</td>
          <td>
            \${item.categoryId
              ? \`<span class="badge badge-primary">\${escapeHtml(getCategoryName(item.categoryId))}</span>\`
              : '-'
            }
          </td>
          <td class="actions">
            <button class="btn btn-sm btn-secondary" onclick="editItem('\${item.id}')" aria-label="Edit \${escapeHtml(item.name)}">
              ✏️ Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteItem('\${item.id}')" aria-label="Delete \${escapeHtml(item.name)}">
              🗑️ Delete
            </button>
          </td>
        </tr>
      \`).join('');
    }

    function renderCategories() {
      const tbody = document.getElementById('categoriesTableBody');
      if (categories.length === 0) {
        renderEmpty('categoriesTableBody', 3, 'No categories yet. Create your first category!');
        return;
      }
      tbody.innerHTML = categories.map(cat => \`
        <tr>
          <td>\${escapeHtml(cat.name)}</td>
          <td>\${getItemCount(cat.id)}</td>
          <td class="actions">
            <button class="btn btn-sm btn-secondary" onclick="editCategory('\${cat.id}')" aria-label="Edit \${escapeHtml(cat.name)}">
              ✏️ Edit
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteCategory('\${cat.id}')" aria-label="Delete \${escapeHtml(cat.name)}">
              🗑️ Delete
            </button>
          </td>
        </tr>
      \`).join('');
    }

    function updateCategorySelect() {
      const select = document.getElementById('itemCategory');
      const currentValue = select.value;
      select.innerHTML = '<option value="">No category</option>' +
        categories.map(cat => \`<option value="\${cat.id}">\${escapeHtml(cat.name)}</option>\`).join('');
      select.value = currentValue;
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function openItemModal(mode) {
      itemModalMode = mode;
      const overlay = document.getElementById('itemModalOverlay');
      const title = document.getElementById('itemModalTitle');
      const form = document.getElementById('itemForm');
      form.reset();
      document.getElementById('itemNameGroup').classList.remove('has-error');
      document.getElementById('itemQuantityGroup').classList.remove('has-error');
      title.textContent = mode === 'create' ? 'Add Item' : 'Edit Item';
      if (mode === 'edit') {
        const id = document.getElementById('itemId').value;
        const item = items.find(i => i.id === id);
        if (item) {
          document.getElementById('itemName').value = item.name;
          document.getElementById('itemQuantity').value = item.quantity;
          document.getElementById('itemCategory').value = item.categoryId || '';
        }
      }
      overlay.classList.add('active');
      document.getElementById('itemName').focus();
    }

    function openCategoryModal(mode) {
      categoryModalMode = mode;
      const overlay = document.getElementById('categoryModalOverlay');
      const title = document.getElementById('categoryModalTitle');
      const form = document.getElementById('categoryForm');
      form.reset();
      document.getElementById('categoryNameGroup').classList.remove('has-error');
      title.textContent = mode === 'create' ? 'Add Category' : 'Edit Category';
      if (mode === 'edit') {
        const id = document.getElementById('categoryId').value;
        const cat = categories.find(c => c.id === id);
        if (cat) {
          document.getElementById('categoryName').value = cat.name;
        }
      }
      overlay.classList.add('active');
      document.getElementById('categoryName').focus();
    }

    function closeModals() {
      document.getElementById('itemModalOverlay').classList.remove('active');
      document.getElementById('categoryModalOverlay').classList.remove('active');
    }

    function editItem(id) {
      document.getElementById('itemId').value = id;
      openItemModal('edit');
    }

    function editCategory(id) {
      document.getElementById('categoryId').value = id;
      openCategoryModal('edit');
    }

    async function deleteItem(id) {
      const item = items.find(i => i.id === id);
      if (!confirm(\`Delete "\${item.name}"?\`)) return;
      try {
        const res = await fetch(\`./items/\${id}\`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete item');
        showSuccess('Item deleted successfully');
        await loadData();
      } catch (err) {
        showError(err.message);
      }
    }

    async function deleteCategory(id) {
      const cat = categories.find(c => c.id === id);
      const count = getItemCount(id);
      let message = \`Delete "\${cat.name}"?\`;
      if (count > 0) {
        message += \` This will remove the category from \${count} item\${count === 1 ? '' : 's'}.\`;
      }
      if (!confirm(message)) return;
      try {
        const res = await fetch(\`./categories/\${id}\`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete category');
        showSuccess('Category deleted successfully');
        await loadData();
      } catch (err) {
        showError(err.message);
      }
    }

    function validateName(value, groupId) {
      const group = document.getElementById(groupId);
      const isValid = value.trim().length > 0;
      group.classList.toggle('has-error', !isValid);
      return isValid;
    }

    function validateQuantity(value) {
      const group = document.getElementById('itemQuantityGroup');
      const num = parseInt(value, 10);
      const isValid = !isNaN(num) && num >= 0 && Number.isInteger(num);
      group.classList.toggle('has-error', !isValid);
      return isValid;
    }

    document.getElementById('itemForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('itemName').value.trim();
      const quantity = parseInt(document.getElementById('itemQuantity').value, 10);
      const categoryId = document.getElementById('itemCategory').value || null;
      const id = document.getElementById('itemId').value;

      const nameValid = validateName(name, 'itemNameGroup');
      const quantityValid = validateQuantity(quantity);

      if (!nameValid || !quantityValid) return;

      const data = { name, quantity, categoryId };
      try {
        const url = itemModalMode === 'create' ? './items' : \`./items/\${id}\`;
        const method = itemModalMode === 'create' ? 'POST' : 'PUT';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error(\`Failed to \${itemModalMode} item\`);
        showSuccess(itemModalMode === 'create' ? 'Item created successfully' : 'Item updated successfully');
        closeModals();
        await loadData();
      } catch (err) {
        showError(err.message);
      }
    });

    document.getElementById('categoryForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('categoryName').value.trim();
      const id = document.getElementById('categoryId').value;

      if (!validateName(name, 'categoryNameGroup')) return;

      try {
        const url = categoryModalMode === 'create' ? './categories' : \`./categories/\${id}\`;
        const method = categoryModalMode === 'create' ? 'POST' : 'PUT';
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        if (!res.ok) throw new Error(\`Failed to \${categoryModalMode} category\`);
        showSuccess(categoryModalMode === 'create' ? 'Category created successfully' : 'Category updated successfully');
        closeModals();
        await loadData();
      } catch (err) {
        showError(err.message);
      }
    });

    document.getElementById('itemName').addEventListener('input', (e) => {
      validateName(e.target.value, 'itemNameGroup');
    });

    document.getElementById('itemQuantity').addEventListener('input', (e) => {
      validateQuantity(e.target.value);
    });

    document.getElementById('categoryName').addEventListener('input', (e) => {
      validateName(e.target.value, 'categoryNameGroup');
    });

    document.getElementById('tab-items').addEventListener('click', () => {
      document.getElementById('tab-items').classList.add('active');
      document.getElementById('tab-items').setAttribute('aria-selected', 'true');
      document.getElementById('tab-items').setAttribute('tabindex', '0');
      document.getElementById('tab-categories').classList.remove('active');
      document.getElementById('tab-categories').setAttribute('aria-selected', 'false');
      document.getElementById('tab-categories').setAttribute('tabindex', '-1');
      document.getElementById('items-section').classList.add('active');
      document.getElementById('items-section').removeAttribute('hidden');
      document.getElementById('categories-section').classList.remove('active');
      document.getElementById('categories-section').setAttribute('hidden', '');
    });

    document.getElementById('tab-categories').addEventListener('click', () => {
      document.getElementById('tab-categories').classList.add('active');
      document.getElementById('tab-categories').setAttribute('aria-selected', 'true');
      document.getElementById('tab-categories').setAttribute('tabindex', '0');
      document.getElementById('tab-items').classList.remove('active');
      document.getElementById('tab-items').setAttribute('aria-selected', 'false');
      document.getElementById('tab-items').setAttribute('tabindex', '-1');
      document.getElementById('categories-section').classList.add('active');
      document.getElementById('categories-section').removeAttribute('hidden');
      document.getElementById('items-section').classList.remove('active');
      document.getElementById('items-section').setAttribute('hidden', '');
    });

    document.getElementById('itemModalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModals();
    });

    document.getElementById('categoryModalOverlay').addEventListener('click', (e) => {
      if (e.target === e.currentTarget) closeModals();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModals();
    });

    loadData();
  </script>
</body>
</html>`;
  }
}

export { ItemsState, ItemsUI };
