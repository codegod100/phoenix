import { connect } from 'node:net';

const PORT = 3018;

const socket = connect(PORT);
let buffer = Buffer.alloc(0);
let stage = 'connecting';

socket.on('connect', () => {
  console.log('TCP connected');
  const key = 'dGhlIHNhbXBsZSBub25jZQ==';
  const upgrade = 
    'GET / HTTP/1.1\r\n' +
    'Host: localhost\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Key: ${key}\r\n` +
    '\r\n';
  socket.write(upgrade);
});

socket.on('data', (data: Buffer) => {
  console.log('📥 Raw data received:', data.length, 'bytes');
  console.log('Hex:', data.slice(0, Math.min(20, data.length)).toString('hex'));
  buffer = Buffer.concat([buffer, data]);
  
  if (stage === 'connecting') {
    const str = buffer.toString();
    if (str.includes('HTTP/1.1 101')) {
      console.log('✅ WebSocket upgraded!');
      stage = 'open';
      const idx = str.indexOf('\r\n\r\n') + 4;
      buffer = buffer.slice(idx);
      console.log('Buffer after upgrade:', buffer.length, 'bytes');
    }
    return;
  }
  
  // Try to parse as WebSocket frame
  if (buffer.length >= 2) {
    console.log('Frame header:', buffer[0].toString(16), buffer[1].toString(16));
  }
});

setTimeout(() => {
  console.log('⏹️ Closing, final buffer size:', buffer.length);
  socket.end();
  process.exit(0);
}, 3000);
