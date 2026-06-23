# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start          # dev server (localhost:3000)
npm run build      # production build
npm test           # Jest + React Testing Library (watch mode)
npm test -- --testPathPattern=<file>  # run a single test file
```

## Architecture

**Create React App** (react-scripts 5, React 19), React Router DOM v7, FontAwesome icons. No backend.

### Routing

Two routes in `src/App.js`:

- `/` → `src/pages/Home.js`
- `/play` → `src/pages/Play.js`

### Game logic (`src/game/arima.js`)

All game rules are **pure functions** with no React state — import and call freely. Key exports:

| Export                                                              | Purpose                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `createInitialBoard()`                                            | Returns 8×8 board array                                           |
| `computeFrozen(board)`                                            | Returns `Set<"row,col">` of frozen pieces                        |
| `getValidMoves(board, row, col, player, frozen)`                  | Returns `Set<"row,col">` of legal destinations                   |
| `getPushableEnemies(board, row, col, frozen)`                     | Weaker adjacent enemies the selected piece can push                |
| `getPushDests(board, pusheeRow, pusheeCol, pusherRow, pusherCol)` | Where the pushee can be sent                                       |
| `getPullables(board, fromRow, fromCol, toRow, toCol, player)`     | Enemies that were adjacent to the mover's origin and can be pulled |
| `applyTraps(board)`                                               | Removes unprotected pieces on trap squares; returns new board      |
| `checkWinner(board)`                                              | Returns `'gold'`, `'silver'`, or `null`                      |
| `serializePosition(board, player)`                                | Compact string for repetition detection                            |
| `hasAnyMove(board, player)`                                       | Immobilization check                                               |

**Board layout:** `board[row][col]`, row 0 = top (silver home), row 7 = bottom (gold home). Each cell is `null` or `{ id, type, color }` where `type` is one of `E M H D C R` (Elephant → Rabbit, strongest → weakest). Cells are addressed throughout as the string `"row,col"` stored in `Set`s.

**Traps** at rows/cols `(2,2) (2,5) (5,2) (5,5)`. A piece on a trap with no same-color neighbor is captured by `applyTraps`.

**Strength order:** `E > M > H > D > C > R`. Rabbits cannot step backward (gold cannot move south, silver cannot move north).

### Play page state (`src/pages/Play.js`)

All game state lives in one component. Key state variables:

- `board` — current board
- `selected` — `{ row, col }` of the piece the current player has clicked
- `validMoves` — `Set<"row,col">` for the selected piece
- `player` — `'gold'` | `'silver'`
- `currMove` — steps used this turn (0–4); auto-ends turn at 4
- `pushPhase` — `null` | `{ type:'push_dest', pusher, pushee, dests }` | `{ type:'pull_choice', from, pullables }`
- `dragging` — `{ row, col }` of piece being dragged, or `null`
- `moveHistory` — array of board snapshots indexed by `currMove` (supports undo/redo within a turn)
- `positionLog` — array of `serializePosition` strings across the whole game (repetition detection)

**Turn flow:** `handleClick(row, col)` is the single entry point for both click and drag interactions. It dispatches through push-dest → pull-choice → execute-queued-move → select-piece → initiate-push. After each move, `applyTraps` and `checkWinner` run. At step 4 (or on "End Turn"), `completeTurn` checks repetition/immobilization, then flips `player` and resets `currMove`/`moveHistory`.

**Push** is a 2-click sequence: select own piece → click an orange-highlighted weaker enemy (sets `pushPhase.type = 'push_dest'`) → click a purple destination. Costs 2 steps via `executePush`.

**Pull** is offered automatically after any normal move: if the mover survived and had a weaker enemy adjacent to its origin, those enemies highlight teal (`pushPhase.type = 'pull_choice'`). Clicking one calls `executePull`. Costs 2 steps total (1 for the move + 1 for the pull).

**Drag and drop** mirrors the click flow: `handleDragStart` force-selects the piece and sets `validMoves`, then `handleDrop` calls `handleClick` on the destination square. Drag is disabled during push/pull phases and when a winner exists.

## Style

### Comments

Please write useful comments and do not delete comments even if you were not the one who wrote them. Comments should be short but descriptive.
