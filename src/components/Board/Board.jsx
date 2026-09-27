import { PIECE_NAMES, PIECE_EMOJI, TRAP_SET } from '../../game/arima.js';
import { useDragAndDrop } from './useDragAndDrop.jsx';

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
        {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map(l => <div key={l} className="col-label" style={{
          width: '64px',
          height: '20px',
          textAlign: 'center',
          lineHeight: '20px',
          fontSize: '11px',
          color: '#888',
          userSelect: 'none',
        }}>{l}</div>)}
        <div className="corner" />
      </div>
    )
  };

  return (
    <div className="board-container" style={{
      position: 'relative',
      display: 'inline-flex',
      flexDirection: 'column',
      border: '3px solid #3a2600',
      borderRadius: '3px',
      boxShadow: '0 6px 24px rgba(0, 0, 0, 0.6)',
      background: '#2c1a0e',
    }}>
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
            const isSetupLocked = setupPhase && piece && piece.colorID !== setupPhase;
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
                    ? (piece.colorID === setupPhase ? 'grab' : 'default')
                    : (piece.colorID === player && !isFrozen && !winner && !pushPhase && !stepsExhausted ? 'grab' : 'default') }}
                  onPointerDown={(e) => onPiecePointerDown(e, r, c)}
                >
                  {PIECE_EMOJI[piece.type]}
                </div>
              ) : isTarget ? (
                // Green dot on empty target squares
                <div className="move-hint" style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(60, 200, 60, 0.65)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }} />
              ) : isPushDest ? (
                // Purple dot where the pushee can be sent
                <div className="push-dest-hint" style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  background: 'rgba(160, 60, 220, 0.65)',
                  pointerEvents: 'none',
                  zIndex: 1,
                }} />
              ) : null}
            </div>);
          })}
          <div className="row-label">{8 - r}</div>
        </div>
      ))}

      {/* Column labels at the bottom of the board */}
      <ColLabels />

      {/* Setup hint over the empty middle rows (3–6). Click-through so it never blocks squares. */}
      {setupPhase && (
        <div className="setup-board-hint" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '400px',
          padding: '14px 20px',
          background: 'rgba(13, 13, 26, 0.78)',
          border: `1px solid ${setupPhase === 'Au' ? 'rgba(255, 215, 0, 0.5)' : 'rgba(192, 192, 192, 0.5)'}`,
          borderRadius: '10px',
          color: setupPhase === 'Au' ? '#FFD700' : '#C0C0C0',
          fontSize: '1rem',
          lineHeight: 1.4,
          textAlign: 'center',
          pointerEvents: 'none',
          userSelect: 'none',
          zIndex: 2,
        }}>
          <strong>{setupPhase === 'Au' ? 'Gold' : 'Silver'} setup</strong>
          <div style={{ fontSize: '0.9rem', marginTop: '4px' }}>
            Drag pieces within your own two rows to rearrange, then confirm.
          </div>
        </div>
      )}

      {/* Custom drag ghost: follows the cursor while dragging */}
      {dragging && dragPos && board[dragging.row][dragging.col] && (
        <div className="drag-ghost" style={{
          position: 'fixed',
          left: dragPos.x,
          top: dragPos.y,
          pointerEvents: 'none',
          zIndex: 1000,
          transform: 'translate(-50%, -50%)',
          filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.6))',
        }}>
          <div className={`piece pc-${board[dragging.row][dragging.col].color}`}>
            {PIECE_EMOJI[board[dragging.row][dragging.col].type]}
          </div>
        </div>
      )}
    </div>
  );
}
