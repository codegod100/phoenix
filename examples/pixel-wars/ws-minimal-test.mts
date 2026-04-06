import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { connect } from 'node:net';

const PORT = 3026;

// Simple server
const server = createServer((req, res) => {
  res.writeHead(200);
  res.end('HTTP OK');
});

server.on('upgrade', (req, socket) => {
  console.log('Server: upgrade received');
  const key = req.headers['sec-websocket-key'];
  const accept = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
    () => {
      console.log('Server: upgrade response flushed');
      
      // Send a simple text frame after a small delay
      setTimeout(() => {
        const msg = JSON.stringify({ type: 'hello' });
        const payload = Buffer.from(msg, 'utf8');
        const frame = Buffer.alloc(2 + payload.length);
        frame[0] = 0x81; // text frame
        frame[1] = payload.length; // unmasked
        payload.copy(frame, 2);
        
        console.log('Server: sending frame:', frame.length, 'bytes');
        socket.write(frame, () => {
          console.log('Server: frame flushed');
        });
      }, 100);
    }
  );
  
  socket.on('data', (data) => {
    console.log('Server: received data:', data.length);
  });
});

server.listen(PORT, () => {
  console.log('Server listening on', PORT);
  
  // Connect client
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
    const str = buffer.toString();
    if (str.includes('HTTP/1.1 101')) {
      console.log('Client: got upgrade response');
    }
    if (buffer.length > 100) {
      console.log('Client: buffer has', buffer.length, 'bytes total');
    }
  });
  
  setTimeout(() => {
    console.log('Client: final buffer size:', buffer.length);
    client.end();
    server.close();
  }, 2000);
});
