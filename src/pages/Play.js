import { useState } from 'react';
import { Link } from 'react-router-dom';
import './Play.css';

// Piece strength: higher = stronger
const STRENGTH    = { E: 6, M: 5, H: 4, D: 3, C: 2, R: 1 };
const PIECE_NAMES = { E: 'Elephant', M: 'Camel', H: 'Horse', D: 'Dog', C: 'Cat', R: 'Rabbit' };
const PIECE_EMOJI = { E: '🐘', M: '🐪', H: '🐴', D: '🐕', C: '🐈', R: '🐇' };

// Trap squares in screen coords (row 0 = top)
const TRAP_COORDS = [[2,2],[2,5],[5,2],[5,5]];
const TRAP_SET = new Set(TRAP_COORDS.map(([r,c]) => `${r},${c}`));

const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

function createInitialBoard() {
  const b = Array.from({ length: 8 }, () => Array(8).fill(null));
  // Silver at top (screen rows 0–1, Arima rows 8–7)
  ['C','D','H','E','M','H','D','C'].forEach((t, c) => { b[0][c] = { type: t, color: 'silver' }; });
  for (let c = 0; c < 8; c++) b[1][c] = { type: 'R', color: 'silver' };
  // Gold at bottom (screen rows 6–7, Arima rows 2–1)
  ['C','D','H','M','E','H','D','C'].forEach((t, c) => { b[6][c] = { type: t, color: 'gold' }; });
  for (let c = 0; c < 8; c++) b[7][c] = { type: 'R', color: 'gold' };
  return b;
}

