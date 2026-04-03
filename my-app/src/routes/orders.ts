import { Hono } from 'hono';
import { db, registerMigration } from '../db.js';
import { z } from 'zod';

const router = new Hono();

// Migrations
registerMigration('orders', `
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'shipped', 'delivered', 'cancelled')),
    total_amount REAL NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    shipping_address TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

registerMigration('orders', `
  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES items(id),
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price REAL NOT NULL DEFAULT 0 CHECK (unit_price >= 0),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

registerMigration('orders', `
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)
`);

registerMigration('orders', `
  CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON orders(customer_email)
`);

registerMigration('orders', `
  CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id)
`);

// Zod Schemas
const OrderStatusSchema = z.enum(['pending', 'processing', 'shipped', 'delivered', 'cancelled']);

type OrderRecord = {
  id: number;
  customer_name: string;
  customer_email: string;
  status: string;
  total_amount: number;
  shipping_address: string;
  created_at: string;
  updated_at: string;
};

type OrderItemRecord = {
  id: number;
  quantity: number;
  unit_price: number;
  item_name: string;
  item_id: number;
};

const OrderItemSchema = z.object({
  item_id: z.number().int().positive('Item ID must be a positive integer'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unit_price: z.number().nonnegative('Unit price must be a non-negative number'),
});

const CreateOrderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  customer_email: z.string().email('Invalid email address'),
  shipping_address: z.string().min(1, 'Shipping address is required'),
  status: OrderStatusSchema.optional().default('pending'),
  items: z.array(OrderItemSchema).min(1, 'At least one item is required'),
});

const UpdateOrderSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required').optional(),
  customer_email: z.string().email('Invalid email address').optional(),
  shipping_address: z.string().min(1, 'Shipping address is required').optional(),
  status: OrderStatusSchema.optional(),
});

const UpdateOrderStatusSchema = z.object({
  status: OrderStatusSchema,
});

// Error response helper
function errorResponse(c: import('hono').Context, message: string, status: 400 | 404 | 500) {
  return c.json({ error: message }, status);
}

// Calculate order total
function calculateOrderTotal(items: Array<{ quantity: number; unit_price: number }>): number {
  return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
}

// Routes

// List all orders with optional filtering
router.get('/', (c) => {
  const url = new URL(c.req.url);
  const status = url.searchParams.get('status');
  const email = url.searchParams.get('email');
  const sortBy = url.searchParams.get('sort') ?? 'created_at';
  const order = url.searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

  let sql = 'SELECT * FROM orders';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }

  if (email) {
    conditions.push('customer_email = ?');
    params.push(email);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Validate sort column to prevent SQL injection
  const validSortColumns = ['id', 'customer_name', 'created_at', 'updated_at', 'total_amount', 'status'];
  const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
  sql += ` ORDER BY ${sortColumn} ${order}`;

  const orders = db.prepare(sql).all(...params);
  return c.json(orders);
});

// Get single order with items
router.get('/:id', (c) => {
  const id = c.req.param('id');
  
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRecord | undefined;
  if (!order) {
    return errorResponse(c, 'Order not found', 404);
  }

  const items = db.prepare(`
    SELECT oi.id, oi.quantity, oi.unit_price, i.name as item_name, i.id as item_id
    FROM order_items oi
    JOIN items i ON oi.item_id = i.id
    WHERE oi.order_id = ?
  `).all(id) as OrderItemRecord[];

  return c.json({ ...order, items });
});

// Create new order with items
router.post('/', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 'Invalid JSON body', 400);
  }

  const result = CreateOrderSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return errorResponse(c, firstError.message, 400);
  }

  const { customer_name, customer_email, shipping_address, status, items } = result.data;
  const totalAmount = calculateOrderTotal(items);

  // Validate that all item_ids exist
  const itemIds = items.map(i => i.item_id);
  const placeholders = itemIds.map(() => '?').join(',');
  const existingItems = db.prepare(`SELECT id FROM items WHERE id IN (${placeholders})`).all(...itemIds);
  
  if (existingItems.length !== itemIds.length) {
    return errorResponse(c, 'One or more items do not exist', 400);
  }

  const insertOrder = db.prepare(`
    INSERT INTO orders (customer_name, customer_email, shipping_address, status, total_amount)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertOrderItem = db.prepare(`
    INSERT INTO order_items (order_id, item_id, quantity, unit_price)
    VALUES (?, ?, ?, ?)
  `);

  try {
    // Use transaction
    db.transaction(() => {
      const orderInfo = insertOrder.run(customer_name, customer_email, shipping_address, status, totalAmount);
      const orderId = orderInfo.lastInsertRowid;

      for (const item of items) {
        insertOrderItem.run(orderId, item.item_id, item.quantity, item.unit_price);
      }
    })();

    const orderId = (db.prepare('SELECT last_insert_rowid() as id').get() as { id: number }).id;
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as OrderRecord;
    const orderItems = db.prepare(`
      SELECT oi.id, oi.quantity, oi.unit_price, i.name as item_name, i.id as item_id
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id = ?
    `).all(orderId) as OrderItemRecord[];

    return c.json({ ...order, items: orderItems }, 201);
  } catch (err: Error | unknown) {
    console.error('Error creating order:', err);
    return errorResponse(c, 'Failed to create order', 500);
  }
});

// Update order details
router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  
  const existingOrder = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
  if (!existingOrder) {
    return errorResponse(c, 'Order not found', 404);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 'Invalid JSON body', 400);
  }

  const result = UpdateOrderSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return errorResponse(c, firstError.message, 400);
  }

  const updates = result.data;
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  if (updates.customer_name !== undefined) {
    fields.push('customer_name = ?');
    values.push(updates.customer_name);
  }
  if (updates.customer_email !== undefined) {
    fields.push('customer_email = ?');
    values.push(updates.customer_email);
  }
  if (updates.shipping_address !== undefined) {
    fields.push('shipping_address = ?');
    values.push(updates.shipping_address);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (fields.length === 0) {
    return errorResponse(c, 'No fields to update', 400);
  }

  fields.push('updated_at = datetime(\'now\')');
  values.push(id);

  try {
    db.prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRecord;
    const items = db.prepare(`
      SELECT oi.id, oi.quantity, oi.unit_price, i.name as item_name, i.id as item_id
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.order_id = ?
    `).all(id) as OrderItemRecord[];

    return c.json({ ...order, items });
  } catch (err: Error | unknown) {
    console.error('Error updating order:', err);
    return errorResponse(c, 'Failed to update order', 500);
  }
});

// Update order status only
router.patch('/:id/status', async (c) => {
  const id = c.req.param('id');
  
  const existingOrder = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
  if (!existingOrder) {
    return errorResponse(c, 'Order not found', 404);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 'Invalid JSON body', 400);
  }

  const result = UpdateOrderStatusSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return errorResponse(c, firstError.message, 400);
  }

  const { status } = result.data;

  try {
    db.prepare(`
      UPDATE orders 
      SET status = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(status, id);

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id) as OrderRecord;
    return c.json(order);
  } catch (err: Error | unknown) {
    console.error('Error updating order status:', err);
    return errorResponse(c, 'Failed to update order status', 500);
  }
});

