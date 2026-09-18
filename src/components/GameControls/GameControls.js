import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleLeft, faCircleRight } from '@fortawesome/free-solid-svg-icons';

// Buttons below the board, plus the setup/winner banners. Swaps between the
// setup toolbar (randomize/confirm) and the in-game toolbar (undo/redo/end turn).
export default function GameControls({
  setupPhase, currMove, winner, pushPhase, moveHistoryLength, canEndTurn,
  onUndo, onRedo, onEndTurn, onReset, onRandomize, onConfirmSetup,
}) {
  return (
    <>
      {setupPhase ? (
        <div className="controls">
          <button className="blue-btn" onClick={onRandomize}>
            Randomize
          </button>
          <button className="blue-btn" onClick={onConfirmSetup}>
            Confirm Setup
          </button>
          <button className="red-btn" onClick={onReset}>
            New Game
          </button>
        </div>
      ) : (
        <div className="controls">
          <div className="move-controls">
            <button className="btn-undo" onClick={onUndo}
              disabled={(currMove === 0 && !pushPhase) || !!winner}
            >
              <FontAwesomeIcon icon={faCircleLeft} />
            </button>
            <button className="btn-redo" onClick={onRedo}
              disabled={currMove >= moveHistoryLength - 1 || !!winner || !!pushPhase}
            >
              <FontAwesomeIcon icon={faCircleRight} />
            </button>
          </div>
          {/* Disabled until the turn has actually changed the position — Arimaa has no pass */}
          <button className="blue-btn" onClick={onEndTurn} disabled={!canEndTurn || !!winner}
            title={currMove > 0 && !canEndTurn ? 'Your turn must change the position' : undefined}
          >
            End Turn
          </button>
          <button className="red-btn" onClick={onReset}>
            New Game
          </button>
        </div>
      )}

      {setupPhase && (
        <div className="setup-banner">
          <span>{setupPhase === 'Au' ? 'Au' : 'Ag'}: drag pieces within your own two rows to rearrange, then confirm.</span>
        </div>
      )}

      {winner && (
        <div className="winner-banner">
          <span>{winner === 'Au' ? 'Au' : 'Ag'} wins!</span>
          <button onClick={onReset}>Play Again</button>
        </div>
      )}
    </>
  );
}
