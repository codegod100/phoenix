# Game Engine

## Board State

- The board must be a 3x3 grid of cells
- Each cell must be in one of three states: empty, X, or O
- A new game must start with all cells empty
- The board state must be serializable to a compact string format (e.g. "XO--X-O--")

## Move Validation

- A move must specify a row (0-2) and column (0-2)
- A move must be rejected if the cell is already occupied
- A move must be rejected if the game is already over
- A move must be rejected if it is not the current player's turn
- X always moves first

## Win Detection

- A player wins by occupying three cells in a horizontal row
- A player wins by occupying three cells in a vertical column
- A player wins by occupying three cells along either diagonal
- The game must detect a draw when all cells are filled with no winner
- Win detection must run after every move

## Game Lifecycle

- Each game must have a unique game ID
- The game must track whose turn it is (X or O)
- The game must track the current status: waiting, in-progress, x-wins, o-wins, draw
- A game in "waiting" status has one player and is waiting for an opponent
- The game must record a history of all moves with timestamps
- A completed game must not accept new moves
