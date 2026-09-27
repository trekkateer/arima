import React, { useMemo, useRef, useEffect } from 'react';

// Sits next to a player's name and shows either the setup phase (which player is setting up)
// or the step tracker (how many steps have been used this turn).
export default function PlayerStatus({ g, player }) {  
  return(
    g.setupPhase ? (
      <div className="setup-status" style={{
        color: '#FFD700',
        fontSize: '0.95rem',
        fontWeight: 'bold',
        letterSpacing: '1px',
      }}>Setup: {g.setupPhase === 'Au' ? 'Gold' : 'Silver'}</div>
    ) : (
      <div className="step-track" style={{ display: 'flex', gap: '6px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} className={`step-pip ${i <= g.currMove ? 'pip-used' : ''}`} style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            // Filled gold for each step already used this turn
            background: i <= g.currMove ? '#FFD700' : '#444',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
    )
  );
}