// Delete order
router.delete('/:id', (c) => {
  const id = c.req.param('id');
  
  const existingOrder = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
  if (!existingOrder) {
    return errorResponse(c, 'Order not found', 404);
  }

  try {
    db.prepare('DELETE FROM orders WHERE id = ?').run(id);
    return c.body(null, 204);
  } catch (err: Error | unknown) {
    console.error('Error deleting order:', err);
    return errorResponse(c, 'Failed to delete order', 500);
  }
});

// Get order items for a specific order
router.get('/:id/items', (c) => {
  const id = c.req.param('id');
  
  const existingOrder = db.prepare('SELECT id FROM orders WHERE id = ?').get(id);
  if (!existingOrder) {
    return errorResponse(c, 'Order not found', 404);
  }

  const items = db.prepare(`
    SELECT oi.id, oi.quantity, oi.unit_price, i.name as item_name, i.id as item_id
    FROM order_items oi
    JOIN items i ON oi.item_id = i.id
    WHERE oi.order_id = ?
  `).all(id);

  return c.json(items);
});

// Add item to existing order
router.post('/:id/items', async (c) => {
  const orderId = c.req.param('id');
  
  const existingOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as OrderRecord | undefined;
  if (!existingOrder) {
    return errorResponse(c, 'Order not found', 404);
  }

  // Prevent adding items to delivered or cancelled orders
  if (existingOrder.status === 'delivered' || existingOrder.status === 'cancelled') {
    return errorResponse(c, 'Cannot modify items for delivered or cancelled orders', 400);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return errorResponse(c, 'Invalid JSON body', 400);
  }

  const result = OrderItemSchema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0];
    return errorResponse(c, firstError.message, 400);
  }

  const { item_id, quantity, unit_price } = result.data;

  // Check if item exists
  const itemExists = db.prepare('SELECT id FROM items WHERE id = ?').get(item_id);
  if (!itemExists) {
    return errorResponse(c, 'Item not found', 400);
  }

  try {
    const info = db.prepare(`
      INSERT INTO order_items (order_id, item_id, quantity, unit_price)
      VALUES (?, ?, ?, ?)
    `).run(orderId, item_id, quantity, unit_price);

    // Update order total
    const newTotal = (existingOrder.total_amount || 0) + quantity * unit_price;
    db.prepare(`
      UPDATE orders 
      SET total_amount = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(newTotal, orderId);

    const orderItem = db.prepare(`
      SELECT oi.id, oi.quantity, oi.unit_price, i.name as item_name, i.id as item_id
      FROM order_items oi
      JOIN items i ON oi.item_id = i.id
      WHERE oi.id = ?
    `).get(info.lastInsertRowid);

    return c.json(orderItem, 201);
  } catch (err: Error | unknown) {
    console.error('Error adding order item:', err);
    return errorResponse(c, 'Failed to add order item', 500);
  }
});

// Remove item from order
router.delete('/:id/items/:itemId', (c) => {
  const orderId = c.req.param('id');
  const orderItemId = c.req.param('itemId');
  
  const existingOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as OrderRecord | undefined;
  if (!existingOrder) {
    return errorResponse(c, 'Order not found', 404);
  }

  // Prevent removing items from delivered or cancelled orders
  if (existingOrder.status === 'delivered' || existingOrder.status === 'cancelled') {
    return errorResponse(c, 'Cannot modify items for delivered or cancelled orders', 400);
  }

  const orderItem = db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(orderItemId, orderId) as { id: number; quantity: number; unit_price: number } | undefined;
  if (!orderItem) {
    return errorResponse(c, 'Order item not found', 404);
  }

  try {
    // Update order total
    const itemTotal = orderItem.quantity * orderItem.unit_price;
    const newTotal = Math.max(0, (existingOrder.total_amount || 0) - itemTotal);
    db.prepare(`
      UPDATE orders 
      SET total_amount = ?, updated_at = datetime('now') 
      WHERE id = ?
    `).run(newTotal, orderId);

    db.prepare('DELETE FROM order_items WHERE id = ?').run(orderItemId);
    return c.body(null, 204);
  } catch (err: Error | unknown) {
    console.error('Error removing order item:', err);
    return errorResponse(c, 'Failed to remove order item', 500);
  }
});

export default router;
