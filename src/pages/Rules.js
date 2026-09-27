import { Link } from 'react-router-dom';
import { PIECE_NAMES, PIECE_EMOJI } from '../game/arima';
import './Rules.css';

// Static rules reference page.
export default function Rules() {
  return (
    <>
      <title>Arima Rules</title>
      <div className="rules-page" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        minHeight: '100vh',
        background: '#1a1a2e',
        color: '#e0e0e0',
        padding: '16px',
        fontFamily: 'Georgia, serif',
      }}>
        <div className="rules-header" style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}>
          <Link to="/" className="rules-title" style={{
            color: '#FFD700',
            fontSize: '1.8rem',
            fontWeight: 'bold',
            letterSpacing: '3px',
            textDecoration: 'none',
          }}>Arima</Link>
          <h2 style={{ margin: 0, color: '#FFD700', fontSize: '1.1rem' }}>Pieces &amp; Rules</h2>
        </div>

        {/* Rules card */}
        <div className="rules-body" style={{
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '16px 20px',
          maxWidth: '560px',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}>
          {/* Piece legend, strongest → weakest */}
          <div className="piece-legend" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
            {Object.entries(PIECE_NAMES).map(([type, name]) => (
              <div key={type} className="legend-row" style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.9rem',
              }}>
                <span className="legend-emoji" style={{ fontSize: '20px' }}>{PIECE_EMOJI[type]}</span>
                <span className="legend-letter" style={{ fontWeight: 'bold', color: '#FFD700', width: '14px' }}>{type}</span>
                <span>{name}</span>
              </div>
            ))}
          </div>
          <ul className="rules-list" style={{
            margin: 0,
            paddingLeft: '18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px',
            fontSize: '0.95rem',
            color: '#ccc',
            lineHeight: 1.5,
          }}>
            <li><b>Setup:</b> Gold, then Silver, arranges their 16 pieces anywhere within their own two home rows before turn 1.</li>
            <li>Each turn you may take <b>1-4 steps</b>; press <b>End Turn</b> when done (auto-ends after 4).</li>
            <li>Pieces move one square orthogonally per step.</li>
            <li><b>Rabbits</b> cannot step backward (toward their own home row).</li>
            <li><b>Frozen</b> pieces (dimmed) are adjacent to a stronger enemy with no friendly support — they cannot move.</li>
            <li><b>Traps</b> (c3, f3, c6, f6): a piece there with no friendly neighbor is captured.</li>
            <li><b>Win</b> by advancing a rabbit to the opponent's home row, capturing all opponent rabbits, leaving the opponent with no legal moves, or forcing them to repeat a position for the third time.</li>
            <li><b>Push</b> (2 steps): select your piece → click an adjacent weaker enemy (orange) → click where to send it. Your piece slides into its old square.</li>
            <li><b>Pull</b> (2 steps): move your piece — if a weaker enemy was adjacent to your start square, it lights up teal. Click it to drag it along.</li>
          </ul>
        </div>

        <Link to="/play" className="rules-play-btn">Play</Link>
      </div>
    </>
  );
}
