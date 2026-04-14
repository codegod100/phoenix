const express = require('express');
const morgan = require('morgan');

const app = express();

// Request logging middleware
app.use(morgan('combined'));

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

app.post('/api/orders', (req, res) => {
  res.json({ orderId: 'ORD-12345', status: 'pending' });
});

app.listen(3000, () => {
  console.log('🚀 Phoenix Express API running at http://localhost:3000');
  console.log('📊 Metrics available at /api/metrics');
  console.log('💾 Health check at /health');
});
