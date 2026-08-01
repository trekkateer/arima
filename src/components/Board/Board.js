import { PIECE_NAMES, PIECE_EMOJI, TRAP_SET } from '../../game/arima';
import { useDragAndDrop } from './useDragAndDrop.js';

// Renders the 8x8 board grid plus the drag ghost that follows the cursor while dragging.
// Selection/valid-move/push-phase state is computed by the caller and passed in as plain
// props/sets; drag-and-drop is owned locally since only this component renders it.
export default function Board({
  board,
  selected,
  validMoves,
  frozen,
  pushPhase,
  pushableEnemies,
  setupPhase,
  setupSelected,
  player, winner,
  stepsExhausted,
  onMove,
  setSelected,
  setValidMoves,
  setSetupSelected,
}) {
  const { dragging, dragPos, onPiecePointerDown, onSquareClick } = useDragAndDrop({
    board, player, frozen, setupPhase, winner, pushPhase, stepsExhausted,
    setSelected, setValidMoves, setSetupSelected, onSquareClick: onMove,
  });

  function ColLabels() {
    return (
      <div style={{ display: "flex" }}>
        <div className="corner" />
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(l => <div key={l} className="col-label">{l}</div>)}
        <div className="corner" />
      </div>
    )
  };

  return (
    <div className="board-container">
      {/* Column labels at the top and bottom of the board */}
      <ColLabels />

      {/* Board rows, each with a row label on the left and right */}
      {board.map((row, r) => (
        <div key={r} style={{ display: "flex", alignItems: "stretch" }}>
          <div className="row-label">{8 - r}</div>
          {row.map((piece, c) => {
            // Square properties
            const key = `${r},${c}`;
            const isSelected = selected?.row === r && selected?.col === c;
            const isTarget = validMoves.has(key);
            const isTrap = TRAP_SET.has(key);
            const isFrozen = piece && frozen.has(key);

            // Piece properties
            const isPushable = pushableEnemies.has(key);
            const isPushActive = pushPhase?.type === 'push_dest' &&
              pushPhase.pushee.row === r && pushPhase.pushee.col === c;
            const isPushDest = pushPhase?.type === 'push_dest' && pushPhase.dests.has(key);
            const isPullable = pushPhase?.type === 'pull_choice' && pushPhase.pullables.has(key);
            const isSetupSel = setupPhase && setupSelected?.row === r && setupSelected?.col === c;
            const isSetupLocked = setupPhase && piece && piece.color !== setupPhase;
            const isDragging = dragging?.row === r && dragging?.col === c;

            return (<div className={[
                'square',
                isTrap ? 'sq-trap' : '',
                isSelected ? 'sq-selected' : '',
                isTarget ? 'sq-target' : '',
                isPushable ? 'sq-pushable' : '',
                isPushActive ? 'sq-push-active' : '',
                isPushDest ? 'sq-push-dest' : '',
                isPullable ? 'sq-pullable' : '',
                isSetupSel ? 'sq-setup-selected' : '',
                isSetupLocked ? 'sq-setup-locked' : '',
                isDragging ? 'sq-dragging' : ''
              ].filter(Boolean).join(' ')}
              style={{
                borderLeftWidth: (c === 0) ? "2px" : "",
                borderRightWidth: (c === 7) ? "2px" : "",
                borderTopWidth: (r === 0) ? "2px" : "",
                borderBottomWidth: (r === 7) ? "2px" : "",
              }}
              key={c}
              data-row={r}
              data-col={c}
              onClick={() => onSquareClick(r, c)}
            >
              {piece && !isDragging ? (
                <div className={`piece pc-${piece.color}${isFrozen ? ' pc-frozen' : ''}`}
                  title={`${piece.color} ${PIECE_NAMES[piece.type]}${isFrozen ? ' (frozen)' : ''}`}
                  style={{ cursor: setupPhase
                    ? (piece.color === setupPhase ? 'grab' : 'default')
                    : (piece.color === player && !isFrozen && !winner && !pushPhase && !stepsExhausted ? 'grab' : 'default') }}
                  onPointerDown={(e) => onPiecePointerDown(e, r, c)}
                >
                  {PIECE_EMOJI[piece.type]}
                </div>
              ) : isTarget ? (
                <div className="move-hint" />
              ) : isPushDest ? (
                <div className="push-dest-hint" />
              ) : null}
            </div>);
          })}
          <div className="row-label">{8 - r}</div>
        </div>
      ))}

      {/* Column labels at the bottom of the board */}
      <ColLabels />

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
