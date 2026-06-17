import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleLeft } from '@fortawesome/free-solid-svg-icons';
import { faCircleRight } from '@fortawesome/free-solid-svg-icons';
import './Play.css';

// Piece strength: higher = stronger
const STRENGTH    = { E: 6, M: 5, H: 4, D: 3, C: 2, R: 1 };
const PIECE_NAMES = { E: 'Elephant', M: 'Camel', H: 'Horse', D: 'Dog', C: 'Cat', R: 'Rabbit' };
const PIECE_EMOJI = { E: '🐘', M: '🐪', H: '🐴', D: '🐕', C: '🐈', R: '🐇' };

// Trap squares in screen coords (row 0 = top)
const TRAP_COORDS = [[2,2],[2,5],[5,2],[5,5]];
const TRAP_SET = new Set(TRAP_COORDS.map(([row,col]) => `${row},${col}`));

// Directions
const DIRS = [[-1,0],[1,0],[0,-1],[0,1]];

// Creates the initial board state
function createInitialBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(null));
  // Silver at top (screen rows 0–1, Arima rows 8–7)
  ['C1','D1','H1','E1','M1','H2','D2','C2'].forEach((piece, c) => { board[0][c] = { id: piece, type: piece[0], color: 'silver' }; });
  for (let i = 0; i < 8; i++) board[1][i] = { id: 'R'+i, type: 'R', color: 'silver' };
  // Gold at bottom (screen rows 6–7, Arima rows 2–1)
  ['C1','D1','H1','E1','M1','H2','D2','C2'].forEach((piece, c) => { board[6][c] = { id: piece, type: piece[0], color: 'gold' }; });
  for (let i = 0; i < 8; i++) board[7][i] = { id: 'R'+i, type: 'R', color: 'gold' };
  return board;
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

// Returns adjacent weaker enemies that have at least one valid push destination
function getPushableEnemies(board, row, col, frozen) {
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

// Empty squares adjacent to pushee, excluding the pusher's square
function getPushDests(board, pusheeRow, pusheeCol, pusherRow, pusherCol) {
  const dests = new Set();
  for (const [dr, dc] of DIRS) {
    const nr = pusheeRow + dr, nc = pusheeCol + dc;
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) continue;
    if (nr === pusherRow && nc === pusherCol) continue;
    if (!board[nr][nc]) dests.add(`${nr},${nc}`);
  }
  return dests;
}

