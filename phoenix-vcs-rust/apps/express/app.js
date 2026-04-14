const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(express.json());
// Health check
app.get('/', (req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
  });

app.get('/api/users', (req, res) => {
    res.json({ message: 'listUsers' });
  });

app.post('/api/users', (req, res) => {
    res.json({ message: 'createUsers' });
  });

app.delete('/api/users/:id', (req, res) => {
    res.json({ message: 'deleteUsersByid', id: req.params.id });
  });

app.get('/api/items', (req, res) => {
    res.json({ message: 'listItems' });
  });

app.post('/api/items', (req, res) => {
    res.json({ message: 'createItems' });
  });

app.listen(PORT, () => {
  console.log(`user-service API server listening on port ${PORT}`);
});
