import { useEffect, useMemo, useRef } from 'react';

// Chess.com-style move log: turn# | gold column | silver column. Builds display rows
// from the raw game log + in-progress turn notes, and owns its own auto-scroll —
// only this component needs either, so both live here instead of in the game engine.
export default function MoveHistoryPanel({ gameLog, turnNotes, currMove, winner, player }) {
  const logRows = useMemo(() => {
    const logEntries = [...gameLog];
    const inProgressSteps = turnNotes.slice(0, currMove).flat();
    if (inProgressSteps.length > 0 && !winner) {
      logEntries.push({ player, steps: inProgressSteps, inProgress: true });
    }
    const rows = [];
    for (let i = 0; i < logEntries.length; i += 2) {
      rows.push({ turnNum: Math.floor(i / 2) + 1, Au: logEntries[i], Ag: logEntries[i + 1] });
    }
    return rows;
  }, [gameLog, turnNotes, currMove, winner, player]);

  const logRef = useRef(null);
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logRows]);

  // Grows to fill the side panel height the controls/banners below don't use;
  // minHeight 0 lets it shrink and scroll instead of pushing the controls out.
  return (
    <div className="move-history" style={{
      flex: 1,
      minHeight: 0,
      background: '#0d0d1a',
      border: '1px solid #2a2a3e',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div className="move-history-header" style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr 1fr',
        gap: '4px',
        padding: '6px 8px 5px',
        borderBottom: '1px solid #2a2a3e',
        background: '#12122a',
      }}>
        <span className="mh-col-num" />
        <span className="mh-col-label mh-gold" style={{ color: '#FFD700' }}>Gold</span>
        <span className="mh-col-label mh-silver" style={{ color: '#C0C0C0' }}>Silver</span>
      </div>
      <div className="move-log" ref={logRef}>
        {logRows.map(({ turnNum, Au, Ag }) => (
          <div key={turnNum} className="log-row" style={{
            display: 'grid',
            gridTemplateColumns: '28px 1fr 1fr',
            gap: '4px',
            padding: '4px 8px',
            fontFamily: "'Courier New', monospace",
            fontSize: '0.74rem',
            lineHeight: 1.45,
          }}>
            <span className="log-num" style={{ color: '#555', fontSize: '0.7rem', userSelect: 'none' }}>{turnNum}.</span>
            <span className={`log-steps log-gold${Au?.inProgress ? ' log-in-progress' : ''}`} style={{ color: '#FFD700' }}>
              {Au?.steps?.join(' ')}
            </span>
            <span className={`log-steps log-silver${Ag?.inProgress ? ' log-in-progress' : ''}`} style={{ color: '#C0C0C0' }}>
              {Ag?.steps?.join(' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
