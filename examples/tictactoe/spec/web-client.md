# Web Client

## Game Board UI

- The board must be rendered as a 3x3 grid of clickable cells
- Each cell must display X, O, or be empty
- Clicking an empty cell must send a move to the server
- Cells must not be clickable when it is the opponent's turn
- Cells must not be clickable when the game is over
- The board must visually highlight the winning line when a game ends

## Game Status Display

- The UI must show whose turn it is (yours or opponent's)
- The UI must show the game result when the game ends (you win, you lose, draw)
- The UI must show a "waiting for opponent" message when in the lobby
- The UI must show a connection status indicator

## Lobby

- The lobby must show a "Create Game" button
- The lobby must show a list of available games to join
- Each available game must show the creator's display name
- The lobby must update in real-time as games are created or filled
- A player must enter a display name before creating or joining a game

## Styling

- The UI must be playable on both desktop and mobile screens
- The board must be centered on the screen
- X marks must be displayed in blue
- O marks must be displayed in red
- The winning cells must have a green background
- The overall design must be clean and minimal
