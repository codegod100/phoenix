const express = require('express');
const morgan = require('morgan');

const app = express();

// Request logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.get('/api/users', (req, res) => {
  res.json({ message: 'handler' });
});

app.post('/api/users', (req, res) => {
  res.json({ message: 'handler' });
});

app.put('/api/users/:id', (req, res) => {
  res.json({ message: 'handler' });
});

app.delete('/api/users/:id', (req, res) => {
  res.json({ message: 'handler' });
});

app.get('/api/items', (req, res) => {
  res.json({ message: 'handler' });
});

app.post('/api/items', (req, res) => {
  res.json({ message: 'handler' });
});

app.get('/api/unicorns', (req, res) => {
  res.json({ message: 'handler' });
});

app.get('/api/metrics', (req, res) => {
  res.json({ message: 'handler' });
});

// Utility function for generating order IDs
function generateOrderId() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

// Database simulation (not part of API contract)
const orderDatabase = new Map();

app.post('/api/orders', (req, res) => {
  // Complex business logic - not captured by basic lens
  const orderId = generateOrderId();
  const orderData = {
    orderId,
    status: 'pending',
    createdAt: new Date().toISOString(),
    items: req.body?.items || [],
    total: req.body?.items?.reduce((sum, item) => sum + (item.price || 0), 0) || 0
  };
  
  // Store in "database"
  orderDatabase.set(orderId, orderData);
  
  // Async logging simulation
  setTimeout(() => {
    console.log(`[${new Date().toISOString()}] Order ${orderId} processed`);
  }, 100);
  
  res.status(201).json(orderData);
});

app.listen(3000, () => {
  console.log('🚀 Phoenix Express API running at http://localhost:3000');
  console.log('📊 Metrics available at /api/metrics');
  console.log('💾 Health check at /health');
});
