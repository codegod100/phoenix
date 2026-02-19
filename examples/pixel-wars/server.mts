/**
 * ⚔️ PIXEL WARS — Real-time multiplayer territory game
 *
 * A single Node.js file: HTTP server + raw WebSocket + inline HTML/Canvas UI.
 * Zero dependencies. Run with: npx tsx server.ts
 *
 * Generated & governed by Phoenix VCS from spec/ requirements.
 */
import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import type { Socket } from 'node:net';

// ── Constants (from spec) ────────────────────────────────────────────────────
const GRID_W = 20;
const GRID_H = 20;
const MAX_PLAYERS = 20;
const COOLDOWN_MS = 500;
const ROUND_SECS = 120;
const INTERMISSION_SECS = 10;
const TEAMS = ['red', 'blue', 'green', 'yellow'] as const;
const TEAM_HEX: Record<string, string> = {
  red: '#ff4757', blue: '#3742fa', green: '#2ed573', yellow: '#ffa502',
};
const PORT = parseInt(process.env.PORT || '3000', 10);

type Team = (typeof TEAMS)[number];

// ── Game state ───────────────────────────────────────────────────────────────
interface Player {
  id: string;
  team: Team;
  ws: WSConn;
  lastPaint: number;
  cellsPainted: number;
}

// grid[y][x] = team color string | null
const grid: (string | null)[][] = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
const players = new Map<string, Player>();
let roundActive = false;
let roundSecsLeft = 0;
let roundNumber = 0;
let roundTimer: ReturnType<typeof setInterval> | null = null;
let intermissionTimer: ReturnType<typeof setTimeout> | null = null;

function resetGrid(): void {
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      grid[y][x] = null;
}

function teamScores(): Record<string, number> {
  const scores: Record<string, number> = {};
  for (const t of TEAMS) scores[t] = 0;
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (grid[y][x]) scores[grid[y][x]!]++;
  return scores;
}

function teamPlayerCounts(): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const t of TEAMS) counts[t] = 0;
  for (const p of players.values()) counts[p.team]++;
  return counts;
}

function smallestTeam(): Team {
  const counts = teamPlayerCounts();
  return TEAMS.reduce((min, t) => counts[t] < counts[min] ? t : min, TEAMS[0]);
}

function winningTeam(): string {
  const s = teamScores();
  let best = TEAMS[0];
  for (const t of TEAMS) if (s[t] > s[best]) best = t;
  return s[best] > 0 ? best : 'none';
}

// ── Round management ─────────────────────────────────────────────────────────
function startRound(): void {
  resetGrid();
  roundNumber++;
  roundSecsLeft = ROUND_SECS;
  roundActive = true;
  broadcast({ type: 'round_start', round: roundNumber, secs: ROUND_SECS, grid: flatGrid() });

  roundTimer = setInterval(() => {
    roundSecsLeft--;
    broadcast({ type: 'tick', secs: roundSecsLeft, scores: teamScores() });
    if (roundSecsLeft <= 0) endRound();
  }, 1000);
}

function endRound(): void {
  roundActive = false;
  if (roundTimer) { clearInterval(roundTimer); roundTimer = null; }
  const winner = winningTeam();
  const scores = teamScores();
  broadcast({ type: 'round_end', winner, scores, round: roundNumber });

  intermissionTimer = setTimeout(startRound, INTERMISSION_SECS * 1000);
}

function flatGrid(): (string | null)[] {
  const flat: (string | null)[] = [];
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      flat.push(grid[y][x]);
  return flat;
}

// ── WebSocket (raw, zero-dep) ────────────────────────────────────────────────
interface WSConn { socket: Socket; send: (obj: object) => void; alive: boolean }

