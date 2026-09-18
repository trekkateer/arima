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

  return (
    <div className="move-history">
      <div className="move-history-header">
        <span className="mh-col-num" />
        <span className="mh-col-label mh-gold">Gold</span>
        <span className="mh-col-label mh-silver">Silver</span>
      </div>
      <div className="move-log" ref={logRef}>
        {logRows.map(({ turnNum, Au, Ag }) => (
          <div key={turnNum} className="log-row">
            <span className="log-num">{turnNum}.</span>
            <span className={`log-steps log-gold${Au?.inProgress ? ' log-in-progress' : ''}`}>
              {Au?.steps?.join(' ')}
            </span>
            <span className={`log-steps log-silver${Ag?.inProgress ? ' log-in-progress' : ''}`}>
              {Ag?.steps?.join(' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