// Weaker enemies adjacent to the FROM square, excluding the TO square
function getPullables(board, fromRow, fromCol, toRow, toCol, player) {
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
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState(new Set());
  const [player, setPlayer] = useState('gold');
  const [currMove, setCurrMove] = useState(0);
  const [winner, setWinner] = useState(null);
  // null | { type:'push_dest', pusher, pushee, dests } | { type:'pull_choice', from, pullables }
  const [pushPhase, setPushPhase] = useState(null);

  const frozen = computeFrozen(board);

  const [moveHistory, setMoveHistory] = useState([board.map(r => r.map(p => p ? { ...p } : null))]);

  function cloneBoard(b) {
    return b.map(r => r.map(p => p ? { ...p } : null));
  }

  function executePush(pusher, pushee, dest) {
    // Step 1: pushee moves to dest
    const mid = board.map(r => [...r]);
    mid[dest.row][dest.col] = mid[pushee.row][pushee.col];
    mid[pushee.row][pushee.col] = null;
    const midBoard = applyTraps(mid);

    // Step 2: pusher moves to pushee's old square
    const fin = midBoard.map(r => [...r]);
    fin[pushee.row][pushee.col] = fin[pusher.row][pusher.col];
    fin[pusher.row][pusher.col] = null;
    const finBoard = applyTraps(fin);

    const newWinner = checkWinner(finBoard);
    const newCurrMove = currMove + 2;
    const nextHistory = [...moveHistory.slice(0, currMove + 1), cloneBoard(midBoard), cloneBoard(finBoard)];

    setBoard(finBoard);
    setMoveHistory(nextHistory);
    setPushPhase(null);

    if (newWinner) { setWinner(newWinner); setSelected(null); setValidMoves(new Set()); return; }

    if (newCurrMove >= 4) {
      setPlayer(p => p === 'gold' ? 'silver' : 'gold');
      setCurrMove(0);
      setMoveHistory([cloneBoard(finBoard)]);
      setSelected(null);
      setValidMoves(new Set());
    } else {
      const afterFrozen = computeFrozen(finBoard);
      setCurrMove(newCurrMove);
      if (finBoard[pushee.row][pushee.col]) {
        setSelected({ row: pushee.row, col: pushee.col });
        setValidMoves(getValidMoves(finBoard, pushee.row, pushee.col, player, afterFrozen));
      } else {
        setSelected(null);
        setValidMoves(new Set());
      }
    }
  }

  function executePull(from, pullTarget) {
    // board is already updated (mover already moved); pull the enemy to the vacated square
    const next = board.map(r => [...r]);
    next[from.row][from.col] = next[pullTarget.row][pullTarget.col];
    next[pullTarget.row][pullTarget.col] = null;
    const afterTraps = applyTraps(next);
    const newWinner = checkWinner(afterTraps);
    const newCurrMove = currMove + 1;
    const nextHistory = [...moveHistory.slice(0, currMove + 1), cloneBoard(afterTraps)];

    setBoard(afterTraps);
    setMoveHistory(nextHistory);
    setPushPhase(null);

    if (newWinner) { setWinner(newWinner); setSelected(null); setValidMoves(new Set()); return; }

    if (newCurrMove >= 4) {
      setPlayer(p => p === 'gold' ? 'silver' : 'gold');
      setCurrMove(0);
      setMoveHistory([cloneBoard(afterTraps)]);
      setSelected(null);
      setValidMoves(new Set());
    } else {
      setCurrMove(newCurrMove);
      setSelected(null);
      setValidMoves(new Set());
    }
  }

  function handleClick(row, col) {
    if (winner) return;
    const cell = `${row},${col}`;

    // Push destination phase: pusher + pushee chosen, pick where pushee goes
    if (pushPhase?.type === 'push_dest') {
      if (pushPhase.dests.has(cell)) {
        executePush(pushPhase.pusher, pushPhase.pushee, { row, col });
      } else {
        // Cancel — restore pusher selection
        setPushPhase(null);
        setSelected(pushPhase.pusher);
        setValidMoves(getValidMoves(board, pushPhase.pusher.row, pushPhase.pusher.col, player, frozen));
      }
      return;
    }

    // Pull choice phase: mover already moved, pick which adjacent enemy to drag
    if (pushPhase?.type === 'pull_choice') {
      if (pushPhase.pullables.has(cell)) {
        executePull(pushPhase.from, { row, col });
        return;
      }
      // Skip pull — clear phase and handle this click normally below
      setPushPhase(null);
    }

    // Execute a queued normal move
    if (selected && validMoves.has(cell)) {
      // Move the piece
      const fromRow = selected.row, fromCol = selected.col;
      const next = board.map(r => [...r]);
      next[row][col] = next[fromRow][fromCol];
      next[fromRow][fromCol] = null;
      const afterTraps = applyTraps(next);
      const newWinner = checkWinner(afterTraps);
      const nextHistory = [...moveHistory.slice(0, currMove + 1), cloneBoard(afterTraps)];

      // Update board state
      setBoard(afterTraps);
      setMoveHistory(nextHistory);

      // If there is a win, end turn immediately.
      if (newWinner) { setWinner(newWinner); setSelected(null); setValidMoves(new Set()); return; }

      if (currMove === 3) {
        setPlayer(p => p === 'gold' ? 'silver' : 'gold');
        setCurrMove(0);
        setMoveHistory([cloneBoard(afterTraps)]);
        setSelected(null);
        setValidMoves(new Set());
        return;
      }

      const newCurrMove = currMove + 1;
      // Offer pull if mover survived and a weaker enemy was adjacent to origin
      const pullables = afterTraps[row][col]
        ? getPullables(board, fromRow, fromCol, row, col, player)
        : new Set();

      if (pullables.size > 0) {
        setPushPhase({ type: 'pull_choice', from: { row: fromRow, col: fromCol }, pullables });
        setCurrMove(newCurrMove);
        setSelected(null);
        setValidMoves(new Set());
      } else {
        setCurrMove(newCurrMove);
        const afterFrozen = computeFrozen(afterTraps);
        if (afterTraps[row][col]) {
          setSelected({ row, col });
          setValidMoves(getValidMoves(afterTraps, row, col, player, afterFrozen));
        } else {
          setSelected(null);
          setValidMoves(new Set());
        }
      }
      return;
    }

    // Select own unfrozen piece
    const piece = board[row][col];
    if (piece?.color === player && !frozen.has(cell)) {
      if (selected?.row === row && selected?.col === col) {
        setSelected(null);
        setValidMoves(new Set());
      } else {
        setSelected({ row, col });
        setValidMoves(getValidMoves(board, row, col, player, frozen));
      }
      return;
    }

    // Initiate push: own piece selected + click adjacent weaker enemy + steps remain
    if (selected && currMove <= 2) {
      const pushables = getPushableEnemies(board, selected.row, selected.col, frozen);
      if (pushables.has(cell)) {
        const dests = getPushDests(board, row, col, selected.row, selected.col);
        setPushPhase({ type: 'push_dest', pusher: selected, pushee: { row, col }, dests });
        setValidMoves(new Set());
        return;
      }
    }

    setSelected(null);
    setValidMoves(new Set());
  }

  function endTurn() {
    if (currMove === 0) return;
    setPushPhase(null);
    setPlayer(p => p === 'gold' ? 'silver' : 'gold');
    setCurrMove(0);
    setMoveHistory([cloneBoard(board)]);
    setSelected(null);
    setValidMoves(new Set());
  }

  function resetGame() {
    const initialBoard = createInitialBoard();
    setBoard(initialBoard);
    setSelected(null);
    setValidMoves(new Set());
    setPlayer('gold');
    setCurrMove(0);
    setWinner(null);
    setMoveHistory([cloneBoard(initialBoard)]);
    setPushPhase(null);
  }

  function undoMove() {
    // Set push phase to null
    if (pushPhase?.type === 'push_dest') {
      // No board changes yet — just cancel push mode
      setPushPhase(null);
      return;
    }
    setPushPhase(null);

    // Break the function if there are no moves to undo
    if (currMove === 0) return;

    // Get the previous board state from history
    const prevBoard = moveHistory[currMove - 1];
    if (!prevBoard) return;

    // Sets the new board state
    setBoard(prevBoard);
    setCurrMove(currMove - 1);
    setValidMoves(new Set());
    setSelected(null);
  }

  function redoMove() {
    // Set push phase to null
    setPushPhase(null);

    // Break the function if there are no moves to redo
    if (currMove >= moveHistory.length - 1) return;

    // Get the next board state from history
    const nextBoard = moveHistory[currMove + 1];
    if (!nextBoard) return;

    // Sets the new board state
    setBoard(nextBoard);
    setCurrMove(currMove + 1);
    setValidMoves(new Set());
    setSelected(null);
  }

  // Derived for rendering: enemies the selected piece can push (shown when no push phase active)
  const pushableEnemies = (selected && !pushPhase && currMove <= 2)
    ? getPushableEnemies(board, selected.row, selected.col, frozen)
    : new Set();

  return (
    <div className="play-page">
      <div className="play-header">
        <Link to="/" className="back-link">← Home</Link>
        <h1 className="play-title">Arima</h1>
        <div className="step-track">
          {[1,2,3,4].map(i => (
            <div key={i} className={`step-pip ${i <= currMove ? 'pip-used' : ''}`} />
          ))}
        </div>
      </div>

      <div className="game-core">
        {/* Board */}
        <div className="board-container">
          {/* Column labels */}
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

                const isPushable = pushableEnemies.has(key);
                const isPushActive = pushPhase?.type === 'push_dest' &&
                  pushPhase.pushee.row === r && pushPhase.pushee.col === c;
                const isPushDest = pushPhase?.type === 'push_dest' && pushPhase.dests.has(key);
                const isPullable = pushPhase?.type === 'pull_choice' && pushPhase.pullables.has(key);

                return (
                  <div className={[
                      'square',
                      isTrap ? 'sq-trap' : '',
                      isSelected ? 'sq-selected' : '',
                      isTarget ? 'sq-target' : '',
                      isPushable ? 'sq-pushable' : '',
                      isPushActive ? 'sq-push-active' : '',
                      isPushDest ? 'sq-push-dest' : '',
                      isPullable ? 'sq-pullable' : '',
                      r === 0 ? 'top-edge' : r === 7 ? 'bottom-edge' : '',
                      c === 0 ? 'left-edge' : c === 7 ? 'right-edge' : '',
                    ].filter(Boolean).join(' ')}
                    key={c}
                    onClick={() => handleClick(r, c)}
                  >
                    {piece ? (
                      <div className={`piece pc-${piece.color}${isFrozen ? ' pc-frozen' : ''}`}
                        title={`${piece.color} ${PIECE_NAMES[piece.type]}${isFrozen ? ' (frozen)' : ''}`}
                        style={{ cursor: piece.color === player && !isFrozen ? 'grab' : 'default' }}
                        draggable={piece.color === player && !isFrozen}
                      >
                        {PIECE_EMOJI[piece.type]}
                      </div>
                    ) : isTarget ? (
                      <div className="move-hint" />
                    ) : isPushDest ? (
                      <div className="push-dest-hint" />
                    ) : null}
                  </div>
                );
              })}
              <div className="row-lbl">{8 - r}</div>
            </div>
          ))}

          <div className="labels-row">
            <div className="corner" />
            {'abcdefgh'.split('').map(l => <div key={l} className="col-lbl">{l}</div>)}
            <div className="corner" />
          </div>
        </div>

        <div className="controls">
          <div className="move-controls">
            <button className="btn-undo" onClick={undoMove}
              disabled={(currMove === 0 && !pushPhase) || !!winner}>
              <FontAwesomeIcon icon={faCircleLeft} />
            </button>
            <button className="btn-redo" onClick={redoMove}
              disabled={currMove >= moveHistory.length - 1 || !!winner || !!pushPhase}>
              <FontAwesomeIcon icon={faCircleRight} />
            </button>
          </div>
          <button className="btn-end" onClick={endTurn} disabled={currMove === 0 || !!winner}>
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
            <li><b>Push</b> (2 steps): select your piece → click an adjacent weaker enemy (orange) → click where to send it. Your piece slides into its old square.</li>
            <li><b>Pull</b> (2 steps): move your piece — if a weaker enemy was adjacent to your start square, it lights up teal. Click it to drag it along.</li>
          </ul>
        </div>
      </details>
    </div>
  );
}
