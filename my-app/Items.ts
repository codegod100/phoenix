<output>
interface Item {
  id: string;
  name: string;
  quantity: number;
  categoryId: string;
}

interface Category {
  id: string;
  name: string;
}

interface ItemsState {
  items: Item[];
  categories: Category[];
  loading: boolean;
  error: string | null;
  editingItem: Item | null;
  editingCategory: Category | null;
  showItemForm: boolean;
  showCategoryForm: boolean;
}

export class Items {
  private state: ItemsState;
  private container: HTMLElement | null = null;

  constructor() {
    this.state = {
      items: [],
      categories: [],
      loading: false,
      error: null,
      editingItem: null,
      editingCategory: null,
      showItemForm: false,
      showCategoryForm: false
    };
  }

  updateState(partial: Partial<ItemsState>): void {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  async loadData(): Promise<void> {
    this.updateState({ loading: true, error: null });
    
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch('./items'),
        fetch('./categories')
      ]);
      
      if (!itemsRes.ok) throw new Error(`Items fetch failed: ${itemsRes.status}`);
      if (!categoriesRes.ok) throw new Error(`Categories fetch failed: ${categoriesRes.status}`);
      
      const items = await itemsRes.json();
      const categories = await categoriesRes.json();
      
      this.updateState({ 
        items: Array.isArray(items) ? items : [],
        categories: Array.isArray(categories) ? categories : [],
        loading: false 
      });
    } catch (err) {
      this.updateState({ 
        error: err instanceof Error ? err.message : 'Failed to load data',
        loading: false 
      });
    }
  }

  private validateName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'Name must not be empty';
    }
    return null;
  }

  private validateQuantity(quantity: number): string | null {
    if (!Number.isInteger(quantity) || quantity < 0) {
      return 'Quantity must be a non-negative integer';
    }
    return null;
  }

  async createItem(itemData: Omit<Item, 'id'>): Promise<void> {
    const nameError = this.validateName(itemData.name);
    if (nameError) {
      this.updateState({ error: nameError });
      return;
    }

    const quantityError = this.validateQuantity(itemData.quantity);
    if (quantityError) {
      this.updateState({ error: quantityError });
      return;
    }

    try {
      const res = await fetch('./items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...itemData, name: itemData.name.trim() })
      });
      
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      
      const newItem = await res.json();
      this.updateState({ 
        items: [...this.state.items, newItem],
        showItemForm: false,
        editingItem: null,
        error: null
      });
    } catch (err) {
      this.updateState({ 
        error: err instanceof Error ? err.message : 'Failed to create item'
      });
    }
  }

  async updateItem(id: string, itemData: Partial<Item>): Promise<void> {
    if (itemData.name !== undefined) {
      const nameError = this.validateName(itemData.name);
      if (nameError) {
        this.updateState({ error: nameError });
        return;
      }
    }

    if (itemData.quantity !== undefined) {
      const quantityError = this.validateQuantity(itemData.quantity);
      if (quantityError) {
        this.updateState({ error: quantityError });
        return;
      }
    }

    try {
      const res = await fetch(`./items/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...itemData,
          ...(itemData.name && { name: itemData.name.trim() })
        })
      });
      
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      
      const updatedItem = await res.json();
      this.updateState({
        items: this.state.items.map(item => 
          item.id === id ? updatedItem : item
        ),
        showItemForm: false,
        editingItem: null,
        error: null
      });
    } catch (err) {
      this.updateState({
        error: err instanceof Error ? err.message : 'Failed to update item'
      });
    }
  }

  async deleteItem(id: string): Promise<void> {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`./items/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      
      this.updateState({
        items: this.state.items.filter(item => item.id !== id),
        error: null
      });
    } catch (err) {
      this.updateState({
        error: err instanceof Error ? err.message : 'Failed to delete item'
      });
    }
  }

  async createCategory(name: string): Promise<void> {
    const nameError = this.validateName(name);
    if (nameError) {
      this.updateState({ error: nameError });
      return;
    }

    try {
      const res = await fetch('./categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      
      if (!res.ok) throw new Error(`Create failed: ${res.status}`);
      
      const newCategory = await res.json();
      this.updateState({
        categories: [...this.state.categories, newCategory],
        showCategoryForm: false,
        editingCategory: null,
        error: null
      });
    } catch (err) {
      this.updateState({
        error: err instanceof Error ? err.message : 'Failed to create category'
      });
    }
  }

  async updateCategory(id: string, name: string): Promise<void> {
    const nameError = this.validateName(name);
    if (nameError) {
      this.updateState({ error: nameError });
      return;
    }

    try {
      const res = await fetch(`./categories/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });
      
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      
      const updatedCategory = await res.json();
      this.updateState({
        categories: this.state.categories.map(cat =>
          cat.id === id ? updatedCategory : cat
        ),
        showCategoryForm: false,
        editingCategory: null,
        error: null
      });
    } catch (err) {
      this.updateState({
        error: err instanceof Error ? err.message : 'Failed to update category'
      });
    }
  }

  async deleteCategory(id: string): Promise<void> {
    if (!confirm('Are you sure? Items in this category will become uncategorized.')) return;

    try {
      const res = await fetch(`./categories/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      
      this.updateState({
        categories: this.state.categories.filter(cat => cat.id !== id),
        items: this.state.items.map(item =>
          item.categoryId === id ? { ...item, categoryId: '' } : item
        ),
        error: null
      });
    } catch (err) {
      this.updateState({
        error: err instanceof Error ? err.message : 'Failed to delete category'
      });
    }
  }

  generateHTML(): string {
    const styles = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; margin-bottom: 20px; }
        h2 { color: #555; margin: 30px 0 15px; font-size: 1.3em; }
        .section { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
        .btn:hover { opacity: 0.9; }
        .btn-primary { background: #007bff; color: white; }
        .btn-danger { background: #dc3545; color: white; }
        .btn-secondary { background: #6c757d; color: white; }
        .btn-success { background: #28a745; color: white; }
        .header-actions { display: flex; gap: 10px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e0e0e0; }
        th { background: #f8f9fa; font-weight: 600; color: #555; }
        tr:hover { background: #f8f9fa; }
        .actions { display: flex; gap: 8px; }
        .actions .btn { padding: 4px 12px; font-size: 12px; }
        .form-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .form-modal { background: white; padding: 30px; border-radius: 8px; width: 90%; max-width: 500px; }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: 500; color: #555; }
        input, select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        input:focus, select:focus { outline: none; border-color: #007bff; }
        .form-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
        .error { background: #f8d7da; color: #721c24; padding: 12px; border-radius: 4px; margin-bottom: 20px; }
        .loading { text-align: center; padding: 40px; color: #666; }
        .empty { text-align: center; padding: 40px; color: #888; }
        .badge { background: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
      </style>
    `;

    const errorBanner = this.state.error ? 
      `<div class="error">${this.escapeHtml(this.state.error)}</div>` : '';

    const loadingSpinner = this.state.loading ? 
      `<div class="loading">Loading...</div>` : '';

    const itemsTable = this.state.items.length === 0 && !this.state.loading ?
      `<div class="empty">No items yet. Click "Add Item" to create one.</div>` :
      `<table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Quantity</th>
            <th>Category</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.state.items.map(item => {
            const category = this.state.categories.find(c => c.id === item.categoryId);
            return `<tr>
              <td>${this.escapeHtml(item.name)}</td>
              <td>${item.quantity}</td>
              <td><span class="badge">${this.escapeHtml(category?.name || 'Uncategorized')}</span></td>
              <td class="actions">
                <button class="btn btn-secondary" onclick="window.itemsComponent.editItem('${item.id}')">Edit</button>
                <button class="btn btn-danger" onclick="window.itemsComponent.deleteItem('${item.id}')">Delete</button>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>`;

    const categoriesList = this.state.categories.length === 0 && !this.state.loading ?
      `<div class="empty">No categories yet. Click "Add Category" to create one.</div>` :
      `<table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${this.state.categories.map(cat => `
            <tr>
              <td>${this.escapeHtml(cat.name)}</td>
              <td class="actions">
                <button class="btn btn-secondary" onclick="window.itemsComponent.editCategory('${cat.id}')">Edit</button>
                <button class="btn btn-danger" onclick="window.itemsComponent.deleteCategory('${cat.id}')">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>`;

    const itemForm = this.state.showItemForm ? `
      <div class="form-overlay" onclick="if(event.target===this) window.itemsComponent.closeItemForm()">
        <div class="form-modal" onclick="event.stopPropagation()">
          <h2>${this.state.editingItem ? 'Edit Item' : 'Add Item'}</h2>
          <form onsubmit="window.itemsComponent.handleItemSubmit(event)">
            <div class="form-group">
              <label for="itemName">Name *</label>
              <input type="text" id="itemName" name="name" required 
                value="${this.state.editingItem ? this.escapeHtml(this.state.editingItem.name) : ''}">
            </div>
            <div class="form-group">
              <label for="itemQuantity">Quantity * (non-negative integer)</label>
              <input type="number" id="itemQuantity" name="quantity" min="0" step="1" required
                value="${this.state.editingItem ? this.state.editingItem.quantity : '0'}">
            </div>
            <div class="form-group">
              <label for="itemCategory">Category</label>
              <select id="itemCategory" name="categoryId">
                <option value="">-- Uncategorized --</option>
                ${this.state.categories.map(cat => `
                  <option value="${cat.id}" ${this.state.editingItem?.categoryId === cat.id ? 'selected' : ''}>
                    ${this.escapeHtml(cat.name)}
                  </option>
                `).join('')}
              </select>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="window.itemsComponent.closeItemForm()">Cancel</button>
              <button type="submit" class="btn btn-success">${this.state.editingItem ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    ` : '';

    const categoryForm = this.state.showCategoryForm ? `
      <div class="form-overlay" onclick="if(event.target===this) window.itemsComponent.closeCategoryForm()">
        <div class="form-modal" onclick="event.stopPropagation()">
          <h2>${this.state.editingCategory ? 'Edit Category' : 'Add Category'}</h2>
          <form onsubmit="window.itemsComponent.handleCategorySubmit(event)">
            <div class="form-group">
              <label for="categoryName">Name *</label>
              <input type="text" id="categoryName" name="name" required
                value="${this.state.editingCategory ? this.escapeHtml(this.state.editingCategory.name) : ''}">
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-secondary" onclick="window.itemsComponent.closeCategoryForm()">Cancel</button>
              <button type="submit" class="btn btn-success">${this.state.editingCategory ? 'Update' : 'Create'}</button>
            </div>
          </form>
        </div>
      </div>
    ` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Manager</title>
  ${styles}
</head>
<body>
  <div class="container">
    <h1>📦 Items Manager</h1>
    
    ${errorBanner}
    ${loadingSpinner}

    <div class="section">
      <div class="header-actions">
        <button class="btn btn-primary" onclick="window.itemsComponent.openItemForm()">+ Add Item</button>
        <button class="btn btn-secondary" onclick="window.itemsComponent.refresh()">🔄 Refresh</button>
      </div>
      ${itemsTable}
    </div>

    <div class="section">
      <h2>Categories</h2>
      <div class="header-actions">
        <button class="btn btn-primary" onclick="window.itemsComponent.openCategoryForm()">+ Add Category</button>
      </div>
      ${categoriesList}
    </div>
  </div>

  ${itemForm}
  ${categoryForm}

  <script>
    // Component methods exposed to window for HTML event handlers
    window.itemsComponent = {
      refresh: () => window.itemsComponent.instance.loadData(),
      openItemForm: () => window.itemsComponent.instance.updateState({ showItemForm: true, editingItem: null }),
      closeItemForm: () => window.itemsComponent.instance.updateState({ showItemForm: false, editingItem: null }),
      openCategoryForm: () => window.itemsComponent.instance.updateState({ showCategoryForm: true, editingCategory: null }),
      closeCategoryForm: () => window.itemsComponent.instance.updateState({ showCategoryForm: false, editingCategory: null }),
      editItem: (id) => {
        const item = window.itemsComponent.instance.state.items.find(i => i.id === id);
        window.itemsComponent.instance.updateState({ showItemForm: true, editingItem: item });
      },
      editCategory: (id) => {
        const cat = window.itemsComponent.instance.state.categories.find(c => c.id === id);
        window.itemsComponent.instance.updateState({ showCategoryForm: true, editingCategory: cat });
      },
      deleteItem: (id) => window.itemsComponent.instance.deleteItem(id),
      deleteCategory: (id) => window.itemsComponent.instance.deleteCategory(id),
      handleItemSubmit: (e) => {
        e.preventDefault();
        const form = e.target;
        const data = {
          name: form.name.value,
          quantity: parseInt(form.quantity.value, 10),
          categoryId: form.categoryId.value
        };
        const instance = window.itemsComponent.instance;
        if (instance.state.editingItem) {
          instance.updateItem(instance.state.editingItem.id, data);
        } else {
          instance.createItem(data);
        }
      },
      handleCategorySubmit: (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const instance = window.itemsComponent.instance;
        if (instance.state.editingCategory) {
          instance.updateCategory(instance.state.editingCategory.id, name);
        } else {
          instance.createCategory(name);
        }
      }
    };
  </script>
</body>
</html>`;
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
    this.loadData();
  }

  private render(): void {
    if (this.container) {
      this.container.innerHTML = this.generateHTML();
      // Expose instance to window for event handlers
      if (typeof window !== 'undefined') {
        (window as any).itemsComponent = {
          ...(window as any).itemsComponent,
          instance: this
        };
      }
    }
  }
}

export default Items;
</output>