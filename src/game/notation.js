// ── Notation helpers (Arimaa standard) ──────────────────────────────────────
// file letter + rank number, e.g. board[0][0] → a8
export function toSquare(r, c) { return String.fromCharCode(97 + c) + (8 - r); }
// direction character between two adjacent squares
export function toDir(fr, fc, tr, tc) {
  if (tr < fr) return 'n';
  if (tr > fr) return 's';
  if (tc > fc) return 'e';
  return 'w';
}
// Gold pieces uppercase, silver lowercase (official Arimaa convention)
export function pieceChar(piece) { return piece.color === 'gold' ? piece.type : piece.type.toLowerCase(); }
export function stepNote(piece, fr, fc, tr, tc) {
  return pieceChar(piece) + toSquare(fr, fc) + toDir(fr, fc, tr, tc);
}
export function capNote(piece, r, c) { return pieceChar(piece) + toSquare(r, c) + 'x'; }

// Home rows each color may rearrange pieces within during setup
export const HOME_ROWS = { gold: [6, 7], silver: [0, 1] };

// Returns pieces present in `before` but absent in `after` (trap captures)
export function findCaptures(before, after) {
  const caps = [];
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (before[r][c] && !after[r][c]) caps.push({ piece: before[r][c], r, c });
  return caps;
}
