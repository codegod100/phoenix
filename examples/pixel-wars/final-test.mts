import { connect } from 'node:net';

const PORT = 3030;

const socket = connect(PORT);
let buffer = Buffer.alloc(0);

socket.on('connect', () => {
  console.log('✅ TCP connected');
  const upgrade = 
    'GET / HTTP/1.1\r\n' +
    'Host: localhost:' + PORT + '\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
    'Sec-WebSocket-Version: 13\r\n' +
    '\r\n';
  socket.write(upgrade);
  console.log('📤 Upgrade request sent');
});

socket.on('data', (data) => {
  console.log('📥 Data received:', data.length, 'bytes');
  buffer = Buffer.concat([buffer, data]);
  const str = buffer.toString();
  if (str.includes('HTTP/1.1 101')) {
    console.log('✅ WebSocket upgraded!');
  }
});

socket.on('error', (err) => console.log('❌ Error:', err.message, err.code));
socket.on('close', (hadError) => console.log('🔒 Closed, hadError:', hadError));

setTimeout(() => {
  console.log('Final buffer size:', buffer.length);
  if (buffer.length > 0) {
    console.log('Preview:', buffer.slice(0, 200).toString());
  }
  socket.end();
  process.exit(0);
}, 3000);
