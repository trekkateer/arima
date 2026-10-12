import { createInitialBoard, serializePosition } from '../src/game/arima.js';
import { applyTurn, applySetup, judgeTurnEnd } from '../src/game/turn.js';

// One authoritative game held in memory. Every mutation is validated with the same
// shared rules the client uses; methods return { error } instead of throwing so the
// socket layer can relay the message to the offending client.
export class Game {
  constructor() {
    this.reset();
  }

  reset() {
    this.board = createInitialBoard();
    this.setupPhase = 'Au';   // 'Au' | 'Ag' while that side arranges pieces, null once play starts
    this.currPlayer = 'Au';
    this.winner = null;
    this.gameLog = [];        // completed turns: { player, steps: string[] }
    this.positionLog = [];    // serializePosition keys for repetition detection
  }

  // Applies `color`'s setup and advances gold → silver → play
  setup(color, rows) {
    if (this.setupPhase !== color) return { error: "It isn't your setup" };
    const res = applySetup(this.board, color, rows);
    if (res.error) return res;

    this.board = res.board;
    if (color === 'Au') {
      this.setupPhase = 'Ag';
    } else {
      this.setupPhase = null;
      this.positionLog = [serializePosition(this.board, 'Au')];
    }
    return {};
  }

  // Validates and applies a full turn of step notation, then judges the end of turn
  move(color, steps) {
    if (this.setupPhase) return { error: 'The game is still in setup' };
    if (this.winner) return { error: 'The game is over' };
    if (color !== this.currPlayer) return { error: "It isn't your turn" };

    const res = applyTurn(this.board, color, steps);
    if (res.error) return res;

    const judged = judgeTurnEnd(res.board, color, this.positionLog);
    this.board = res.board;
    this.gameLog.push({ player: color, steps: res.notes });
    this.positionLog = judged.positionLog;
    if (judged.winner) this.winner = judged.winner;
    else this.currPlayer = color === 'Au' ? 'Ag' : 'Au';
    return {};
  }

  // Everything a client needs to render
  state() {
    return {
      board: this.board,
      setupPhase: this.setupPhase,
      currPlayer: this.currPlayer,
      winner: this.winner,
      gameLog: this.gameLog,
    };
  }
}
