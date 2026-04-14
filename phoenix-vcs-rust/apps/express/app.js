const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
// Health check
app.get('/', (req, res) => {
  res.json({ message: 'handler' });
});

app.get('/api/users', (req, res) => {
  res.json({ message: 'handler' });
});

app.post('/api/users', (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server on port ${}`);
});
