import { connect } from 'node:net';

const PORT = 3023;

const socket = connect(PORT);
let buffer = Buffer.alloc(0);

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
  console.log('Sending upgrade request...');
  socket.write(upgrade);
});

socket.on('data', (data: Buffer) => {
  console.log('📥 Data received:', data.length, 'bytes');
  buffer = Buffer.concat([buffer, data]);
  const str = buffer.toString();
  console.log('Content preview:', str.substring(0, 100));
});

socket.on('error', (err) => {
  console.log('❌ Socket error:', err.message);
});

socket.on('close', () => {
  console.log('🔒 Socket closed');
});

setTimeout(() => {
  console.log('Final buffer:', buffer.length, 'bytes');
  socket.end();
  process.exit(0);
}, 3000);
