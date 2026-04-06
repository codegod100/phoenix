import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { connect } from 'node:net';

const PORT = 3027;

const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('HTTP OK');
});

server.on('upgrade', (req, socket) => {
  console.log('Server: upgrade received, socket writable:', socket.writable);
  const key = req.headers['sec-websocket-key'];
  const accept = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  
  const upgradeResponse = 
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`;
  
  // Write upgrade + frame together
  const msg = JSON.stringify({ type: 'hello' });
  const payload = Buffer.from(msg, 'utf8');
  const frame = Buffer.alloc(2 + payload.length);
  frame[0] = 0x81;
  frame[1] = payload.length;
  payload.copy(frame, 2);
  
  const combined = Buffer.concat([Buffer.from(upgradeResponse), frame]);
  console.log('Server: writing combined buffer:', combined.length, 'bytes');
  
  socket.write(combined, (err) => {
    if (err) console.log('Server: write error:', err);
    else console.log('Server: combined write flushed');
  });
  
  socket.on('error', (err) => console.log('Server socket error:', err));
});

server.listen(PORT, () => {
  console.log('Server listening on', PORT);
  
  const client = connect(PORT);
  let buffer = Buffer.alloc(0);
  
  client.on('connect', () => {
    console.log('Client: connected');
    const upgrade = 
      'GET / HTTP/1.1\r\n' +
      'Host: localhost\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
      '\r\n';
    client.write(upgrade);
  });
  
  client.on('data', (data) => {
    console.log('Client: received', data.length, 'bytes');
    buffer = Buffer.concat([buffer, data]);
  });
  
  client.on('error', (err) => console.log('Client error:', err));
  
  setTimeout(() => {
    console.log('Client: final buffer size:', buffer.length);
    console.log('Client: data hex:', buffer.slice(0, 50).toString('hex'));
    client.end();
    server.close();
  }, 2000);
});