function acceptWS(req: IncomingMessage, socket: Socket): WSConn | null {
  const key = req.headers['sec-websocket-key'];
  if (!key) return null;
  const accept = createHash('sha1')
    .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );
  const conn: WSConn = {
    socket,
    alive: true,
    send(obj: object) {
      if (!this.alive) return;
      const data = Buffer.from(JSON.stringify(obj), 'utf8');
      const len = data.length;
      let header: Buffer;
      if (len < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x81; header[1] = len;
      } else if (len < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x81; header[1] = 126;
        header.writeUInt16BE(len, 2);
      } else {
        header = Buffer.alloc(10);
        header[0] = 0x81; header[1] = 127;
        header.writeUInt32BE(0, 2);
        header.writeUInt32BE(len, 6);
      }
      socket.write(Buffer.concat([header, data]));
    },
  };
  return conn;
}

function decodeWSFrame(buf: Buffer): string | null {
  if (buf.length < 2) return null;
  const opcode = buf[0] & 0x0f;
  if (opcode === 0x08) return null; // close
  if (opcode === 0x09) return null; // ping (ignore for simplicity)
  if (opcode !== 0x01) return null; // only text
  const masked = (buf[1] & 0x80) !== 0;
  let payloadLen = buf[1] & 0x7f;
  let off = 2;
  if (payloadLen === 126) { payloadLen = buf.readUInt16BE(2); off = 4; }
  else if (payloadLen === 127) { payloadLen = buf.readUInt32BE(6); off = 10; }
  if (masked) {
    const mask = buf.subarray(off, off + 4); off += 4;
    const payload = Buffer.from(buf.subarray(off, off + payloadLen));
    for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
    return payload.toString('utf8');
  }
  return buf.subarray(off, off + payloadLen).toString('utf8');
}

// ── Broadcast ────────────────────────────────────────────────────────────────
function broadcast(msg: object): void {
  for (const p of players.values()) p.ws.send(msg);
}

// ── HTTP + WS Server ─────────────────────────────────────────────────────────
const server = createServer((req: IncomingMessage, res: ServerResponse) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(HTML);
  } else {
    res.writeHead(404); res.end('Not found');
  }
});

server.on('upgrade', (req: IncomingMessage, socket: Socket) => {
  const conn = acceptWS(req, socket);
  if (!conn) { socket.destroy(); return; }

  if (players.size >= MAX_PLAYERS) {
    conn.send({ type: 'error', error: 'room_full' });
    socket.end(); return;
  }

  const id = randomBytes(3).toString('hex');
  const team = smallestTeam();
  const player: Player = { id, team, ws: conn, lastPaint: 0, cellsPainted: 0 };
  players.set(id, player);

  // Send init
  conn.send({
    type: 'init', id, team, grid: flatGrid(),
    scores: teamScores(), teamPlayers: teamPlayerCounts(),
    round: roundNumber, secs: roundSecsLeft, roundActive,
  });
  broadcast({ type: 'player_join', id, team, count: players.size, teamPlayers: teamPlayerCounts() });

  // Start first round if needed
  if (!roundActive && !intermissionTimer && players.size >= 1) startRound();

  let msgBuf = Buffer.alloc(0);
  socket.on('data', (chunk: Buffer) => {
    msgBuf = Buffer.concat([msgBuf, chunk]);
    while (msgBuf.length >= 2) {
      let payloadLen = msgBuf[1] & 0x7f;
      let headerLen = 2;
      if (payloadLen === 126) headerLen = 4;
      else if (payloadLen === 127) headerLen = 10;
      const masked = (msgBuf[1] & 0x80) !== 0;
      const totalHeader = headerLen + (masked ? 4 : 0);
      // re-read actual payload length
      if (payloadLen === 126 && msgBuf.length >= 4) payloadLen = msgBuf.readUInt16BE(2);
      else if (payloadLen === 127 && msgBuf.length >= 10) payloadLen = msgBuf.readUInt32BE(6);
      const frameLen = totalHeader + payloadLen;
      if (msgBuf.length < frameLen) break;
      const frame = msgBuf.subarray(0, frameLen);
      msgBuf = Buffer.from(msgBuf.subarray(frameLen));
      const txt = decodeWSFrame(frame);
      if (txt) handleMessage(player, txt);
    }
  });

  socket.on('close', () => removePlayer(id));
  socket.on('error', () => removePlayer(id));
});

