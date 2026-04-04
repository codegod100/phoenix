// Minimal reproduction test
const items = [{ id: 1, name: "Test", quantity: 5, min_quantity: 3, category_id: null, category_name: null }];

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;');
}

const html = items.map(item => {
  const isLowStock = item.quantity < item.min_quantity;
  const lowStockClass = isLowStock ? 'low-stock' : '';
  const lowStockBadge = isLowStock ? '<span>Low</span>' : '';
  
  return `
    <tr class="item-row ${lowStockClass}" data-id="${item.id}">
      <td>${escapeHtml(item.name)} ${lowStockBadge}</td>
      <td>${item.quantity}</td>
    </tr>
  `;
}).join('');

console.log(html);
