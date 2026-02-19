# WebSocket Game Server

A real-time multiplayer pixel territory game. Players connect via WebSocket, pick a team color, and paint cells on a shared 20×20 grid. The team with the most cells wins.

## Connection Handling

- The server must accept WebSocket connections on a configurable port (default 3000)
- The same HTTP server must serve the game UI as a single HTML page at GET /
- Each connected player must be assigned a unique player_id (random 6-character hex string)
- On connect, the server must send the full grid state, player list, and remaining game time
- Disconnected players must be removed from the player list within 5 seconds
- The server must broadcast updated player counts whenever someone joins or leaves

## Rooms

- The server must support a single global game room (no room selection needed)
- Maximum 20 simultaneous players; additional connections must receive a "room_full" error and be closed
- The server must track each player's team color and total cells painted
