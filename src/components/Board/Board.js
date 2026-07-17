import { PIECE_NAMES, PIECE_EMOJI, TRAP_SET } from '../../game/arima';

// Renders the 8x8 board grid plus the drag ghost that follows the cursor while dragging.
// All interaction state (selection, valid moves, push/pull phase, setup) is computed by
// the caller and passed in as plain props/sets so this component stays presentation-only.
export default function Board({
  board,
  selected,
  validMoves,
  frozen,
  pushPhase,
  pushableEnemies,
  setupPhase,
  setupSelected,
  dragging, dragPos,
  player, winner,
  onSquareClick,
  onPiecePointerDown
}) {
  return (
    <div className="board-container">
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
            const isSetupSel = setupPhase && setupSelected?.row === r && setupSelected?.col === c;
            const isSetupLocked = setupPhase && piece && piece.color !== setupPhase;

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
                  isSetupSel ? 'sq-setup-selected' : '',
                  isSetupLocked ? 'sq-setup-locked' : '',
                  dragging?.row === r && dragging?.col === c ? 'sq-dragging' : '',
                  r === 0 ? 'top-edge' : r === 7 ? 'bottom-edge' : '',
                  c === 0 ? 'left-edge' : c === 7 ? 'right-edge' : '',
                ].filter(Boolean).join(' ')}
                key={c}
                data-row={r}
                data-col={c}
                onClick={() => onSquareClick(r, c)}
              >
                {piece ? (
                  <div className={`piece pc-${piece.color}${isFrozen ? ' pc-frozen' : ''}`}
                    title={`${piece.color} ${PIECE_NAMES[piece.type]}${isFrozen ? ' (frozen)' : ''}`}
                    style={{ cursor: setupPhase
                      ? (piece.color === setupPhase ? 'grab' : 'default')
                      : (piece.color === player && !isFrozen && !winner && !pushPhase ? 'grab' : 'default') }}
                    onPointerDown={(e) => onPiecePointerDown(e, r, c)}
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
