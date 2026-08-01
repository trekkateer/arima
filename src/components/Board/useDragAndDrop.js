import { useEffect, useRef, useState } from 'react';
import { getValidMoves } from '../../game/arima';
import { HOME_ROWS } from '../../game/notation';

// Drives drag-and-drop for board pieces via global pointermove/pointerup listeners
// (not native HTML5 drag-and-drop) so pieces can follow the cursor smoothly. Only Board
// renders drag visuals, so this hook is colocated here instead of in the game engine.
// `onSquareClick` is the raw click handler (useGameState's handleClick) — on drop, this
// hook fires it on whatever square is under the pointer, same as a real click would.
export function useDragAndDrop({
  board, player, frozen, setupPhase, winner, pushPhase, stepsExhausted,
  setSelected, setValidMoves, setSetupSelected, onSquareClick,
}) {
  // Local state for the drag ghost and cursor-following position
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState(null);

  // Refs so the global listeners (set up once) always see the latest state without stale closures
  const boardRef = useRef(board);
  boardRef.current = board;
  const frozenRef = useRef(frozen);
  frozenRef.current = frozen;
  const playerRef = useRef(player);
  playerRef.current = player;
  const setupPhaseRef = useRef(setupPhase);
  setupPhaseRef.current = setupPhase;
  const onSquareClickRef = useRef(onSquareClick);
  onSquareClickRef.current = onSquareClick;

  const draggingRef = useRef(null);
  const dragStartPos = useRef(null);
  // Timestamp of the last completed drag-drop, used to suppress the click that may follow it.
  const dragEndAt = useRef(0);

  // Records where a drag began; the global pointermove handler starts the drag once
  // the pointer moves more than 5px (so normal clicks aren't affected).
  function onPiecePointerDown(e, row, col) {
    const piece = board[row][col];
    if (setupPhase) {
      if (!piece || piece.color !== setupPhase || !HOME_ROWS[setupPhase].includes(row)) return;
      dragStartPos.current = { x: e.clientX, y: e.clientY, row, col };
      return;
    }
    // stepsExhausted: turn was refused as an illegal pass, so nothing but undo works
    if (winner || pushPhase || stepsExhausted) return;
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
        // Marked so a click arriving in the same tick as this drop doesn't double-fire
        dragEndAt.current = performance.now();
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const sq = elements.find(el => el.dataset?.row !== undefined);
        if (sq) {
          onSquareClickRef.current(parseInt(sq.dataset.row), parseInt(sq.dataset.col));
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

  // Suppresses the onClick the browser fires right after a drop on the source square,
  // which would otherwise re-run handleClick and undo the selection the drop just made.
  // The window is generous but far shorter than a human down-up-down cycle, so a real
  // click can never be swallowed.
  function handleSquareClick(row, col) {
    if (performance.now() - dragEndAt.current < 100) return;
    onSquareClick(row, col);
  }

  return { dragging, dragPos, onPiecePointerDown, onSquareClick: handleSquareClick };
}
