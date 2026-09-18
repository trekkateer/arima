import { useGameState } from '../game/useGameState';
import Board from '../components/Board/Board';
import GameControls from '../components/GameControls/GameControls';
import MoveHistoryPanel from '../components/MoveHistoryPanel/MoveHistoryPanel';
import RulesDropdown from '../components/RulesDropdown/RulesDropdown';
import './Play.css';

export default function Play() {
  // Core turn engine (board, moves, undo/redo, setup). Drag-and-drop and move-log
  // formatting live in Board and MoveHistoryPanel, since only those need them.
  const g = useGameState();

  return (
    <>
      <title>Play Arima</title>
      <div className="play-page">
        <div className="play-header">
          <h1 className="play-title" onClick={() => window.location.href = '/'}>
            Arima
          </h1>
          {g.setupPhase ? (
            <div className="setup-status">Setup: {g.setupPhase === 'Au' ? 'Gold' : 'Silver'}</div>
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
              player={g.player}
              winner={g.winner}
              stepsExhausted={g.stepsExhausted}
              onMove={g.handleClick}
              setSelected={g.setSelected}
              setValidMoves={g.setValidMoves}
              setSetupSelected={g.setSetupSelected}
            />

            <GameControls
              setupPhase={g.setupPhase}
              currMove={g.currMove}
              winner={g.winner}
              pushPhase={g.pushPhase}
              moveHistoryLength={g.moveHistoryLength}
              canEndTurn={g.canEndTurn}
              onUndo={g.undoMove}
              onRedo={g.redoMove}
              onEndTurn={g.endTurn}
              onReset={g.resetGame}
              onRandomize={g.randomizeSetup}
              onConfirmSetup={g.confirmSetup}
            />
          </div>

          <MoveHistoryPanel
            gameLog={g.gameLog}
            turnNotes={g.turnNotes}
            currMove={g.currMove}
            winner={g.winner}
            player={g.player}
          />
        </div>

        <RulesDropdown />
      </div>
    </>
  );
}