function computeFrozen(board) {
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

function getValidMoves(board, row, col, player, frozen) {
  const p = board[row][col];
  if (!p || p.color !== player || frozen.has(`${row},${col}`)) return new Set();
  const moves = new Set();
  for (const [dr, dc] of DIRS) {
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
    if (board[nr][nc]) continue;
    // Rabbits cannot move backward
    if (p.type === 'R' && player === 'gold' && dr === 1) continue;
    if (p.type === 'R' && player === 'silver' && dr === -1) continue;
    moves.add(`${nr},${nc}`);
  }
  return moves;
}

function applyTraps(board) {
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

function checkWinner(board) {
  // Gold rabbit reaches screen row 0 (Arima row 8)
  for (let c = 0; c < 8; c++) {
    if (board[0][c]?.color === 'gold' && board[0][c]?.type === 'R') return 'gold';
    if (board[7][c]?.color === 'silver' && board[7][c]?.type === 'R') return 'silver';
  }
  let gr = 0, sr = 0;
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++) {
      if (board[r][c]?.type === 'R') {
        if (board[r][c].color === 'gold') gr++;
        else sr++;
      }
    }
  if (gr === 0) return 'silver';
  if (sr === 0) return 'gold';
  return null;
}

export default function Play() {
  const [board, setBoard] = useState(createInitialBoard);
  const [selected, setSelected] = useState(null);  // { row, col }
  const [validMoves, setValidMoves] = useState(new Set());
  const [player, setPlayer] = useState('gold');
  const [stepsLeft, setStepsLeft] = useState(4);
  const [winner, setWinner] = useState(null);

  const frozen = computeFrozen(board);
  const stepsUsed = 4 - stepsLeft;

  function handleClick(row, col) {
    if (winner) return;
    const key = `${row},${col}`;

    // Execute a move
    if (selected && validMoves.has(key)) {
      const next = board.map(r => [...r]);
      next[row][col] = next[selected.row][selected.col];
      next[selected.row][selected.col] = null;
      const afterTraps = applyTraps(next);
      const w = checkWinner(afterTraps);
      const newSteps = stepsLeft - 1;

      setBoard(afterTraps);
      setSelected(null);
      setValidMoves(new Set());

      if (w) { setWinner(w); return; }

      if (newSteps === 0) {
        setPlayer(p => p === 'gold' ? 'silver' : 'gold');
        setStepsLeft(4);
      } else {
        setStepsLeft(newSteps);
      }
      return;
    }

    // Select own piece
    const piece = board[row][col];
    if (piece?.color === player && !frozen.has(key)) {
      if (selected?.row === row && selected?.col === col) {
        setSelected(null);
        setValidMoves(new Set());
      } else {
        setSelected({ row, col });
        setValidMoves(getValidMoves(board, row, col, player, frozen));
      }
      return;
    }

    setSelected(null);
    setValidMoves(new Set());
  }

  function endTurn() {
    if (stepsUsed === 0) return;
    setPlayer(p => p === 'gold' ? 'silver' : 'gold');
    setStepsLeft(4);
    setSelected(null);
    setValidMoves(new Set());
  }

  function resetGame() {
    setBoard(createInitialBoard());
    setSelected(null);
    setValidMoves(new Set());
    setPlayer('gold');
    setStepsLeft(4);
    setWinner(null);
  }

  return (
    <div className="play-page">
      <div className="play-header">
        <Link to="/" className="back-link">← Home</Link>
        <h1 className="play-title">Arima</h1>
        <div className="step-track">
          {[1,2,3,4].map(i => (
            <div key={i} className={`step-pip ${i <= stepsUsed ? 'pip-used' : ''}`} />
          ))}
        </div>
      </div>

      {/* Silver player info */}
      {/*<div className="player-bar">
        <div className={`player-chip silver-chip${player === 'silver' && !winner ? ' chip-active' : ''}`}>
          Silver
        </div>
        {player === 'silver' && !winner && (
          <span className="turn-text">{stepsLeft} step{stepsLeft !== 1 ? 's' : ''} left</span>
        )}
      </div>*/}

      <div className="game-core">
      {/* Board */}
      <div className="board-container">
        {/* Top column labels */}
        <div className="labels-row">
          <div className="corner" />
          {'abcdefgh'.split('').map(l => <div key={l} className="col-lbl">{l}</div>)}
          <div className="corner" />
        </div>

        {board.map((row, r) => (
          <div key={r} className="board-row">
            <div className="row-lbl">{8 - r}</div>
            {row.map((piece, c) => {
              const key = `${r},${c}`;
              const isSelected = selected?.row === r && selected?.col === c;
              const isTarget = validMoves.has(key);
              const isTrap = TRAP_SET.has(key);
              const isFrozen = piece && frozen.has(key);

              return (
                <div
                  key={c}
                  className={[
                    'square',
                    isTrap ? 'sq-trap' : '',
                    isSelected ? 'sq-selected' : '',
                    isTarget ? 'sq-target' : '',
                    r === 0 ? 'top-edge' : r === 7 ? 'bottom-edge' : '',
                    c === 0 ? 'left-edge' : c === 7 ? 'right-edge' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleClick(r, c)}
                >
                  {piece ? (
                    <div className={`piece pc-${piece.color}${isFrozen ? ' pc-frozen' : ''}`}
                         title={`${piece.color} ${PIECE_NAMES[piece.type]}${isFrozen ? ' (frozen)' : ''}`}>
                      {PIECE_EMOJI[piece.type]}
                    </div>
                  ) : isTarget ? (
                    <div className="move-hint" />
                  ) : null}
                </div>
              );
            })}
            <div className="row-lbl">{8 - r}</div>
          </div>
        ))}

        {/* Bottom column labels */}
        <div className="labels-row">
          <div className="corner" />
          {'abcdefgh'.split('').map(l => <div key={l} className="col-lbl">{l}</div>)}
          <div className="corner" />
        </div>
      </div>

      {/* Gold player info */}
      {/*<div className="player-bar">
        <div className={`player-chip gold-chip${player === 'gold' && !winner ? ' chip-active' : ''}`}>
          Gold
        </div>
        {player === 'gold' && !winner && (
          <span className="turn-text">{stepsLeft} step{stepsLeft !== 1 ? 's' : ''} left</span>
        )}
      </div>*/}

      <div className="controls">
        <button className="btn-end" onClick={endTurn} disabled={stepsUsed === 0 || !!winner}>
          End Turn
        </button>
        <button className="btn-reset" onClick={resetGame}>
          New Game
        </button>
      </div>

      {winner && (
        <div className="winner-banner">
          <span>{winner === 'gold' ? 'Gold' : 'Silver'} wins!</span>
          <button onClick={resetGame}>Play Again</button>
        </div>
      )}
      </div>

      <details className="rules">
        <summary>Pieces &amp; Rules</summary>
        <div className="rules-body">
          <div className="piece-legend">
            {Object.entries(PIECE_NAMES).map(([type, name]) => (
              <div key={type} className="legend-row">
                <span className="legend-emoji">{PIECE_EMOJI[type]}</span>
                <span className="legend-letter">{type}</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <ul className="rules-list">
            <li>Each turn you may take <b>1–4 steps</b>; press <b>End Turn</b> when done (auto-ends after 4).</li>
            <li>Pieces move one square orthogonally per step.</li>
            <li><b>Rabbits</b> cannot step backward (toward their own home row).</li>
            <li><b>Frozen</b> pieces (dimmed) are adjacent to a stronger enemy with no friendly support — they cannot move.</li>
            <li><b>Traps</b> (c3, f3, c6, f6): a piece there with no friendly neighbor is captured.</li>
            <li><b>Win</b> by advancing a rabbit to the opponent's home row, or capturing all opponent rabbits.</li>
            <li>Push/pull moves are coming in a future update.</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
