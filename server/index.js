import http from 'node:http';
import express from 'express';
import { WebSocketServer } from 'ws';
import { Game } from './Game.js';

// Single hardcoded room: one Game and two seats. Gold and silver each listen on their
// own port, so a socket's color is decided by the port it connected to. A second
// connection to an already-filled port watches as a spectator.
//
// Protocol (JSON):
//   client → server  { type: 'setup', rows }   rows = own HOME_ROWS as 2×8 piece letters
//                    { type: 'move', steps }   one full turn of step notation, sent on End Turn
//                    { type: 'reset' }
//   server → client  { type: 'welcome', color } 'Au' | 'Ag' | null (spectator)
//                    { type: 'state', ...game.state(), seats } broadcast after every change
//                    { type: 'error', message } to the sender only, followed by a fresh state

const PORTS = {
  Au: Number(process.env.GOLD_PORT) || 3001,
  Ag: Number(process.env.SILVER_PORT) || 3002,
};

const app = express();
app.get('/health', (req, res) => res.json({ ok: true }));

// Every open socket across both ports, so broadcasts reach both players and spectators
const clients = new Set();

const game = new Game();
const seats = { Au: null, Ag: null };

function send(ws, msg) {
  if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

// seats tells clients whether their opponent is connected
function stateMsg() {
  return { type: 'state', ...game.state(), seats: { Au: !!seats.Au, Ag: !!seats.Ag } };
}

// Tells the player that their opponent is ready
function broadcast() {
  const msg = stateMsg();
  for (const ws of clients) send(ws, msg);
}

// Handles new WebSocket connections on `portColor`'s port, takes that seat if it's
// free, and manages game state broadcasting
function onConnection(ws, portColor) {
  const color = !seats[portColor] ? portColor : null;
  if (color) seats[color] = ws;
  clients.add(ws);
  console.log(`connected: ${color ?? 'spectator'}`);

  send(ws, { type: 'welcome', color });
  broadcast();

  ws.on('message', (data) => {
    let msg;
    try { msg = JSON.parse(data); } catch { return send(ws, { type: 'error', message: 'Bad JSON' }); }
    if (!color) return send(ws, { type: 'error', message: 'Spectators cannot play' });

    let res;
    switch (msg.type) {
      case 'setup': res = game.setup(color, msg.rows); break;
      case 'move':  res = game.move(color, msg.steps); break;
      case 'reset': game.reset(); res = {}; break;
      default:      res = { error: `Unknown message type "${msg.type}"` };
    }

    if (res.error) {
      console.log(`rejected ${color} ${msg.type}: ${res.error}`);
      // Resend state so the client can roll back whatever it applied locally
      send(ws, { type: 'error', message: res.error });
      send(ws, stateMsg());
    } else {
      broadcast();
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    if (color && seats[color] === ws) seats[color] = null;
    console.log(`disconnected: ${color ?? 'spectator'}`);
    broadcast();
  });
}

// One HTTP + WebSocket server per color, sharing the same game and Express app
for (const [color, port] of Object.entries(PORTS)) {
  const server = http.createServer(app);
  new WebSocketServer({ server }).on('connection', (ws) => onConnection(ws, color));
  server.listen(port, () => console.log(`Arima ${color === 'Au' ? 'gold' : 'silver'} on http://localhost:${port}`));
}
