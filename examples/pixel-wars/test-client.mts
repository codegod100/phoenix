import { connect } from 'node:net';
import { createHash } from 'node:crypto';

const PORT = 3016;

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
  buffer = Buffer.concat([buffer, data]);
  
  if (stage === 'connecting') {
    const str = buffer.toString();
    if (str.includes('HTTP/1.1 101')) {
      console.log('✅ WebSocket upgraded!');
      stage = 'open';
      buffer = Buffer.alloc(0);
      // Wait for state message
    }
    return;
  }
  
  if (stage === 'open' && buffer.length >= 2) {
    // Parse WebSocket frame
    const opcode = buffer[0] & 0x0f;
    const len = buffer[1] & 0x7f;
    console.log('📦 Frame opcode:', opcode, 'len:', len, 'total buffer:', buffer.length);
    
    if (len < 126 && buffer.length >= 2 + len) {
      const payload = buffer.slice(2, 2 + len);
      const text = payload.toString('utf8');
      console.log('📨 Message:', text.substring(0, 200));
      
      // Try to parse
      try {
        const msg = JSON.parse(text);
        console.log('✅ Parsed type:', msg.type);
        if (msg.type === 'state') {
          console.log('🎮 Got state! Sending paint...');
          sendPaint();
        }
        if (msg.type === 'paint') {
          console.log('🎨 Got paint broadcast:', msg.payload);
        }
      } catch (e) {
        console.log('❌ Parse error:', e);
      }
      
      buffer = buffer.slice(2 + len);
    }
  }
});

function sendPaint() {
  const msg = JSON.stringify({ type: 'paint', payload: { x: 3, y: 4 } });
  const payload = Buffer.from(msg, 'utf8');
  const mask = Buffer.from([0x01, 0x02, 0x03, 0x04]);
  
  const masked = Buffer.alloc(payload.length);
  for (let i = 0; i < payload.length; i++) {
    masked[i] = payload[i] ^ mask[i % 4];
  }
  
  const frame = Buffer.alloc(2 + 4 + payload.length);
  frame[0] = 0x81; // text frame
  frame[1] = 0x80 | payload.length;
  mask.copy(frame, 2);
  masked.copy(frame, 6);
  
  console.log('🖌️ Sending paint:', msg);
  socket.write(frame);
}

setTimeout(() => {
  console.log('⏹️ Closing');
  socket.end();
  process.exit(0);
}, 3000);
