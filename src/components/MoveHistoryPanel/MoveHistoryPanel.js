import { forwardRef } from 'react';

// Chess.com-style move log: turn# | gold column | silver column. `logRef` is
// forwarded so the page can auto-scroll to the latest entry as moves are made.
const MoveHistoryPanel = forwardRef(function MoveHistoryPanel({ logRows }, logRef) {
  return (
    <div className="move-history">
      <div className="move-history-header">
        <span className="mh-col-num" />
        <span className="mh-col-label mh-gold">Gold</span>
        <span className="mh-col-label mh-silver">Silver</span>
      </div>
      <div className="move-log" ref={logRef}>
        {logRows.map(({ turnNum, gold, silver }) => (
          <div key={turnNum} className="log-row">
            <span className="log-num">{turnNum}.</span>
            <span className={`log-steps log-gold${gold?.inProgress ? ' log-in-progress' : ''}`}>
              {gold?.steps?.join(' ')}
            </span>
            <span className={`log-steps log-silver${silver?.inProgress ? ' log-in-progress' : ''}`}>
              {silver?.steps?.join(' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
});

export default MoveHistoryPanel;
