import { useGameState } from '../game/useGameState';
import Board from '../components/Board/Board';
import GameControls from '../components/GameControls/GameControls';
import MoveHistoryPanel from '../components/MoveHistoryPanel/MoveHistoryPanel';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faShareFromSquare } from '@fortawesome/free-solid-svg-icons';
import './Play.css';

export default function Play() {
  // Core turn engine (board, moves, undo/redo, setup). Drag-and-drop and move-log
  // formatting live in Board and MoveHistoryPanel, since only those need them.
  const g = useGameState();

  return (
    <>
      <title>Play Arima</title>
      {/* 3-row grid with equal outer rows centers .game-container vertically
          (justifyItems centers it horizontally); the header and rules link
          hug it from above and below */}
      <div className="playpage" style={{
        display: 'grid',
        gridTemplateRows: '1fr auto 1fr',
        justifyItems: 'center',
        minHeight: '100vh',
        background: '#1a1a2e',
        color: '#e0e0e0',
        padding: '16px',
        fontFamily: 'Georgia, serif',
      }}>
        <div className="play-header" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px',
          marginBottom: '12px',
          alignSelf: 'end',
          width: '100%',
          maxWidth: '560px',
        }}>
          <h1 className="play-title"
            style={{
              flex: 1,
              textAlign: 'center',
              color: '#FFD700',
              fontSize: '1.8rem',
              letterSpacing: '3px',
              cursor: 'pointer',
            }}
            onClick={() => window.location.href = '/'}
          >
            Arima
          </h1>
        </div>

        <div className="game-container" style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: '16px',
        }}>
          <main className="game-core" style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: 'fit-content',
          }}>
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
          </main>

          <div className="side-panel" style={{
            display: 'flex',
            flexDirection: 'column',
            width: '350px', height: '556px',
            flex: '1 1 auto',
          }}>
            <MoveHistoryPanel
              gameLog={g.gameLog}
              turnNotes={g.turnNotes}
              currMove={g.currMove}
              winner={g.winner}
              player={g.player}
            />

            <GameControls
              setupPhase={g.setupPhase}
              currMove={g.currMove}
              winner={g.winner}
              player={g.player}
              onRandomize={g.randomizeSetup}
              onConfirmSetup={g.confirmSetup}
              canEndTurn={g.canEndTurn}
              moveHistoryLength={g.moveHistoryLength}
              pushPhase={g.pushPhase}
              onEndTurn={g.endTurn}
              onUndo={g.undoMove}
              onRedo={g.redoMove}
              onReset={g.resetGame}
            />
          </div>
        </div>

        {/* New tab so the in-progress game (held in hook state) isn't lost */}
        <Link className="play-rules-link" style={{ alignSelf: 'start' }} to="/rules" target="_blank" rel="noopener noreferrer">
          Pieces &amp; Rules <FontAwesomeIcon icon={faShareFromSquare} />
        </Link>
      </div>
    </>
  );
}
