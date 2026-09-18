import { useState, useEffect } from 'react';
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

// Owns the core Arima turn engine: board state, undo/redo history, setup phase,
// push/pull, and move notation. Drag-and-drop (Board) and move-log row-building
// (MoveHistoryPanel) live in those components instead, since only they need them.
// Returns everything the Play page needs to render, plus the handlers it wires up
// to Board/GameControls/MoveHistoryPanel.
export function useGameState() {
  // State variables
  const [board, setBoard] = useState(createInitialBoard);
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState(new Set());
  const [player, setPlayer] = useState('Au');
  const [currMove, setCurrMove] = useState(0);
  const [winner, setWinner] = useState(null);
  const [pushPhase, setPushPhase] = useState(null);
  const [setupPhase, setSetupPhase] = useState('Au');
  const [setupSelected, setSetupSelected] = useState(null);

  // Returns a set of "frozen" squares
  const frozen = computeFrozen(board);

  // Move history and position log
  const [moveHistory, setMoveHistory] = useState([board.map(r => r.map(p => p ? { ...p } : null))]);
  const [halfPushSteps, setHalfPushSteps] = useState(new Set());
  const [positionLog, setPositionLog] = useState(() => [serializePosition(createInitialBoard(), 'Au')]);

  // Completed turns: each entry is { player, steps: string[] }. Gold always goes first.
  const [gameLog, setGameLog] = useState([]);
  // Step notation for the current turn, parallel to moveHistory. Not sliced on undo —
  // kept for redo, just like moveHistory. Index i holds notation for the move from
  // moveHistory[i] → moveHistory[i+1], as an array of step strings (1 move + captures).
  const [turnNotes, setTurnNotes] = useState([]);

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

  // Arimaa forbids passing: the position at the end of a turn must differ from the
  // position at the start of it. moveHistory[0] is always the turn-start snapshot
  // (undo/redo slice the tail but never index 0), so that's what we compare against.
  function positionUnchanged(newBoard, turnStartBoard) {
    return serializePosition(newBoard, player) === serializePosition(turnStartBoard, player);
  }

  // Called whenever a full turn ends. Checks goal/elimination, then repetition and
  // immobilization, then switches players.
  // stepStrings: flat array of all notation strings for this turn, ready to store.
  function completeTurn(newBoard, stepStrings) {
    const nextPlayer = player === 'Au' ? 'Ag' : 'Au';

    setPushPhase(null);
    setSelected(null);
    setValidMoves(new Set());
    setGameLog(prev => [...prev, { player, steps: stepStrings }]);
    setTurnNotes([]);
    setHalfPushSteps(new Set());

    // Goal and elimination are judged on the final position of the turn, not per step
    const newWinner = checkWinner(newBoard, player);
    if (newWinner) {
      setWinner(newWinner);
      return;
    }

    // Current player caused a 3rd repetition — they lose
    const posKey = serializePosition(newBoard, nextPlayer);
    const occurrences = positionLog.filter(k => k === posKey).length;
    if (occurrences >= 2) {
      setWinner(nextPlayer);
      return;
    }

    const newLog = [...positionLog, posKey];

    // Checks for immobilization
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
  // then either completes the turn or hands off to `onContinue` for step-specific
  // follow-up (re-selecting a piece, offering a pull, etc). Win conditions are NOT
  // checked here — they belong to completeTurn, since Arimaa judges the position at
  // the end of a turn rather than after each step.
  function finalizeStep(newBoard, newTurnNotes, newCurrMove, nextHistory, onContinue) {
    setBoard(newBoard);
    setMoveHistory(nextHistory);
    setTurnNotes(newTurnNotes);
    setPushPhase(null);
    setCurrMove(newCurrMove);

    // nextHistory drops everything past currMove, so stale markers go with it. A push is
    // the only action that advances two steps at once, and the entry it leaves in between
    // is illegal to stop on — mark it so undo/redo skip it.
    setHalfPushSteps(prev => {
      const next = new Set([...prev].filter(i => i <= currMove));
      if (newCurrMove - currMove === 2) next.add(currMove + 1);
      return next;
    });

    if (newCurrMove >= 4) {
      // All 4 steps spent, but shuffling a piece out and back is an illegal pass.
      // Leave the turn open so the player can undo and try something else.
      if (positionUnchanged(newBoard, nextHistory[0])) {
        toast("Your turn must change the position — undo and try a different move.",
          { type: "error", duration: 4000 });
        setSelected(null);
        setValidMoves(new Set());
        return;
      }
      completeTurn(newBoard, newTurnNotes.flat());
    } else {
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
    if (setupPhase === 'Au') {
      setSetupPhase('Ag');
    } else {
      const finalBoard = cloneBoard(board);
      setSetupPhase(null);
      setMoveHistory([finalBoard]);
      setHalfPushSteps(new Set());
      setPositionLog([serializePosition(finalBoard, 'Au')]);
      setPlayer('Au');
      setCurrMove(0);
    }
    toast("Setup Confirmed!", { type: "info", duration: 3000 });
  }

  // Single entry point for all board interactions (click and drag-drop). Dispatches
  // through push-dest → pull-choice → normal move → select piece → initiate push.
  function handleClick(row, col) {
    if (setupPhase) { handleSetupClick(row, col); return; }
    if (winner) return;
    // All 4 steps spent and the turn was refused as an illegal pass — undo is the
    // only way forward, so ignore board clicks rather than allowing a 5th step.
    if (currMove >= 4) return;
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

  // Manually ends the current turn early; requires at least one step to have been
  // taken and the position to have actually changed (no passing)
  function endTurn() {
    if (currMove === 0) return;
    if (positionUnchanged(board, moveHistory[0])) {
      toast("Your turn must change the position.", { type: "error", duration: 3000 });
      return;
    }
    completeTurn(board, turnNotes.slice(0, currMove).flat());
  }

  // Resets all game state back to the initial board position
  function resetGame() {
    const initialBoard = createInitialBoard();
    setBoard(initialBoard);
    setSelected(null);
    setValidMoves(new Set());
    setPlayer('Au');
    setCurrMove(0);
    setWinner(null);
    setMoveHistory([cloneBoard(initialBoard)]);
    setHalfPushSteps(new Set());
    setPositionLog([serializePosition(initialBoard, 'Au')]);
    setPushPhase(null);
    setGameLog([]);
    setTurnNotes([]);
    setSetupPhase('Au');
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

    // Step back past any half-push entries, so undoing a push rewinds both of its steps
    // rather than stranding the board between them
    let target = currMove - 1;
    while (target > 0 && halfPushSteps.has(target)) target--;

    // Get the previous board state from history
    const prevBoard = moveHistory[target];
    if (!prevBoard) return;

    // Sets the new board state (turnNotes is kept intact for redo, like moveHistory)
    setBoard(prevBoard);
    setCurrMove(target);
    setValidMoves(new Set());
    setSelected(null);
  }

  function redoMove() {
    // Set push phase to null
    setPushPhase(null);

    // Break the function if there are no moves to redo
    if (currMove >= moveHistory.length - 1) return;

    // Skip forward past any half-push entries, so redoing a push replays both of its steps
    let target = currMove + 1;
    while (target < moveHistory.length - 1 && halfPushSteps.has(target)) target++;

    // Get the next board state from history
    const nextBoard = moveHistory[target];
    if (!nextBoard) return;

    // Sets the new board state
    setBoard(nextBoard);
    setCurrMove(target);
    setValidMoves(new Set());
    setSelected(null);
  }

  // Derived for rendering: enemies the selected piece can push (shown when no push phase active)
  const pushableEnemies = (selected && !pushPhase && currMove <= 2)
    ? getPushableEnemies(board, selected.row, selected.col, frozen)
    : new Set();

  // Derived for rendering: whether this turn is legal to end yet (steps taken and
  // the position actually changed). Drives the End Turn button's disabled state.
  const canEndTurn = !setupPhase && currMove > 0 && !positionUnchanged(board, moveHistory[0]);

  // Derived for rendering: all 4 steps are spent but the turn was refused as an
  // illegal pass, so the board is locked until the player undoes a step.
  const stepsExhausted = !setupPhase && !winner && currMove >= 4;

  return {
    board, selected, validMoves, frozen, player, currMove, winner, pushPhase,
    setupPhase, setupSelected, pushableEnemies, canEndTurn, stepsExhausted,
    gameLog, turnNotes, moveHistoryLength: moveHistory.length,
    setSelected, setValidMoves, setSetupSelected,
    handleClick, undoMove, redoMove, endTurn, resetGame, randomizeSetup, confirmSetup,
  };
}
