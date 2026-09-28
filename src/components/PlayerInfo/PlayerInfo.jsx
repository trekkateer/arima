import React, { useMemo, useRef, useEffect } from 'react';

// Sits next to a player's name and shows either the setup phase (which player is setting up)
// or the step tracker (how many steps have been used this turn).
export default function PlayerInfo({ g, player, currPlayer, position }) {  
  return(
    <div className="player-info" style={{
      display: 'flex',
      flexDirection: 'column',
      alignSelf: 'flex-start',
      margin: position === 'top' ? '0 0 8px 0' : '8px 0 0 0',
      gap: '4px',
    }}>
      <div className="player-name" style={{
        flex: 1,
        textAlign: "left",
        color: player.colorID === 'Au' ? '#FFD700' : '#C0C0C0',
        fontSize: '1.1rem',
        fontWeight: 'bold',
        letterSpacing: '1px',
      }}>
        {player.name}
      </div>
      {g.setupPhase ? (
        <div className="setup-status" style={{
          color: player.colorID === 'Au' ? '#FFD700' : '#C0C0C0',
          height: '0.95rem',
          fontSize: '0.95rem',
          fontWeight: 'bold',
          letterSpacing: '1px',
        }}>Setup: {g.setupPhase === 'Au' ? 'Gold' : 'Silver'}</div>
      ) : (
        <div className="step-pips" style={{ display: 'flex', gap: '6px', height: "0.95rem", alignItems: 'center' }}>
          {[1,2,3,4].map(i => (
            <div key={i} className={`step-pip ${i <= g.currMove ? 'pip-used' : ''}`} style={{
              width: '12px', height: '12px',
              borderRadius: '50%',
              // Filled gold for each step already used this turn (if it's this player's turn)
              background: i <= g.currMove && player.colorID === g.currPlayer ? '#FFD700' : '#444',
              transition: 'background 0.2s',
            }} />
          ))}
        </div>
      )}
    </div>
  );
}