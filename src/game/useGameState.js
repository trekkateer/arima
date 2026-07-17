import { useState, useEffect, useRef } from 'react';
import { toast } from '../components/Toast/Toast.js';
import {
  createInitialBoard, computeFrozen, getValidMoves,
  getPushableEnemies, getPushDests, getPullables,
  applyTraps, checkWinner, serializePosition, hasAnyMove
} from './arima';
import { HOME_ROWS, stepNote, capNote, findCaptures } from './notation';

// Deep clone a board so mutations don't affect the original
function cloneBoard(b) {
  return b.map(r => r.map(p => p ? { ...p } : null));
}

// Owns the entire Arima turn engine: board state, undo/redo history, setup phase,
// push/pull, drag-and-drop, and move notation. Returns everything the Play page
// needs to render, plus the handlers it wires up to Board/GameControls/MoveHistoryPanel.
export function useGameState() {
  // State variables
  const [board, setBoard] = useState(createInitialBoard);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState(new Set());
  const [player, setPlayer] = useState('gold');
  const [currMove, setCurrMove] = useState(0);
  const [winner, setWinner] = useState(null);
  const [pushPhase, setPushPhase] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [setupPhase, setSetupPhase] = useState('gold');
  const [setupSelected, setSetupSelected] = useState(null);

  // Returns a set of "frozen" squares
  const frozen = computeFrozen(board);

  // Refs so global pointer handlers always see the latest state without stale closures
  const boardRef = useRef(board);
  boardRef.current = board;
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const playerRef = useRef(player);
  playerRef.current = player;
  const setupPhaseRef = useRef(setupPhase);
  setupPhaseRef.current = setupPhase;
  const draggingRef = useRef(null);
  const dragStartPos = useRef(null);
  const dragDidFire = useRef(false); // suppresses onClick after a completed drag-drop
  const handleClickRef = useRef(null);

  // Move history and position log
  const [moveHistory, setMoveHistory] = useState([board.map(r => r.map(p => p ? { ...p } : null))]);
  const [positionLog, setPositionLog] = useState(() => [serializePosition(createInitialBoard(), 'gold')]);

  // Completed turns: each entry is { player, steps: string[] }. Gold always goes first.
  const [gameLog, setGameLog] = useState([]);
  // Step notation for the current turn, parallel to moveHistory. Not sliced on undo —
  // kept for redo, just like moveHistory. Index i holds notation for the move from
  // moveHistory[i] → moveHistory[i+1], as an array of step strings (1 move + captures).
  const [turnNotes, setTurnNotes] = useState([]);

  // Ref so the move-log panel can auto-scroll to the latest entry
  const moveLogRef = useRef(null);
  useEffect(() => {
    if (moveLogRef.current)
      moveLogRef.current.scrollTop = moveLogRef.current.scrollHeight;
  }, [gameLog, currMove]);

  // Records where a drag began; the global pointermove handler starts the drag once
  // the pointer moves more than 5px (so normal clicks aren't affected).
  function handlePiecePointerDown(e, row, col) {
    const piece = board[row][col];
    if (setupPhase) {
      if (!piece || piece.color !== setupPhase || !HOME_ROWS[setupPhase].includes(row)) return;
      dragStartPos.current = { x: e.clientX, y: e.clientY, row, col };
      return;
    }
    if (winner || pushPhase) return;
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
          if (setupPhaseRef.current) {
            setSetupSelected({ row, col });
          } else {
            setSelected({ row, col });
            setValidMoves(getValidMoves(boardRef.current, row, col, playerRef.current, frozenRef.current));
          }
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
      if (e.ctrlKey && !setupPhase) {
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
  // stepStrings: flat array of all notation strings for this turn, ready to store.
  function completeTurn(newBoard, stepStrings) {
    const nextPlayer = player === 'gold' ? 'silver' : 'gold';
    const posKey = serializePosition(newBoard, nextPlayer);
    const occurrences = positionLog.filter(k => k === posKey).length;

    setPushPhase(null);
    setSelected(null);
    setValidMoves(new Set());
    setGameLog(prev => [...prev, { player, steps: stepStrings }]);
    setTurnNotes([]);

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

  // Shared tail end of every step (single move, push, or pull): records notation,
  // checks for a win, then either completes the turn or hands off to `onContinue`
  // for step-specific follow-up (re-selecting a piece, offering a pull, etc).
  function finalizeStep(newBoard, newTurnNotes, newCurrMove, nextHistory, onContinue) {
    const flatNotes = newTurnNotes.flat();
    const newWinner = checkWinner(newBoard);

    setBoard(newBoard);
    setMoveHistory(nextHistory);
    setTurnNotes(newTurnNotes);
    setPushPhase(null);

    if (newWinner) {
      setWinner(newWinner);
      setSelected(null);
      setValidMoves(new Set());
      setGameLog(prev => [...prev, { player, steps: flatNotes }]);
      setTurnNotes([]);
      return;
    }

    if (newCurrMove >= 4) {
      completeTurn(newBoard, flatNotes);
    } else {
      setCurrMove(newCurrMove);
      onContinue();
    }
  }

  // Executes a 2-step push: moves pushee to dest, then slides pusher into pushee's old square
  function executePush(pusher, pushee, dest) {
    const pusheeInfo = board[pushee.row][pushee.col];
    const pusherInfo = board[pusher.row][pusher.col];

    // Step 1: pushee moves to dest
    const mid = board.map(r => [...r]);
    mid[dest.row][dest.col] = mid[pushee.row][pushee.col];
    mid[pushee.row][pushee.col] = null;
    const midBoard = applyTraps(mid);
    const caps1 = findCaptures(mid, midBoard);
    const note1 = [
      stepNote(pusheeInfo, pushee.row, pushee.col, dest.row, dest.col),
      ...caps1.map(c => capNote(c.piece, c.r, c.c)),
    ];

    // Step 2: pusher moves to pushee's old square
    const fin = midBoard.map(r => [...r]);
    fin[pushee.row][pushee.col] = fin[pusher.row][pusher.col];
    fin[pusher.row][pusher.col] = null;
    const finBoard = applyTraps(fin);
    const caps2 = findCaptures(fin, finBoard);
    const note2 = [
      stepNote(pusherInfo, pusher.row, pusher.col, pushee.row, pushee.col),
      ...caps2.map(c => capNote(c.piece, c.r, c.c)),
    ];

    const newTurnNotes = [...turnNotes.slice(0, currMove), note1, note2];
    const nextHistory = [...moveHistory.slice(0, currMove + 1), cloneBoard(midBoard), cloneBoard(finBoard)];

    finalizeStep(finBoard, newTurnNotes, currMove + 2, nextHistory, () => {
      if (finBoard[pushee.row][pushee.col]) {
        const afterFrozen = computeFrozen(finBoard);
        setSelected({ row: pushee.row, col: pushee.col });
        setValidMoves(getValidMoves(finBoard, pushee.row, pushee.col, player, afterFrozen));
      } else {
        setSelected(null);
        setValidMoves(new Set());
      }
    });
  }

  // Executes a pull: drags pullTarget into the square the mover just vacated (from)
  function executePull(from, pullTarget) {
    const pullPieceInfo = board[pullTarget.row][pullTarget.col];
    // board is already updated (mover already moved); pull the enemy to the vacated square
    const next = board.map(r => [...r]);
    next[from.row][from.col] = next[pullTarget.row][pullTarget.col];
    next[pullTarget.row][pullTarget.col] = null;
    const afterTraps = applyTraps(next);
    const caps = findCaptures(next, afterTraps);
    const pullNoteArr = [
      stepNote(pullPieceInfo, pullTarget.row, pullTarget.col, from.row, from.col),
      ...caps.map(c => capNote(c.piece, c.r, c.c)),
    ];

    // currMove is already incremented by the normal move that preceded the pull
    const newTurnNotes = [...turnNotes.slice(0, currMove), pullNoteArr];
    const nextHistory = [...moveHistory.slice(0, currMove + 1), cloneBoard(afterTraps)];

    finalizeStep(afterTraps, newTurnNotes, currMove + 1, nextHistory, () => {
      setSelected(null);
      setValidMoves(new Set());
    });
  }

  // Swaps two pieces within the active setup player's own home rows (click or drag-drop)
  function handleSetupClick(row, col) {
    const ownZone = HOME_ROWS[setupPhase].includes(row);

    if (setupSelected) {
      const { row: sr, col: sc } = setupSelected;
      if (sr !== row || sc !== col) {
        if (ownZone) {
          const next = board.map(r => [...r]);
          [next[sr][sc], next[row][col]] = [next[row][col], next[sr][sc]];
          setBoard(next);
        }
      }
      setSetupSelected(null);
      return;
    }

    const piece = board[row][col];
    if (ownZone && piece?.color === setupPhase) {
      setSetupSelected({ row, col });
    }
  }

  // Shuffles the active setup player's 16 pieces randomly across their two home rows
  function randomizeSetup() {
    const squares = HOME_ROWS[setupPhase].flatMap(r => Array.from({ length: 8 }, (_, c) => [r, c]));
    const pieces = squares.map(([r, c]) => board[r][c]);
    for (let i = pieces.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pieces[i], pieces[j]] = [pieces[j], pieces[i]];
    }
    const next = board.map(r => [...r]);
    squares.forEach(([r, c], i) => { next[r][c] = pieces[i]; });
    setBoard(next);
    setSetupSelected(null);
  }

  // Advances from gold's setup to silver's, then from silver's setup into turn 1
  function confirmSetup() {
    setSetupSelected(null);
    if (setupPhase === 'gold') {
      setSetupPhase('silver');
    } else {
      const finalBoard = cloneBoard(board);
      setSetupPhase(null);
      setMoveHistory([finalBoard]);
      setPositionLog([serializePosition(finalBoard, 'gold')]);
      setPlayer('gold');
      setCurrMove(0);
    }
    toast("Setup Confirmed!", { type: "info", duration: 3000 });
  }

  // Single entry point for all board interactions (click and drag-drop). Dispatches
  // through push-dest → pull-choice → normal move → select piece → initiate push.
  function handleClick(row, col) {
    if (setupPhase) { handleSetupClick(row, col); return; }
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
      const fromRow = selected.row, fromCol = selected.col;
      const piece = board[fromRow][fromCol];

      // Move the piece
      const next = board.map(r => [...r]);
      next[row][col] = next[fromRow][fromCol];
      next[fromRow][fromCol] = null;
      const afterTraps = applyTraps(next);

      // Build notation for this step (move + any trap captures)
      const caps = findCaptures(next, afterTraps);
      const notes = [stepNote(piece, fromRow, fromCol, row, col), ...caps.map(c => capNote(c.piece, c.r, c.c))];
      const newTurnNotes = [...turnNotes.slice(0, currMove), notes];
      const nextHistory = [...moveHistory.slice(0, currMove + 1), cloneBoard(afterTraps)];

      finalizeStep(afterTraps, newTurnNotes, currMove + 1, nextHistory, () => {
        // Offer pull if mover survived and a weaker enemy was adjacent to origin
        const pullables = afterTraps[row][col]
          ? getPullables(board, fromRow, fromCol, row, col, player)
          : new Set();

        if (pullables.size > 0) {
          setPushPhase({ type: 'pull_choice', from: { row: fromRow, col: fromCol }, pullables });
          setSelected(null);
          setValidMoves(new Set());
        } else if (afterTraps[row][col]) {
          const afterFrozen = computeFrozen(afterTraps);
          setSelected({ row, col });
          setValidMoves(getValidMoves(afterTraps, row, col, player, afterFrozen));
        } else {
          setSelected(null);
          setValidMoves(new Set());
        }
      });
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

  // Suppresses the onClick that follows a completed drag-drop on the source square
  function onSquareClick(row, col) {
    if (dragDidFire.current) { dragDidFire.current = false; return; }
    handleClick(row, col);
  }

  // Manually ends the current turn early; requires at least one step to have been taken
  function endTurn() {
    if (currMove === 0) return;
    completeTurn(board, turnNotes.slice(0, currMove).flat());
  }

  // Resets all game state back to the initial board position
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
    setGameLog([]);
    setTurnNotes([]);
    setSetupPhase('gold');
    setSetupSelected(null);
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

    // Sets the new board state (turnNotes is kept intact for redo, like moveHistory)
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

  // Always points to the latest handleClick so the global pointer handlers avoid stale closures
  handleClickRef.current = handleClick;

  // Derived for rendering: enemies the selected piece can push (shown when no push phase active)
  const pushableEnemies = (selected && !pushPhase && currMove <= 2)
    ? getPushableEnemies(board, selected.row, selected.col, frozen)
    : new Set();

  // Build move-log rows: completed turns paired as (gold, silver), with current in-progress turn appended
  const logEntries = [...gameLog];
  const inProgressSteps = turnNotes.slice(0, currMove).flat();
  if (inProgressSteps.length > 0 && !winner) {
    logEntries.push({ player, steps: inProgressSteps, inProgress: true });
  }
  const logRows = [];
  for (let i = 0; i < logEntries.length; i += 2) {
    logRows.push({ turnNum: Math.floor(i / 2) + 1, gold: logEntries[i], silver: logEntries[i + 1] });
  }

  return {
    board, selected, validMoves, frozen, player, currMove, winner, pushPhase,
    dragging, dragPos, setupPhase, setupSelected, pushableEnemies, logRows,
    moveHistoryLength: moveHistory.length, moveLogRef,
    onSquareClick, onPiecePointerDown: handlePiecePointerDown,
    undoMove, redoMove, endTurn, resetGame, randomizeSetup, confirmSetup,
  };
}
