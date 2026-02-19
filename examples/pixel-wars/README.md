# ⚔️ Pixel Wars

A real-time multiplayer territory capture game — 4 teams paint cells on a shared 20×20 grid. The team with the most cells when the timer hits zero wins.

**Zero dependencies.** Single Node.js process. Raw WebSocket. Inline HTML/Canvas UI.

Built and governed by [Phoenix VCS](../../README.md).

## Play

```bash
npm start
# → http://localhost:3000

# Open 2+ browser tabs and start painting!
```

## How It Works

1. Connect → you're assigned to the smallest team (auto-balancing)
2. Click/tap cells to paint them your team's color
3. You can **steal** territory by painting over other teams' cells
4. 500ms cooldown between paints — speed matters, but so does strategy
5. 2-minute rounds → winner announced → new round starts automatically

## Teams

| Team | Color |
|------|-------|
| 🔴 Red | `#ff4757` |
| 🔵 Blue | `#3742fa` |
| 🟢 Green | `#2ed573` |
| 🟡 Yellow | `#ffa502` |

## Architecture

```
spec/server.md  ─┐
spec/game.md    ─┼─→  Phoenix Bootstrap  ─→  9 IUs  ─→  Generated Code
spec/ui.md      ─┘         │
                           ├─→ 55 canonical nodes (3 DEF, 19 CTX, 31 REQ, 2 CON)
                           ├─→ 164 typed edges
                           └─→ 100% extraction coverage
```

The hand-written `server.mts` (275 lines) implements the full game using only Node.js built-ins — `node:http`, `node:crypto`, and raw WebSocket frame encoding.

## Phoenix Commands

```bash
# See the trust dashboard
phoenix status

# Visualize the full provenance pipeline
phoenix inspect

# See what happens when you change a spec
echo "- Players must be able to change teams mid-round" >> spec/game.md
phoenix ingest spec/game.md
phoenix status   # ← shows the diff, classification, and cascade
```
