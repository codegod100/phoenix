/**
 * Test: Two-player grid sync verification
 * 
 * This test verifies that when Player 2 joins after Player 1 has painted,
 * Player 2 receives the current grid state (including Player 1's paintings).
 */

import { GameStateManager, GRID_SIZE, ROUND_DURATION } from './src/generated/app/game-state.js';
import { PlayerManager } from './src/generated/app/players.js';
import { Messages, GridSerialization } from './src/generated/app/message-protocol.js';

// Mock WebSocket connection
class MockConn {
  messages: any[] = [];
  alive = true;
  
  send(obj: object) {
    this.messages.push(obj);
  }
}

// Simulate server connection logic
function simulatePlayerJoin(
  gameState: GameStateManager,
  playerManager: PlayerManager,
  connections: Map<string, MockConn>
) {
  // Check room capacity
  if (!playerManager.canAcceptPlayer()) {
    return { error: 'room_full' };
  }
  
  // Add player
  const { player, error } = playerManager.addPlayer();
  if (error) {
    return { error };
  }
  
  // Create connection
  const conn = new MockConn();
  connections.set(player.id, conn);
  
  // Update game state
  gameState.updateTeamPlayerCount(player.team, 1);
  
  // Send initial state
  const game = gameState.getState();
  const teams: Record<string, { score: number; playerCount: number }> = {};
  for (const [color, teamData] of game.teams) {
    teams[color] = { score: teamData.score, playerCount: teamData.playerCount };
  }
  
  conn.send(Messages.state({
    playerId: player.id,
    team: player.team,
    grid: GridSerialization.toFlat(game.grid),
    teams,
    timeRemaining: game.timeRemaining,
    phase: game.phase,
  }));
  
  // Start round if first player
  const playerCount = playerManager.getPlayerCount();
  const isFirstPlayer = playerCount === 1;
  const isFreshRound = game.timeRemaining === ROUND_DURATION;
  
  console.log(`Player joined: count=${playerCount}, isFirst=${isFirstPlayer}, freshRound=${isFreshRound}`);
  
  if (isFirstPlayer && isFreshRound) {
    console.log('Starting round (first player)...');
    gameState.startRound();
  }
  
  return { player, conn };
}

function simulatePaint(
  gameState: GameStateManager,
  playerManager: PlayerManager,
  playerId: string,
  x: number,
  y: number
) {
  const player = playerManager.getPlayer(playerId);
  if (!player) return { success: false, error: 'player_not_found' };
  
  // Check cooldown
  const cooldown = playerManager.canPaint(playerId);
  if (!cooldown.allowed) {
    return { success: false, error: 'too_fast' };
  }
  
  // Check game phase
  const state = gameState.getState();
  if (state.phase !== 'playing') {
    return { success: false, error: 'round_not_active' };
  }
  
  // Execute paint
  const success = gameState.paintCell(x, y, player.team);
  
  if (success) {
    playerManager.recordPaint(playerId);
    return { success: true, color: player.team };
  }
  
  return { success: false };
}

