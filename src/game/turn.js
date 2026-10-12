// Whole-turn rules shared by the client and the server. Pure functions, no React —
// the server imports this file directly, so every import here must keep its `.js`
// extension (Node's ESM loader requires it; webpack doesn't mind).
import {
  STRENGTH, PIECE_NAMES, computeFrozen, applyTraps, checkWinner, serializePosition, hasAnyMove,
} from './arima.js';
import { HOME_ROWS, toSquare, capNote, findCaptures } from './notation.js';

const DIR_DELTA = { n: [-1, 0], s: [1, 0], e: [0, 1], w: [0, -1] };

// Pieces each side must place during setup
const SETUP_COUNTS = { E: 1, M: 1, H: 2, D: 2, C: 2, R: 8 };

// Parses step notation ("Rb2n") into board coordinates. Capture notes ("rc6x") parse to
// { capture: true } so callers can skip them. Returns null if the string is malformed.
export function parseStep(note) {
  const m = /^([EMHDCRemhdcr])([a-h])([1-8])([nsewx])$/.exec(note);
  if (!m) return null;
  const [, ch, file, rank, dir] = m;
  if (dir === 'x') return { capture: true };
  const row = 8 - Number(rank), col = file.charCodeAt(0) - 97;
  const [dr, dc] = DIR_DELTA[dir];
  return {
    note, row, col, toRow: row + dr, toCol: col + dc,
    type: ch.toUpperCase(),
    colorID: ch === ch.toUpperCase() ? 'Au' : 'Ag',
  };
}

// Replays one step at a time, recursing so an ambiguous enemy step can be tried as both
// a push and a pull. ctx carries what the previous step allows:
//   pullFrom    — own piece's origin square + strength, if its step can still be used to pull
//   pendingPush — an enemy was just displaced; the pusher must fill its origin this step
function replay(board, player, steps, i, ctx) {
  if (i === steps.length) {
    if (ctx.pendingPush) return { error: 'A push must be finished by the pushing piece' };
    return { board, notes: ctx.notes };
  }

  const s = steps[i];
  const piece = board[s.row][s.col];
  if (!piece || piece.type !== s.type || piece.colorID !== s.colorID) {
    return { error: `${s.note}: no such piece on ${toSquare(s.row, s.col)}` };
  }
  if (s.toRow < 0 || s.toRow > 7 || s.toCol < 0 || s.toCol > 7) {
    return { error: `${s.note}: moves off the board` };
  }
  if (board[s.toRow][s.toCol]) return { error: `${s.note}: destination is occupied` };

  // Frozen status is judged on the position before this step
  const frozen = computeFrozen(board);
  const strength = STRENGTH[piece.type];

  const moved = board.map(r => [...r]);
  moved[s.toRow][s.toCol] = piece;
  moved[s.row][s.col] = null;
  const after = applyTraps(moved);
  const notes = [...ctx.notes, s.note, ...findCaptures(moved, after).map(c => capNote(c.piece, c.r, c.c))];

  // ── Own piece ──
  if (piece.colorID === player) {
    // Second half of a push: the pusher steps into the square the enemy vacated
    if (ctx.pendingPush) {
      const p = ctx.pendingPush;
      if (s.toRow !== p.row || s.toCol !== p.col) {
        return { error: `${s.note}: a push must be finished by moving into ${toSquare(p.row, p.col)}` };
      }
      if (strength <= p.strength) return { error: `${s.note}: only a stronger piece can push` };
      if (p.frozen.has(`${s.row},${s.col}`)) return { error: `${s.note}: a frozen piece cannot push` };
      return replay(after, player, steps, i + 1, { notes });
    }

    if (frozen.has(`${s.row},${s.col}`)) return { error: `${s.note}: ${PIECE_NAMES[piece.type]} is frozen` };
    if (piece.type === 'R' && ((player === 'Au' && s.toRow > s.row) || (player === 'Ag' && s.toRow < s.row))) {
      return { error: `${s.note}: rabbits cannot step backward` };
    }
    // Matches the client: only a mover that survived its step may pull
    const pullFrom = after[s.toRow][s.toCol] ? { row: s.row, col: s.col, strength } : null;
    return replay(after, player, steps, i + 1, { notes, pullFrom });
  }

  // ── Enemy piece: only legal as half of a push or pull ──
  if (ctx.pendingPush) return { error: `${s.note}: the previous push was never finished` };

  const attempts = [];
  // Push: the next step must bring a stronger, unfrozen own piece into this origin
  if (i + 1 < steps.length) {
    attempts.push(() => replay(after, player, steps, i + 1,
      { notes, pendingPush: { row: s.row, col: s.col, strength, frozen } }));
  }
  // Pull: the previous own step vacated this destination, and the mover is stronger
  const pf = ctx.pullFrom;
  if (pf && pf.row === s.toRow && pf.col === s.toCol && pf.strength > strength) {
    attempts.push(() => replay(after, player, steps, i + 1, { notes }));
  }
  if (attempts.length === 0) {
    return { error: `${s.note}: enemy pieces can only move by being pushed or pulled` };
  }

  // Keep the first error if every interpretation fails
  let firstFail = null;
  for (const attempt of attempts) {
    const res = attempt();
    if (!res.error) return res;
    firstFail ??= res;
  }
  return firstFail;
}

