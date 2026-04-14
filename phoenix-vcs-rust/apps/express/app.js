const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'express-demo-api' });
});

// API routes
app.get('/health', (req, res) => {
  res.json({ status: 'running', uptime: '10 days', timestamp: new Date().toISOString() });
});

app.get('/api/users', (req, res) => {
  res.json({ users: [], total: 0, page: 1 });
});

app.post('/api/users', (req, res) => {
  res.json({ message: 'User created successfully', id: 1, createdAt: new Date().toISOString() });
});

app.put('/api/users/:id', (req, res) => {
  res.json({ message: 'User updated', id: req.params.id, updatedAt: new Date().toISOString() });
});

app.delete('/api/users/:id', (req, res) => {
  res.json({ message: 'User permanently deleted', id: req.params.id, deletedAt: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`express-demo-api API server listening on port ${PORT}`);
});
