import { connect } from 'node:net';

const PORT = 3017;

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

function decodeFrame(buf: Buffer): { text: string; rest: Buffer } | null {
  if (buf.length < 2) return null;
  
  const opcode = buf[0] & 0x0f;
  const masked = (buf[1] & 0x80) !== 0;
  let payloadLen = buf[1] & 0x7f;
  let off = 2;
  
  if (payloadLen === 126) {
    if (buf.length < 4) return null;
    payloadLen = buf.readUInt16BE(2);
    off = 4;
  } else if (payloadLen === 127) {
    if (buf.length < 10) return null;
    payloadLen = buf.readUInt32BE(6);
    off = 10;
  }
  
  const maskLen = masked ? 4 : 0;
  if (buf.length < off + maskLen + payloadLen) return null;
  
  let payload = buf.slice(off + maskLen, off + maskLen + payloadLen);
  
  if (masked) {
    const mask = buf.slice(off, off + 4);
    for (let i = 0; i < payload.length; i++) {
      payload[i] ^= mask[i % 4];
    }
  }
  
  return {
    text: payload.toString('utf8'),
    rest: buf.slice(off + maskLen + payloadLen)
  };
}

socket.on('data', (data: Buffer) => {
  buffer = Buffer.concat([buffer, data]);
  
  if (stage === 'connecting') {
    const str = buffer.toString();
    if (str.includes('HTTP/1.1 101')) {
      console.log('✅ WebSocket upgraded!');
      stage = 'open';
      // Keep any extra data after headers
      const idx = str.indexOf('\r\n\r\n') + 4;
      buffer = buffer.slice(idx);
    }
    return;
  }
  
  // Parse all frames in buffer
  while (stage === 'open') {
    const result = decodeFrame(buffer);
    if (!result) break;
    
    buffer = result.rest;
    console.log('📨 Message:', result.text.substring(0, 200));
    
    try {
      const msg = JSON.parse(result.text);
      console.log('✅ Parsed type:', msg.type);
      
      if (msg.type === 'state') {
        console.log('🎮 Got state! Player:', msg.payload.playerId);
        setTimeout(sendPaint, 100);
      }
      if (msg.type === 'paint') {
        console.log('🎨 Got paint broadcast:', msg.payload);
      }
    } catch (e) {
      console.log('❌ Parse error:', e);
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
  frame[0] = 0x81;
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
}, 4000);