// Validates and applies a whole turn given as step notation. Capture notes in the input
// are ignored — captures are recomputed. Returns { board, notes } (notes includes the
// recomputed captures) or { error }. Does not judge goal/repetition/immobilization;
// see judgeTurnEnd.
export function applyTurn(startBoard, player, stepNotes) {
  if (!Array.isArray(stepNotes)) return { error: 'Steps must be a list' };
  const steps = [];
  for (const note of stepNotes) {
    const s = typeof note === 'string' ? parseStep(note) : null;
    if (!s) return { error: `Malformed step "${note}"` };
    if (!s.capture) steps.push(s);
  }
  if (steps.length === 0) return { error: 'A turn needs at least one step' };
  if (steps.length > 4) return { error: 'A turn has at most 4 steps' };

  const res = replay(startBoard, player, steps, 0, { notes: [] });
  if (res.error) return res;

  // No passing: the turn must change the position
  if (serializePosition(res.board, player) === serializePosition(startBoard, player)) {
    return { error: 'Your turn must change the position' };
  }
  return res;
}

// End-of-turn judging, in the official order: goal/elimination on the final position,
// then repetition (a 3rd occurrence loses for the mover), then immobilization of the
// next player. Returns { winner, positionLog } with the turn's position appended unless
// it was an illegal repetition.
export function judgeTurnEnd(board, player, positionLog) {
  const nextPlayer = player === 'Au' ? 'Ag' : 'Au';

  const winner = checkWinner(board, player);
  if (winner) return { winner, positionLog };

  const posKey = serializePosition(board, nextPlayer);
  if (positionLog.filter(k => k === posKey).length >= 2) return { winner: nextPlayer, positionLog };

  const newLog = [...positionLog, posKey];
  if (!hasAnyMove(board, nextPlayer)) return { winner: player, positionLog: newLog };
  return { winner: null, positionLog: newLog };
}

// Places one side's setup. `rows` is that side's HOME_ROWS as two arrays of 8 piece
// letters (e.g. [['C','D',...], ['R',...]]). Returns { board } or { error }.
export function applySetup(board, colorID, rows) {
  const homeRows = HOME_ROWS[colorID];
  if (!homeRows || !Array.isArray(rows) || rows.length !== 2 || rows.some(r => !Array.isArray(r) || r.length !== 8)) {
    return { error: 'Setup must be two rows of 8 pieces' };
  }

  const counts = {};
  for (const t of rows.flat()) {
    if (!(t in SETUP_COUNTS)) return { error: `Unknown piece "${t}"` };
    counts[t] = (counts[t] ?? 0) + 1;
  }
  if (Object.entries(SETUP_COUNTS).some(([t, n]) => counts[t] !== n)) {
    return { error: 'Setup must use exactly 1 E, 1 M, 2 H, 2 D, 2 C and 8 R' };
  }

  // Fresh ids per type (R0..R7, H1/H2, ...) mirroring createInitialBoard
  const next = board.map(r => [...r]);
  const seen = {};
  const color = colorID === 'Au' ? 'gold' : 'silver';
  homeRows.forEach((r, i) => rows[i].forEach((type, c) => {
    seen[type] = (seen[type] ?? 0) + 1;
    const id = type === 'R' ? `R${seen[type] - 1}` : `${type}${seen[type]}`;
    next[r][c] = { id, type, colorID, color };
  }));
  return { board: next };
}
