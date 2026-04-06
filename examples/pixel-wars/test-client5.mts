import { connect } from 'node:net';

const PORT = 3024;

const socket = connect(PORT);
let buffer = Buffer.alloc(0);
let gotData = false;

socket.on('connect', () => {
  console.log('TCP connected');
  const upgrade = 
    'GET / HTTP/1.1\r\n' +
    'Host: localhost:' + PORT + '\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
    'Sec-WebSocket-Version: 13\r\n' +
    '\r\n';
  socket.write(upgrade);
});

socket.on('data', (data: Buffer) => {
  gotData = true;
  console.log('📥 Data:', data.length, 'bytes');
  buffer = Buffer.concat([buffer, data]);
});

socket.on('error', (err) => console.log('❌ Error:', err.message));
socket.on('close', (hadError) => console.log('🔒 Closed, hadError:', hadError));

setTimeout(() => {
  console.log('Buffer:', buffer.length, 'Got data:', gotData);
  socket.end();
}, 3000);
