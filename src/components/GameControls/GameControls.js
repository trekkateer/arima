import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCircleLeft, faCircleRight } from '@fortawesome/free-solid-svg-icons';

// Buttons below the board, plus the setup/winner banners. Swaps between the
// setup toolbar (randomize/confirm) and the in-game toolbar (undo/redo/end turn).
export default function GameControls({
  setupPhase, currMove, winner, pushPhase, moveHistoryLength,
  onUndo, onRedo, onEndTurn, onReset, onRandomize, onConfirmSetup,
}) {
  return (
    <>
      {setupPhase ? (
        <div className="controls">
          <button className="btn-end" onClick={onRandomize}>
            Randomize
          </button>
          <button className="btn-end" onClick={onConfirmSetup}>
            Confirm Setup
          </button>
          <button className="btn-reset" onClick={onReset}>
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
          <button className="btn-end" onClick={onEndTurn} disabled={currMove === 0 || !!winner}>
            End Turn
          </button>
          <button className="btn-reset" onClick={onReset}>
            New Game
          </button>
        </div>
      )}

      {setupPhase && (
        <div className="setup-banner">
          <span>{setupPhase === 'gold' ? 'Gold' : 'Silver'}: drag pieces within your own two rows to rearrange, then confirm.</span>
        </div>
      )}

      {winner && (
        <div className="winner-banner">
          <span>{winner === 'gold' ? 'Gold' : 'Silver'} wins!</span>
          <button onClick={onReset}>Play Again</button>
        </div>
      )}
    </>
  );
}
