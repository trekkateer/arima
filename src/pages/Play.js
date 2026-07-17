import { useGameState } from '../game/useGameState';
import Board from '../components/Board/Board.js';
import GameControls from '../components/GameControls/GameControls.js';
import MoveHistoryPanel from '../components/MoveHistoryPanel/MoveHistoryPanel.js';
import RulesDropdown from '../components/RulesDropdown/RulesDropdown.js';
import './Play.css';

export default function Play() {
  // Enormous hook that manages the entire game state
  const g = useGameState();

  return (
    <>
      <title>Play Arima</title>
      <div className="play-page">
        <div className="play-header">
          <h1 className="play-title"
            onClick={() => window.location.href = '/'}
          >
            Arima
          </h1>
          {g.setupPhase ? (
            <div className="setup-status">Setup: {g.setupPhase === 'gold' ? 'Gold' : 'Silver'}</div>
          ) : (
            <div className="step-track">
              {[1,2,3,4].map(i => (
                <div key={i} className={`step-pip ${i <= g.currMove ? 'pip-used' : ''}`} />
              ))}
            </div>
          )}
        </div>

        <div className="game-container">
          <div className="game-core">
            <Board
              board={g.board}
              selected={g.selected}
              validMoves={g.validMoves}
              frozen={g.frozen}
              pushPhase={g.pushPhase}
              pushableEnemies={g.pushableEnemies}
              setupPhase={g.setupPhase}
              setupSelected={g.setupSelected}
              dragging={g.dragging}
              dragPos={g.dragPos}
              player={g.player}
              winner={g.winner}
              onSquareClick={g.onSquareClick}
              onPiecePointerDown={g.onPiecePointerDown}
            />

            <GameControls
              setupPhase={g.setupPhase}
              currMove={g.currMove}
              winner={g.winner}
              pushPhase={g.pushPhase}
              moveHistoryLength={g.moveHistoryLength}
              onUndo={g.undoMove}
              onRedo={g.redoMove}
              onEndTurn={g.endTurn}
              onReset={g.resetGame}
              onRandomize={g.randomizeSetup}
              onConfirmSetup={g.confirmSetup}
            />
          </div>

          <MoveHistoryPanel logRows={g.logRows} ref={g.moveLogRef} />
        </div>

        <RulesDropdown />
      </div>
    </>
  );
}