function removePlayer(id: string): void {
  const p = players.get(id);
  if (!p) return;
  p.ws.alive = false;
  players.delete(id);
  broadcast({ type: 'player_leave', id, count: players.size, teamPlayers: teamPlayerCounts() });
}

function handleMessage(player: Player, raw: string): void {
  let msg: any;
  try { msg = JSON.parse(raw); } catch { return; }

  if (msg.type === 'paint') {
    const { x, y } = msg;
    if (!roundActive) { player.ws.send({ type: 'error', error: 'round_not_active' }); return; }
    if (typeof x !== 'number' || typeof y !== 'number' ||
        x < 0 || x >= GRID_W || y < 0 || y >= GRID_H ||
        !Number.isInteger(x) || !Number.isInteger(y)) {
      player.ws.send({ type: 'error', error: 'invalid_cell' }); return;
    }
    const now = Date.now();
    if (now - player.lastPaint < COOLDOWN_MS) {
      player.ws.send({ type: 'error', error: 'too_fast' }); return;
    }
    player.lastPaint = now;
    player.cellsPainted++;
    grid[y][x] = player.team;
    broadcast({ type: 'paint', x, y, team: player.team, playerId: player.id });
  }
}

server.listen(PORT, () => {
  console.log(`\n  ⚔️  PIXEL WARS — http://localhost:${PORT}\n`);
  console.log(`  Open in multiple browser tabs to play!\n`);
});

