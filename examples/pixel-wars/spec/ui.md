# Game UI

The entire game UI is a single HTML page served inline by the game server. No build tools, no external assets — everything is embedded.

## Layout

- The page must have a dark background (#1a1a2e) with the grid centered
- Above the grid: game title "⚔️ PIXEL WARS" and a round timer showing MM:SS countdown
- Below the grid: a scoreboard showing each team's color, cell count, and player count
- The player's own team must be highlighted in the scoreboard

## Grid Rendering

- The grid must be rendered as an HTML Canvas element, 500×500 pixels
- Each cell is 25×25 pixels with a 1px gap between cells
- Empty cells must be rendered as dark gray (#2a2a3e)
- Owned cells must be rendered in the team color with a subtle glow effect
- The cell under the mouse cursor must show a hover highlight
- Clicking a cell must send the paint command to the server

## Team Colors

- Red team: #ff4757
- Blue team: #3742fa
- Green team: #2ed573
- Yellow team: #ffa502

## Feedback

- When the player successfully paints a cell, it must flash white briefly
- When paint is rejected (cooldown), a small "⏳ wait" toast must appear for 1 second
- When a round ends, a full-screen overlay must show "🏆 [COLOR] WINS!" for 5 seconds
- The player's cooldown status must be shown as a thin progress bar below the grid

## Responsiveness

- The canvas must scale to fit the viewport on mobile devices
- Touch events must work the same as mouse clicks for painting
