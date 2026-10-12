import { useEffect, useRef, useState } from 'react';

// Gold and silver connect to separate server ports; the port decides our seat.
// Same host as the page so two tabs (or two machines on a LAN) find it.
const PORTS = {
  Au: process.env.REACT_APP_GOLD_PORT || 3001,
  Ag: process.env.REACT_APP_SILVER_PORT || 3002,
};

// `?side=silver` on the page URL picks silver; anything else is gold
function serverUrl() {
  const side = new URLSearchParams(window.location.search).get('side') === 'silver' ? 'Ag' : 'Au';
  return `ws://${window.location.hostname}:${PORTS[side]}`;
}

// Owns the WebSocket to the game server. Does nothing when `enabled` is false, so
// local play can call it unconditionally. `onMessage` receives every parsed message
// except 'welcome', which is consumed here to learn our seat color.
export function useServer(enabled, onMessage) {
  const [status, setStatus] = useState(enabled ? 'connecting' : 'offline');
  const [color, setColor] = useState(null);
  const wsRef = useRef(null);
  // Ref so the socket (opened once) always calls the latest handler
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    if (!enabled) return;
    const ws = new WebSocket(serverUrl());
    wsRef.current = ws;
    ws.onopen = () => setStatus('connected');
    ws.onclose = () => setStatus('disconnected');
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === 'welcome') setColor(msg.color);
      else onMessageRef.current(msg);
    };
    return () => ws.close();
  }, [enabled]);

  function send(msg) {
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(msg));
  }

  return { status, color, send };
}