// ── Inline HTML/CSS/JS ───────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>⚔️ Pixel Wars</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#1a1a2e;color:#eee;font-family:'Segoe UI',system-ui,sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100vh;padding:16px}
h1{font-size:28px;margin:8px 0;letter-spacing:2px}
.subtitle{font-size:13px;color:#888;margin-bottom:12px}
.timer{font-size:48px;font-weight:700;font-variant-numeric:tabular-nums;margin:4px 0 12px;letter-spacing:3px}
.timer.ending{color:#ff4757;animation:pulse .5s infinite alternate}
@keyframes pulse{from{opacity:1}to{opacity:.5}}
canvas{border-radius:8px;cursor:crosshair;image-rendering:pixelated;touch-action:none}
.scoreboard{display:flex;gap:12px;margin:16px 0;flex-wrap:wrap;justify-content:center}
.team-card{padding:10px 18px;border-radius:8px;background:#16213e;min-width:100px;text-align:center;transition:transform .15s,box-shadow .15s}
.team-card.mine{transform:scale(1.08);box-shadow:0 0 16px rgba(255,255,255,.15)}
.team-name{font-size:11px;text-transform:uppercase;letter-spacing:2px;margin-bottom:4px}
.team-score{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}
.team-players{font-size:11px;color:#888;margin-top:2px}
.cooldown-bar{width:500px;max-width:90vw;height:4px;background:#16213e;border-radius:2px;margin:8px 0;overflow:hidden}
.cooldown-fill{height:100%;background:#fff;border-radius:2px;transition:width 50ms linear}
.toast{position:fixed;top:20%;left:50%;transform:translate(-50%,-50%);font-size:20px;padding:10px 24px;border-radius:8px;background:rgba(0,0,0,.85);pointer-events:none;opacity:0;transition:opacity .15s}
.toast.show{opacity:1}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.85);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .3s}
.overlay.show{opacity:1;pointer-events:auto}
.overlay h2{font-size:64px;margin-bottom:12px}
.overlay p{font-size:24px;color:#aaa}
.info{font-size:12px;color:#555;margin-top:12px}
</style>
</head>
<body>
<h1>⚔️ PIXEL WARS</h1>
<div class="subtitle">Paint cells. Steal territory. <span id="pcount">0</span> players online</div>
<div class="timer" id="timer">2:00</div>
<canvas id="c" width="500" height="500"></canvas>
<div class="cooldown-bar"><div class="cooldown-fill" id="cd" style="width:0"></div></div>
<div class="scoreboard" id="sb"></div>
<div class="toast" id="toast"></div>
<div class="overlay" id="overlay"><h2 id="ovTitle"></h2><p id="ovSub"></p></div>
<div class="info">Round <span id="rnum">0</span> · Your team: <span id="myteam">—</span></div>
<script>
const COLORS={red:'#ff4757',blue:'#3742fa',green:'#2ed573',yellow:'#ffa502'};
const GRID_W=20,GRID_H=20,CELL=25;const canvas=document.getElementById('c');const ctx=canvas.getContext('2d');
let grid=new Array(GRID_W*GRID_H).fill(null);
let myId='',myTeam='',scores={red:0,blue:0,green:0,yellow:0},teamPlayers={red:0,blue:0,green:0,yellow:0};
let hoverX=-1,hoverY=-1,lastPaintTime=0,roundActive=false,timerSecs=0;
let flashCells=[];

// WS connect
const proto=location.protocol==='https:'?'wss:':'ws:';
const ws=new WebSocket(proto+'//'+location.host);
ws.onmessage=(e)=>{const m=JSON.parse(e.data);handle(m)};
ws.onclose=()=>{showToast('Disconnected — refresh to rejoin',3000)};

function handle(m){
  if(m.type==='init'){
    myId=m.id;myTeam=m.team;grid=m.grid;scores=m.scores;teamPlayers=m.teamPlayers;
    timerSecs=m.secs;roundActive=m.roundActive;
    document.getElementById('myteam').textContent=myTeam;
    document.getElementById('myteam').style.color=COLORS[myTeam];
    document.getElementById('rnum').textContent=m.round;
    renderScoreboard();draw();
  }
  if(m.type==='paint'){
    grid[m.y*GRID_W+m.x]=m.team;
    flashCells.push({x:m.x,y:m.y,t:Date.now()});
    scores[m.team]=(scores[m.team]||0);
    recalcScores();renderScoreboard();draw();
  }
  if(m.type==='tick'){
    timerSecs=m.secs;scores=m.scores;
    renderTimer();renderScoreboard();
  }
  if(m.type==='round_start'){
    grid=m.grid;timerSecs=m.secs;roundActive=true;
    document.getElementById('rnum').textContent=m.round;
    hideOverlay();recalcScores();renderScoreboard();draw();
  }
  if(m.type==='round_end'){
    roundActive=false;scores=m.scores;renderScoreboard();
    const w=m.winner;const clr=COLORS[w]||'#fff';
    showOverlay(w==='none'?'🤝 DRAW!':'🏆 '+w.toUpperCase()+' WINS!',
      Object.entries(m.scores).map(([t,s])=>t+': '+s).join('  '),clr);
  }
  if(m.type==='player_join'||m.type==='player_leave'){
    document.getElementById('pcount').textContent=m.count;
    teamPlayers=m.teamPlayers;renderScoreboard();
  }
  if(m.type==='error'){
    if(m.error==='too_fast')showToast('⏳ wait',800);
    if(m.error==='room_full')showToast('Room full!',3000);
  }
}

function recalcScores(){
  scores={red:0,blue:0,green:0,yellow:0};
  for(const c of grid)if(c)scores[c]++;
}

function draw(){
  ctx.fillStyle='#0f0f23';ctx.fillRect(0,0,500,500);
  const now=Date.now();
  for(let y=0;y<GRID_H;y++)for(let x=0;x<GRID_W;x++){
    const c=grid[y*GRID_W+x];const px=x*CELL,py=y*CELL;
    // flash?
    const flash=flashCells.find(f=>f.x===x&&f.y===y);
    const age=flash?now-flash.t:999;
    if(c){
      ctx.fillStyle=age<150?'#ffffff':COLORS[c]||'#888';
      ctx.shadowColor=COLORS[c]||'#888';ctx.shadowBlur=age<150?12:6;
      ctx.fillRect(px+1,py+1,CELL-2,CELL-2);
      ctx.shadowBlur=0;
    }else{
      ctx.fillStyle='#2a2a3e';
      ctx.fillRect(px+1,py+1,CELL-2,CELL-2);
    }
  }
  // hover
  if(hoverX>=0&&hoverY>=0){
    ctx.strokeStyle=COLORS[myTeam]||'#fff';ctx.lineWidth=2;
    ctx.strokeRect(hoverX*CELL+1,hoverY*CELL+1,CELL-2,CELL-2);
  }
  // cleanup old flashes
  flashCells=flashCells.filter(f=>now-f.t<200);
}

// input
canvas.addEventListener('mousemove',e=>{
  const r=canvas.getBoundingClientRect();
  hoverX=Math.floor((e.clientX-r.left)/(r.width/GRID_W));
  hoverY=Math.floor((e.clientY-r.top)/(r.height/GRID_H));
  draw();
});
canvas.addEventListener('mouseleave',()=>{hoverX=hoverY=-1;draw()});
canvas.addEventListener('click',e=>{
  const r=canvas.getBoundingClientRect();
  const x=Math.floor((e.clientX-r.left)/(r.width/GRID_W));
  const y=Math.floor((e.clientY-r.top)/(r.height/GRID_H));
  paint(x,y);
});
canvas.addEventListener('touchstart',e=>{
  e.preventDefault();const t=e.touches[0];
  const r=canvas.getBoundingClientRect();
  const x=Math.floor((t.clientX-r.left)/(r.width/GRID_W));
  const y=Math.floor((t.clientY-r.top)/(r.height/GRID_H));
  paint(x,y);
},{passive:false});

function paint(x,y){
  if(x<0||x>=GRID_W||y<0||y>=GRID_H)return;
  ws.send(JSON.stringify({type:'paint',x,y}));
  lastPaintTime=Date.now();
}

// cooldown bar
setInterval(()=>{
  const elapsed=Date.now()-lastPaintTime;
  const pct=Math.min(1,elapsed/500);
  document.getElementById('cd').style.width=(pct*100)+'%';
  document.getElementById('cd').style.background=pct<1?COLORS[myTeam]||'#fff':'#333';
},30);

// timer
function renderTimer(){
  const m=Math.floor(timerSecs/60);const s=timerSecs%60;
  const el=document.getElementById('timer');
  el.textContent=m+':'+String(s).padStart(2,'0');
  el.classList.toggle('ending',timerSecs<=10&&timerSecs>0);
}
renderTimer();

// scoreboard
function renderScoreboard(){
  const sb=document.getElementById('sb');
  sb.innerHTML=['red','blue','green','yellow'].map(t=>{
    const mine=t===myTeam?'mine':'';
    return '<div class="team-card '+mine+'" style="border:2px solid '+COLORS[t]+'"><div class="team-name" style="color:'+COLORS[t]+'">'+t+'</div><div class="team-score">'+
    (scores[t]||0)+'</div><div class="team-players">'+(teamPlayers[t]||0)+' player'+(teamPlayers[t]!==1?'s':'')+'</div></div>';
  }).join('');
}
renderScoreboard();

// toast
let toastTimer=null;
function showToast(txt,ms){
  const el=document.getElementById('toast');el.textContent=txt;el.classList.add('show');
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),ms||1500);
}

// overlay
function showOverlay(title,sub,clr){
  const ov=document.getElementById('overlay');
  document.getElementById('ovTitle').textContent=title;
  document.getElementById('ovTitle').style.color=clr||'#fff';
  document.getElementById('ovSub').textContent=sub;
  ov.classList.add('show');
}
function hideOverlay(){document.getElementById('overlay').classList.remove('show')}

// redraw loop
setInterval(draw,100);
</script>
</body>
</html>`;
