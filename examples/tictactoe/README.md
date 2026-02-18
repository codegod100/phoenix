# Multiplayer Tic-Tac-Toe — Phoenix Example

A real-time multiplayer tic-tac-toe game specified across three specs:
game engine, multiplayer networking, and web client.

## Run It

```bash
# From the phoenix repo root (one-time)
cd /path/to/phoenix
npm run build && npm link

# Enter this example
cd examples/tictactoe

# Generate everything from specs
phoenix init
phoenix bootstrap

# Install and run
npm install
npm test              # generated tests
npm start             # starts game-engine server on :3000
```

## Explore

```bash
phoenix status        # trust dashboard
phoenix canon         # 52 canonical nodes
phoenix plan          # 12 IUs across 3 services
phoenix drift         # check for unauthorized edits
phoenix evaluate      # evidence gaps per risk tier
```

## Specs

| Spec | Covers |
|------|--------|
| `spec/game-engine.md` | Board state, move validation, win detection, game lifecycle |
| `spec/multiplayer.md` | Player management, matchmaking, WebSocket rooms, reconnection |
| `spec/web-client.md` | Board UI, game status, lobby, styling |
