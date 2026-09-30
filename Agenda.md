Invented by [Omar Syed](https://arimaa.com/arimaa/about/designers.html) in 1999, Arima is a two-player strategy board game played on an 8×8 grid. It is designed to be inherently difficult for computers to crack. Each turn, a player moves their pieces up to four steps. Pieces can freeze weaker enemies, fall into traps, push and pull opponents, and win by advancing a Rabbit to the far side of the board or capturing all of the opponent's Rabbits.

* About: https://arimaa.com/arimaa/
* Notation: https://arimaa.com/arimaa/learn/notation.html
* [Board Game Geek ID](https://boardgamegeek.com/boardgame/4616/arimaa): 4616

## Agenda

### Game Rules (Correctness First)

- [X]  **Push moves** - stronger piece pushes a weaker adjacent enemy (noted as "coming soon") ✅ 2026-06-16
- [X]  **Pull moves** - after moving, a piece can pull a weaker adjacent enemy into its vacated square ✅ 2026-06-16
- [x] **Immobilization loss** - if a player has no legal moves at the start of their turn, they lose ✅ 2026-09-17
- [X]  **Repetition rule** - a player cannot end their turn in the same board position that occurred twice before (Arimaa forbids this)
- [X]  **Undo scoping** - undo should be disabled once a turn ends ✅ 2026-06-16

### Turn & Move System

- [X]  **Auto-end at 4 steps** - currently increments move counter but doesn't switch player at 4 ✅ 2026-06-16
- [X]  **Step tracking resets cleanly across turns** - verify switchPlayer clears state correctly ✅ 2026-07-07
- [X]  **Move notation** - record each step in Arimaa notation (e.g., `Ed2n`, `Rc3e`) for display and game logging ✅ 2026-07-07
- [X]  **Move history panel** - display past turns' moves in notation, not just board snapshots ✅ 2026-07-07

### UI / UX

- [x] **Player indicator** - uncomment and finish the player bar (currently commented out) ✅ 2026-09-27
- [ ]  **Captured pieces tray** - show pieces lost to traps
- [ ]  **Drag-and-drop** - click-to-move works but drag is the standard for board games
- [ ]  **Piece images** - replace emoji with proper SVG/PNG art (emoji render inconsistently across OSes)
- [ ]  **Move animations** - smooth piece sliding between squares
- [ ]  **Sound effects** - move, capture, win
- [ ]  **Confetti** - on a win
- [ ]  **Mobile layout** - board is not currently responsive; must work on phones
- [ ]  **Dark/light theme toggle**

### Single-Player / Offline

- [ ]  **Local 2-player hotseat** - fully working (push/pull + rule fixes needed first)

- No bots though - this is against the Arimaa code

### Online Multiplayer (Lichess-comparable)

- [ ]  **Backend server** - Node.js + WebSocket (e.g., Socket.io) or BaaS like Supabase/Firebase
- [ ]  **Game rooms** - create a game, share a link, second player joins
- [ ]  **Real-time move sync** - broadcast moves to both clients
- [ ]  **Reconnect handling** - rejoin a game if you disconnect
- [ ]  **Game state persistence** - store games in a database so they survive server restarts

### Clocks & Time Controls

- [ ]  **Per-turn timer** - countdown clock per side (essential for competitive play)
- [ ]  **Time control presets** - Blitz, Rapid, Classical, Correspondence
- [ ]  **Flag on timeout** - player loses when clock hits zero

### User Accounts

- [ ]  **Registration / login** - email + password or OAuth (Google/Apple/Facebook/Discord/GitHub/OpenELO)
- [ ]  **Player profiles** - username, avatar, game history
- [ ]  **Session persistence** - stay logged in across browser sessions

### Ratings & Social

- [ ]  **ELO / rating system** - adjust ratings after ranked games. Connect to [[OpenELO]] account
- [ ]  **Lobby** - open challenges list where players can find opponents
- [ ]  **In-game chat** - basic text chat between players
- [ ]  **Friends / follow system** *(stretch goal)*
- [ ]  **Spectating** - watch live games in progress

### Game Review

- [ ]  **Game archive** - view your past games
- [ ]  **Share game link** - replay a specific game

### Infrastructure & Deployment

- [ ]  **Hosting** - hosted on SiteGround
- [ ]  **Database** - PostgreSQL
- [ ]  **Environment config** - `.env` files for API keys, DB URLs
- [ ]  **CI/CD pipeline** - auto-deploy on push to main
- [ ]  **Error monitoring** - Sentry or similar

### Polish & Accessibility

- [ ]  **Keyboard navigation** - navigate board without a mouse
- [ ]  **Move Terminal** - terminal interface that players can type moves into
- [ ]  **Colorblind mode** - don't rely on gold/silver color alone
- [ ]  **SEO & Open Graph tags** - shareable links look good on social media
- [ ]  **PWA / installable** - add to home screen on mobile