// Run test
async function main() {
console.log('=== Two-Player Grid Sync Test ===\n');

// Create fresh game state
const gameState = new GameStateManager();
const playerManager = new PlayerManager();
const connections = new Map<string, MockConn>();

// Step 1: Player 1 joins
console.log('Step 1: Player 1 joins');
const result1 = simulatePlayerJoin(gameState, playerManager, connections);
if (result1.error) {
  console.error('Failed to add Player 1:', result1.error);
  process.exit(1);
}
const player1 = result1.player!;
const conn1 = result1.conn!;
console.log(`  Player 1 ID: ${player1.id}, Team: ${player1.team}`);
console.log(`  Player 1 received state with ${conn1.messages[0].payload.grid.filter((c: string | null) => c !== null).length} painted cells`);

// Step 2: Player 1 paints some cells
console.log('\nStep 2: Player 1 paints cells (0,0), (1,1), (2,2)');
const paint1 = simulatePaint(gameState, playerManager, player1.id, 0, 0);
console.log(`  Paint (0,0): ${paint1.success ? 'SUCCESS' : 'FAILED - ' + paint1.error}`);

// Wait for cooldown
console.log('  Waiting 600ms for cooldown...');
await new Promise(r => setTimeout(r, 600));

const paint2 = simulatePaint(gameState, playerManager, player1.id, 1, 1);
console.log(`  Paint (1,1): ${paint2.success ? 'SUCCESS' : 'FAILED - ' + paint2.error}`);

await new Promise(r => setTimeout(r, 600));

const paint3 = simulatePaint(gameState, playerManager, player1.id, 2, 2);
console.log(`  Paint (2,2): ${paint3.success ? 'SUCCESS' : 'FAILED - ' + paint3.error}`);

// Verify grid state
const currentState = gameState.getState();
const paintedCells = currentState.grid.flat().filter(c => c !== null).length;
console.log(`  Grid now has ${paintedCells} painted cells`);
console.log(`  Cell (0,0): ${currentState.grid[0][0]}`);
console.log(`  Cell (1,1): ${currentState.grid[1][1]}`);
console.log(`  Cell (2,2): ${currentState.grid[2][2]}`);

// Step 3: Player 2 joins
console.log('\nStep 3: Player 2 joins');
const result2 = simulatePlayerJoin(gameState, playerManager, connections);
if (result2.error) {
  console.error('Failed to add Player 2:', result2.error);
  process.exit(1);
}
const player2 = result2.player!;
const conn2 = result2.conn!;
console.log(`  Player 2 ID: ${player2.id}, Team: ${player2.team}`);

// Check what Player 2 received
const stateMsg = conn2.messages.find(m => m.type === 'state');
if (!stateMsg) {
  console.error('ERROR: Player 2 did not receive state message!');
  process.exit(1);
}

const receivedGrid = stateMsg.payload.grid;
const receivedPaintedCells = receivedGrid.filter((c: string | null) => c !== null).length;
console.log(`  Player 2 received state with ${receivedPaintedCells} painted cells`);

// Convert flat grid back to 2D for verification
const grid2D: (string | null)[][] = [];
for (let y = 0; y < GRID_SIZE; y++) {
  grid2D[y] = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    grid2D[y][x] = receivedGrid[y * GRID_SIZE + x];
  }
}

console.log(`  Player 2 sees cell (0,0): ${grid2D[0][0]}`);
console.log(`  Player 2 sees cell (1,1): ${grid2D[1][1]}`);
console.log(`  Player 2 sees cell (2,2): ${grid2D[2][2]}`);

// Verify
console.log('\n=== Verification ===');
let passed = true;

if (receivedPaintedCells !== 3) {
  console.error(`❌ FAIL: Expected 3 painted cells, got ${receivedPaintedCells}`);
  passed = false;
} else {
  console.log('✅ PASS: Player 2 received correct number of painted cells');
}

if (grid2D[0][0] !== player1.team) {
  console.error(`❌ FAIL: Expected cell (0,0) to be ${player1.team}, got ${grid2D[0][0]}`);
  passed = false;
} else {
  console.log('✅ PASS: Player 2 sees Player 1\'s paint at (0,0)');
}

if (grid2D[1][1] !== player1.team) {
  console.error(`❌ FAIL: Expected cell (1,1) to be ${player1.team}, got ${grid2D[1][1]}`);
  passed = false;
} else {
  console.log('✅ PASS: Player 2 sees Player 1\'s paint at (1,1)');
}

if (grid2D[2][2] !== player1.team) {
  console.error(`❌ FAIL: Expected cell (2,2) to be ${player1.team}, got ${grid2D[2][2]}`);
  passed = false;
} else {
  console.log('✅ PASS: Player 2 sees Player 1\'s paint at (2,2)');
}

console.log('\n=== Result ===');
if (passed) {
  console.log('✅ ALL TESTS PASSED');
  process.exit(0);
} else {
  console.log('❌ TESTS FAILED');
  process.exit(1);
}
}

main();
