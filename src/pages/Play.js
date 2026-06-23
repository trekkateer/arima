import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleLeft } from '@fortawesome/free-solid-svg-icons';
import { faCircleRight } from '@fortawesome/free-solid-svg-icons';
import {
  PIECE_NAMES, PIECE_EMOJI, TRAP_SET,
  createInitialBoard, computeFrozen, getValidMoves,
  getPushableEnemies, getPushDests, getPullables,
  applyTraps, checkWinner, serializePosition, hasAnyMove,
} from '../game/arima';
import './Play.css';

export default function Play() {
  const [board, setBoard] = useState(createInitialBoard);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState(new Set());
  const [player, setPlayer] = useState('gold');
  const [currMove, setCurrMove] = useState(0);
  const [winner, setWinner] = useState(null);
  // null | { type:'push_dest', pusher, pushee, dests } | { type:'pull_choice', from, pullables }
  const [pushPhase, setPushPhase] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState(null);

  const frozen = computeFrozen(board);

  // Refs so global pointer handlers always see the latest state without stale closures
  const boardRef = useRef(board);
  boardRef.current = board;
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const playerRef = useRef(player);
  playerRef.current = player;
  const draggingRef = useRef(null);
  const dragStartPos = useRef(null);
  const dragDidFire = useRef(false); // suppresses onClick after a completed drag-drop
  const handleClickRef = useRef(null);

  const [moveHistory, setMoveHistory] = useState([board.map(r => r.map(p => p ? { ...p } : null))]);
  const [positionLog, setPositionLog] = useState(() => [serializePosition(createInitialBoard(), 'gold')]);

  function cloneBoard(b) {
    return b.map(r => r.map(p => p ? { ...p } : null));
  }

  // Records where a drag began; the global pointermove handler starts the drag once
  // the pointer moves more than 5px (so normal clicks aren't affected).
  function handlePiecePointerDown(e, row, col) {
    if (winner || pushPhase) return;
    const piece = board[row][col];
    if (!piece || piece.color !== player || frozen.has(`${row},${col}`)) return;
    dragStartPos.current = { x: e.clientX, y: e.clientY, row, col };
  }

  // Global pointer listeners: handle drag threshold, ghost position, and drop detection.
  // Set up once; all mutable values come from refs so closures never go stale.
  useEffect(() => {
    function onMove(e) {
      if (!dragStartPos.current) return;
      if (!draggingRef.current) {
        // Start drag once pointer moves more than 5px
        const dx = e.clientX - dragStartPos.current.x;
        const dy = e.clientY - dragStartPos.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > 5) {
          const { row, col } = dragStartPos.current;
          draggingRef.current = { row, col };
          document.body.style.cursor = "grabbing";
          setDragging({ row, col });
          setSelected({ row, col });
          setValidMoves(getValidMoves(boardRef.current, row, col, playerRef.current, frozenRef.current));
          setDragPos({ x: e.clientX, y: e.clientY });
        }
      } else {
        setDragPos({ x: e.clientX, y: e.clientY });
      }
    }

    function onUp(e) {
      if (!dragStartPos.current) return;
      const wasDragging = !!draggingRef.current;
      draggingRef.current = null;
      dragStartPos.current = null;
      document.body.style.cursor = '';
      setDragging(null);
      setDragPos(null);
      if (wasDragging) {
        // Flag set so the onClick on the source square doesn't double-fire
        dragDidFire.current = true;
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const sq = elements.find(el => el.dataset?.row !== undefined);
        if (sq) {
          handleClickRef.current(parseInt(sq.dataset.row), parseInt(sq.dataset.col));
        } else {
          setSelected(null);
          setValidMoves(new Set());
        }
      }
    }

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Allows us to listen to the the entire document and CTRL-Z or CTRL-Y no matter what element is focused
  useEffect(() => {
    const onKeyDown = (e) => {
      // Detect special CTRL-Z code to undo step
      if (e.ctrlKey) {
        if (e.key.charCodeAt(0) == 122 &&
          ((currMove !== 0 || pushPhase) && !winner)
        ) {
          undoMove();
        } else if (e.key.charCodeAt(0) == 121 &&
          (currMove < moveHistory.length - 1 && !winner && !pushPhase)
        ) {
          redoMove();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undoMove, redoMove]);

  // Called whenever a full turn ends. Checks repetition and immobilization, then switches players.
  function completeTurn(newBoard) {
    const nextPlayer = player === 'gold' ? 'silver' : 'gold';
    const posKey = serializePosition(newBoard, nextPlayer);
    const occurrences = positionLog.filter(k => k === posKey).length;

    setPushPhase(null);
    setSelected(null);
    setValidMoves(new Set());

    if (occurrences >= 2) {
      // Current player caused a 3rd repetition — they lose
      setWinner(nextPlayer);
      return;
    }

    const newLog = [...positionLog, posKey];

    if (!hasAnyMove(newBoard, nextPlayer)) {
      // Next player is immobilized — they lose
      setWinner(player);
      setPositionLog(newLog);
      return;
    }

    setPositionLog(newLog);
    setPlayer(nextPlayer);
    setCurrMove(0);
    setMoveHistory([cloneBoard(newBoard)]);
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
      completeTurn(finBoard);
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
      completeTurn(afterTraps);
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
        completeTurn(afterTraps);
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
    completeTurn(board);
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
    setPositionLog([serializePosition(initialBoard, 'gold')]);
    setPushPhase(null);
  }

  function undoMove() {//console.log("undoMove called");
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

  function redoMove() {//console.log("redoMove called");
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

  // Always points to the latest handleClick so the global pointer handlers avoid stale closures
  handleClickRef.current = handleClick;

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
                      dragging?.row === r && dragging?.col === c ? 'sq-dragging' : '',
                      r === 0 ? 'top-edge' : r === 7 ? 'bottom-edge' : '',
                      c === 0 ? 'left-edge' : c === 7 ? 'right-edge' : '',
                    ].filter(Boolean).join(' ')}
                    key={c}
                    data-row={r}
                    data-col={c}
                    onClick={() => {
                      if (dragDidFire.current) { dragDidFire.current = false; return; }
                      handleClick(r, c);
                    }}
                  >
                    {piece ? (
                      <div className={`piece pc-${piece.color}${isFrozen ? ' pc-frozen' : ''}`}
                        title={`${piece.color} ${PIECE_NAMES[piece.type]}${isFrozen ? ' (frozen)' : ''}`}
                        style={{ cursor: piece.color === player && !isFrozen && !winner && !pushPhase ? 'grab' : 'default' }}
                        onPointerDown={(e) => handlePiecePointerDown(e, r, c)}
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
            <li>Each turn you may take <b>1-4 steps</b>; press <b>End Turn</b> when done (auto-ends after 4).</li>
            <li>Pieces move one square orthogonally per step.</li>
            <li><b>Rabbits</b> cannot step backward (toward their own home row).</li>
            <li><b>Frozen</b> pieces (dimmed) are adjacent to a stronger enemy with no friendly support — they cannot move.</li>
            <li><b>Traps</b> (c3, f3, c6, f6): a piece there with no friendly neighbor is captured.</li>
            <li><b>Win</b> by advancing a rabbit to the opponent's home row, capturing all opponent rabbits, leaving the opponent with no legal moves, or forcing them to repeat a position for the third time.</li>
            <li><b>Push</b> (2 steps): select your piece → click an adjacent weaker enemy (orange) → click where to send it. Your piece slides into its old square.</li>
            <li><b>Pull</b> (2 steps): move your piece — if a weaker enemy was adjacent to your start square, it lights up teal. Click it to drag it along.</li>
          </ul>
        </div>
      </details>

      {/* Custom drag ghost: follows the cursor while dragging */}
      {dragging && dragPos && board[dragging.row][dragging.col] && (
        <div className="drag-ghost" style={{ left: dragPos.x, top: dragPos.y }}>
          <div className={`piece pc-${board[dragging.row][dragging.col].color}`}>
            {PIECE_EMOJI[board[dragging.row][dragging.col].type]}
          </div>
        </div>
      )}
    </div>
  );
}
