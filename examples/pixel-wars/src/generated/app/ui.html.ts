/**
 * GameUI - Medium Tier IU
 * Generates the inline HTML game UI
 * 
 * Generated from canonical nodes:
 * - ui_single_page
 * - ui_canvas_rendering
 * - ui_click_handling
 * - ui_layout
 * - ui_feedback
 * - ui_responsive
 */

export function generateUI(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>⚔️ PIXEL WARS</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background: #1a1a2e;
      color: #fff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    h1 {
      font-size: 2rem;
      margin-bottom: 10px;
      text-shadow: 0 0 20px rgba(255,255,255,0.3);
    }
    
    .timer {
      font-size: 1.5rem;
      font-family: 'Courier New', monospace;
      color: #ffa502;
    }
    
    .game-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 20px;
    }
    
    #gameCanvas {
      border-radius: 8px;
      box-shadow: 0 0 30px rgba(0,0,0,0.5);
      cursor: crosshair;
      touch-action: none;
      max-width: 100%;
      height: auto;
    }
    
    .cooldown-bar {
      width: 500px;
      max-width: 100%;
      height: 4px;
      background: #2a2a3e;
      border-radius: 2px;
      overflow: hidden;
    }
    
    .cooldown-fill {
      height: 100%;
      background: linear-gradient(90deg, #ff4757, #ffa502);
      width: 100%;
      transition: width 0.1s linear;
    }
    
    .scoreboard {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 15px;
      width: 100%;
      max-width: 500px;
    }
    
    .team-card {
      background: #2a2a3e;
      padding: 15px;
      border-radius: 8px;
      text-align: center;
      transition: all 0.3s ease;
    }
    
    .team-card.active {
      box-shadow: 0 0 20px currentColor;
      transform: scale(1.05);
    }
    
    .team-card.red { color: #ff4757; }
    .team-card.blue { color: #3742fa; }
    .team-card.green { color: #2ed573; }
    .team-card.yellow { color: #ffa502; }
    
    .team-color {
      font-size: 1.5rem;
      margin-bottom: 5px;
    }
    
    .team-score {
      font-size: 1.25rem;
      font-weight: bold;
    }
    
    .team-players {
      font-size: 0.75rem;
      opacity: 0.7;
    }
    
    .toast {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.9);
      padding: 20px 40px;
      border-radius: 8px;
      font-size: 1.25rem;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 1000;
    }
    
    .toast.show {
      opacity: 1;
    }
    
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.8);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.5s ease;
      z-index: 100;
    }
    
    .overlay.show {
      opacity: 1;
    }
    
    @media (max-width: 600px) {
      h1 { font-size: 1.5rem; }
      .timer { font-size: 1.25rem; }
      #gameCanvas { width: 100%; max-width: 350px; }
      .scoreboard { grid-template-columns: repeat(2, 1fr); }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>⚔️ PIXEL WARS</h1>
    <div class="timer" id="timer">02:00</div>
  </div>
  
  <div class="game-container">
    <canvas id="gameCanvas" width="500" height="500"></canvas>
    <div class="cooldown-bar">
      <div class="cooldown-fill" id="cooldownBar"></div>
    </div>
    
    <div class="scoreboard" id="scoreboard">
      <div class="team-card red" data-team="red">
        <div class="team-color">🔴</div>
        <div class="team-score">0</div>
        <div class="team-players">0 players</div>
      </div>
      <div class="team-card blue" data-team="blue">
        <div class="team-color">🔵</div>
        <div class="team-score">0</div>
        <div class="team-players">0 players</div>
      </div>
      <div class="team-card green" data-team="green">
        <div class="team-color">🟢</div>
        <div class="team-score">0</div>
        <div class="team-players">0 players</div>
      </div>
      <div class="team-card yellow" data-team="yellow">
        <div class="team-color">🟡</div>
        <div class="team-score">0</div>
        <div class="team-players">0 players</div>
      </div>
    </div>
  </div>
  
  <div class="toast" id="toast"></div>
  
  <div class="overlay" id="overlay">
    <div id="winnerText"></div>
  </div>

  <script>
    // Game configuration
    const GRID_SIZE = 20;
    const CELL_SIZE = 25;
    const GAP = 1;
    const CANVAS_SIZE = 500;
    
    const TEAM_COLORS = {
      red: '#ff4757',
      blue: '#3742fa',
      green: '#2ed573',
      yellow: '#ffa502',
      empty: '#2a2a3e'
    };
    
    // Game state
    let ws = null;
    let playerId = null;
    let team = null;
    let grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    let timeRemaining = 120;
    let lastPaintTime = 0;
    let cooldownMs = 500;
    
    // DOM elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const timerEl = document.getElementById('timer');
    const cooldownBar = document.getElementById('cooldownBar');
    const toast = document.getElementById('toast');
    const overlay = document.getElementById('overlay');
    const winnerText = document.getElementById('winnerText');
    
    // Canvas rendering
    function drawGrid() {
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const owner = grid[y][x];
          const color = TEAM_COLORS[owner || 'empty'];
          
          const px = x * (CELL_SIZE + GAP);
          const py = y * (CELL_SIZE + GAP);
          
          // Draw cell
          ctx.fillStyle = color;
          ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
          
          // Glow effect for owned cells
          if (owner) {
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
            ctx.shadowBlur = 0;
          }
        }
      }
    }
    
    function updateTimer() {
      const mins = Math.floor(timeRemaining / 60);
      const secs = timeRemaining % 60;
      timerEl.textContent = \`\${mins.toString().padStart(2, '0')}:\${secs.toString().padStart(2, '0')}\`;
    }
    
    function updateCooldown() {
      const elapsed = Date.now() - lastPaintTime;
      const progress = Math.min(elapsed / cooldownMs, 1);
      cooldownBar.style.width = \`\${progress * 100}%\`;
    }
    
    function showToast(message) {
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 1000);
    }
    
    function showWinner(winner) {
      const emoji = { red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡' };
      winnerText.innerHTML = \`🏆 \${emoji[winner]} \${winner.toUpperCase()} WINS!\`;
      overlay.classList.add('show');
      setTimeout(() => overlay.classList.remove('show'), 5000);
    }
    
    function updateScoreboard(teams, myTeam) {
      for (const [teamName, data] of Object.entries(teams)) {
        const card = document.querySelector(\`.team-card[data-team="\${teamName}"]\`);
        if (card) {
          card.querySelector('.team-score').textContent = data.score;
          card.querySelector('.team-players').textContent = \`\${data.playerCount} players\`;
          card.classList.toggle('active', teamName === myTeam);
        }
      }
    }
    
    // Input handling
    function getCellFromEvent(e) {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = Math.floor(((e.clientX - rect.left) * scaleX) / (CELL_SIZE + GAP));
      const y = Math.floor(((e.clientY - rect.top) * scaleY) / (CELL_SIZE + GAP));
      
      return { x, y };
    }
    
    function handlePaint(e) {
      e.preventDefault();
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      
      const { x, y } = getCellFromEvent(e);
      
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        // Send with payload wrapper (protocol format)
        ws.send(JSON.stringify({ type: 'paint', payload: { x, y } }));
      }
    }
    
    canvas.addEventListener('click', handlePaint);
    canvas.addEventListener('touchstart', handlePaint, { passive: false });
    
    // Hover effect
    let hoveredCell = null;
    canvas.addEventListener('mousemove', (e) => {
      const { x, y } = getCellFromEvent(e);
      
      if (hoveredCell && (hoveredCell.x !== x || hoveredCell.y !== y)) {
        drawGrid(); // Clear previous highlight
      }
      
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        hoveredCell = { x, y };
        const px = x * (CELL_SIZE + GAP);
        const py = y * (CELL_SIZE + GAP);
        
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
      }
    });
    
    // WebSocket
    function connect() {
      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(\`\${protocol}//\${location.host}\`);
      
      ws.onopen = () => {
        console.log('Connected to game server');
      };
      
      ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'state':
            playerId = msg.payload.playerId;
            team = msg.payload.team;
            // Convert flat grid to 2D array
            const flatGrid = msg.payload.grid;
            grid = [];
            for (let y = 0; y < GRID_SIZE; y++) {
              grid[y] = [];
              for (let x = 0; x < GRID_SIZE; x++) {
                grid[y][x] = flatGrid[y * GRID_SIZE + x];
              }
            }
            timeRemaining = msg.payload.timeRemaining;
            updateScoreboard(msg.payload.teams, team);
            drawGrid();
            updateTimer();
            break;
            
          case 'paint':
            grid[msg.payload.y][msg.payload.x] = msg.payload.color;
            
            // Flash effect for own paints
            if (msg.payload.playerId === playerId) {
              const px = msg.payload.x * (CELL_SIZE + GAP);
              const py = msg.payload.y * (CELL_SIZE + GAP);
              ctx.fillStyle = '#fff';
              ctx.fillRect(px, py, CELL_SIZE, CELL_SIZE);
              setTimeout(drawGrid, 100);
            } else {
              drawGrid();
            }
            break;
            
          case 'timer':
            timeRemaining = msg.payload.timeRemaining;
            updateTimer();
            break;
            
          case 'players':
            // Update player counts
            break;
            
          case 'winner':
            updateScoreboard(msg.payload.teams, team);
            if (msg.payload.winner) {
              showWinner(msg.payload.winner);
            }
            break;
            
          case 'error':
            if (msg.payload.code === 'too_fast') {
              showToast('⏳ wait');
            }
            break;
        }
      };
      
      ws.onclose = () => {
        console.log('Disconnected, reconnecting...');
        setTimeout(connect, 1000);
      };
    }
    
    // Animation loop
    function loop() {
      updateCooldown();
      requestAnimationFrame(loop);
    }
    
    // Initialize
    drawGrid();
    connect();
    loop();
  </script>
</body>
</html>`;
}
