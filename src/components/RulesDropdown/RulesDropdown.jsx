import { PIECE_NAMES, PIECE_EMOJI } from '../../game/arima';

// Static rules reference, collapsed by default under a <details> disclosure.
export default function RulesPanel() {
  return (
    <details className="rules">
      <summary>Pieces &amp; Rules</summary>
      <div className="rules-body">
        <div className="piece-legend">
          {Object.entries(PIECE_NAMES).map(([type, name]) => (
            <div key={type} className="legend-row">
              <span className="legend-emoji">{PIECE_EMOJI[type]}</span>
              <span className="legend-letter">{type}</span>
              <span>{name}</span>
            </div>
          ))}
        </div>
        <ul className="rules-list">
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
    </details>
  );
}
