// Generated via emit_with_protocol

import { Hono } from 'hono';

const app = new Hono();

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});
app.get('/api/users', (c) => {
  return c.json({ status: 'ok' });
});
app.get('/api/users/:id', (c) => {
  return c.json({ status: 'ok' });
});
app.post('/api/users', (c) => {
  return c.json({ status: 'ok' });
});
app.put('/api/users/:id', (c) => {
  return c.json({ status: 'ok' });
});
app.delete('/api/users/:id', (c) => {
  return c.json({ status: 'ok' });
});
app.get('/api/items', (c) => {
  return c.json({ status: 'ok' });
});
app.get('/api/items/:id', (c) => {
  return c.json({ status: 'ok' });
});
app.post('/api/items', (c) => {
  return c.json({ status: 'ok' });
});
app.get('/api/status', (c) => {
  return c.json({ status: 'ok' });
});

export default app;
