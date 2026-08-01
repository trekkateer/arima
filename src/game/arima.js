export const STRENGTH    = { E: 6, M: 5, H: 4, D: 3, C: 2, R: 1 };
export const PIECE_NAMES = { E: 'Elephant', M: 'Camel', H: 'Horse', D: 'Dog', C: 'Cat', R: 'Rabbit' };
export const PIECE_EMOJI = { E: '🐘', M: '🐪', H: '🐴', D: '🐕', C: '🐈', R: '🐇' };

export const TRAP_COORDS = [[2,2],[2,5],[5,2],[5,5]];
export const TRAP_SET = new Set(TRAP_COORDS.map(([row,col]) => `${row},${col}`));

export const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

// Creates the initial board state
export function createInitialBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  ['C1','D1','H1','E1','M1','H2','D2','C2'].forEach((piece, c) => { board[0][c] = { id: piece, type: piece[0], color: 'silver' }; });
  for (let i = 0; i < 8; i++) board[1][i] = { id: 'R'+i, type: 'R', color: 'silver' };
  ['C1','D1','H1','E1','M1','H2','D2','C2'].forEach((piece, c) => { board[6][c] = { id: piece, type: piece[0], color: 'gold' }; });
  for (let i = 0; i < 8; i++) board[7][i] = { id: 'R'+i, type: 'R', color: 'gold' };
  return board;
}

// Calculates which pieces are frozen
export function computeFrozen(board) {
  const frozen = new Set();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      let strongerEnemy = false, hasFriend = false;
      for (const [dr, dc] of DIRS) {
        const nr = r + dr, nc = c + dc;
        if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
        const adj = board[nr][nc];
        if (!adj) continue;
        if (adj.color === p.color) hasFriend = true;
        else if (STRENGTH[adj.type] > STRENGTH[p.type]) strongerEnemy = true;
      }
      if (strongerEnemy && !hasFriend) frozen.add(`${r},${c}`);
    }
  }
  return frozen;
}

// Returns a set of "row,col" strings for valid move destinations for the piece at (row,col)
export function getValidMoves(board, row, col, player, frozen) {
  const p = board[row][col];
  if (!p || p.color !== player || frozen.has(`${row},${col}`)) return new Set();
  const moves = new Set();
  for (const [dr, dc] of DIRS) {
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
    if (board[nr][nc]) continue;
    if (p.type === 'R' && player === 'gold' && dr === 1) continue;
    if (p.type === 'R' && player === 'silver' && dr === -1) continue;
    moves.add(`${nr},${nc}`);
  }
  return moves;
}

// Returns a set of pushable enemies
export function getPushableEnemies(board, row, col, frozen) {
  if (frozen.has(`${row},${col}`)) return new Set();
  const p = board[row][col];
  if (!p) return new Set();
  const result = new Set();
  for (const [dr, dc] of DIRS) {
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
    const adj = board[nr][nc];
    if (adj && adj.color !== p.color && STRENGTH[p.type] > STRENGTH[adj.type]) {
      if (getPushDests(board, nr, nc, row, col).size > 0) result.add(`${nr},${nc}`);
    }
  }
  return result;
}

// Returns a set of "row,col" strings for valid push destinations for a given pushee
export function getPushDests(board, pusheeRow, pusheeCol, pusherRow, pusherCol) {
  const dests = new Set();
  for (const [dr, dc] of DIRS) {
    const nr = pusheeRow + dr, nc = pusheeCol + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
    if (nr === pusherRow && nc === pusherCol) continue;
    if (!board[nr][nc]) dests.add(`${nr},${nc}`);
  }
  return dests;
}

// Returns a set of "row,col" strings for pieces that can be pulled by the mover
export function getPullables(board, fromRow, fromCol, toRow, toCol, player) {
  const mover = board[fromRow][fromCol];
  if (!mover) return new Set();
  const result = new Set();
  for (const [dr, dc] of DIRS) {
    const nr = fromRow + dr, nc = fromCol + dc;
    if (nr === toRow && nc === toCol) continue;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
    const adj = board[nr][nc];
    if (adj && adj.color !== player && STRENGTH[mover.type] > STRENGTH[adj.type]) {
      result.add(`${nr},${nc}`);
    }
  }
  return result;
}

// Returns a new board state after applying traps
export function applyTraps(board) {
  const next = board.map(r => [...r]);
  for (const [tr, tc] of TRAP_COORDS) {
    const p = next[tr][tc];
    if (!p) continue;
    const safe = DIRS.some(([dr, dc]) => {
      const nr = tr + dr, nc = tc + dc;
      return nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && next[nr][nc]?.color === p.color;
    });
    if (!safe) next[tr][tc] = null;
  }
  return next;
}

// Returns 'gold' if gold wins, 'silver' if silver wins, or null if no winner yet.
// Only meaningful on the *final* position of a turn — Arimaa evaluates goal at the
// end of a turn, so a rabbit that touches the goal row mid-turn and steps away has
// not won. `mover` is the player who just finished their turn; the checks are
// ordered so the mover wins any tie (e.g. a turn that sends both sides' rabbits
// home, or one that clears the last rabbits off both sides).
export function checkWinner(board, mover) {
  const opponent = mover === 'gold' ? 'silver' : 'gold';

  // A rabbit of `color` standing on that color's goal row (gold → row 0, silver → row 7)
  const atGoal = (color) => {
    const goalRow = color === 'gold' ? 0 : 7;
    return board[goalRow].some(p => p?.color === color && p.type === 'R');
  };

  const rabbitCount = (color) =>
    board.flat().filter(p => p?.color === color && p.type === 'R').length;

  if (atGoal(mover)) return mover;
  if (atGoal(opponent)) return opponent;
  if (rabbitCount(opponent) === 0) return mover;
  if (rabbitCount(mover) === 0) return opponent;
  return null;
}

// Serialize board + player to move into a compact string for repetition detection
export function serializePosition(board, player) {
  return board.map(row => row.map(p => p ? `${p.color[0]}${p.type}` : '.').join('')).join('/') + '|' + player;
}

// Returns true if the given player has at least one legal action (move or push)
export function hasAnyMove(board, player) {
  const frozen = computeFrozen(board);
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== player) continue;
      if (getValidMoves(board, r, c, player, frozen).size > 0) return true;
      if (getPushableEnemies(board, r, c, frozen).size > 0) return true;
    }
  return false;
}
