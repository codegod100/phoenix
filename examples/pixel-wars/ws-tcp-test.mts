import { createServer as createNetServer, connect } from 'node:net';
import { createHash } from 'node:crypto';

const PORT = 3028;

// Raw TCP server
const server = createNetServer((socket) => {
  console.log('Server: client connected');
  let buffer = Buffer.alloc(0);
  
  socket.on('data', (data) => {
    buffer = Buffer.concat([buffer, data]);
    const str = buffer.toString();
    
    if (str.includes('Upgrade: websocket')) {
      console.log('Server: got upgrade request');
      const match = str.match(/Sec-WebSocket-Key: ([\w+/=]+)/);
      const key = match ? match[1] : 'dGhlIHNhbXBsZSBub25jZQ==';
      const accept = createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
        .digest('base64');
      
      const upgradeResponse = 
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        `Sec-WebSocket-Accept: ${accept}\r\n\r\n`;
      
      // Send response + frame
      const msg = JSON.stringify({ type: 'hello' });
      const payload = Buffer.from(msg, 'utf8');
      const frame = Buffer.alloc(2 + payload.length);
      frame[0] = 0x81;
      frame[1] = payload.length;
      payload.copy(frame, 2);
      
      socket.write(Buffer.concat([Buffer.from(upgradeResponse), frame]));
      console.log('Server: sent upgrade + frame');
    }
  });
});

server.listen(PORT, () => {
  console.log('Raw TCP server on', PORT);
  
  const client = connect(PORT);
  let clientBuffer = Buffer.alloc(0);
  
  client.on('connect', () => {
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
    console.log('Client: got', data.length, 'bytes');
    clientBuffer = Buffer.concat([clientBuffer, data]);
  });
  
  setTimeout(() => {
    console.log('Client: total buffer:', clientBuffer.length);
    if (clientBuffer.length > 0) {
      console.log('First 100 bytes:', clientBuffer.slice(0, 100).toString());
    }
    client.end();
    server.close();
  }, 2000);
});
