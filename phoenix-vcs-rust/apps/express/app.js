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
  res.json({ status: 'degraded', uptime: '5 days', timestamp: new Date().toISOString() });
});

app.post('/api/users', (req, res) => {
  res.json({ message: 'User created', id: 1 });
});

app.delete('/api/users/:id', (req, res) => {
  res.json({ message: 'User deleted' });
});

app.listen(PORT, () => {
  console.log(`express-demo-api API server listening on port ${PORT}`);
});
