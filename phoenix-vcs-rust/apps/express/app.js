const express = require('express');

const app = express();

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

app.listen(3000, () => {
  console.log(`Server on port ${3000}`);
});
