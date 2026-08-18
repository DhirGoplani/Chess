# Chess

A full-stack multiplayer chess platform — play a friend over the network (Player vs Player) or challenge a custom C++ engine (Player vs Computer), with live game analysis, move history, and rating tracking.

**Live app:** [chess-eight-psi.vercel.app](https://chess-eight-psi.vercel.app/)

---

## Architecture overview

```
client/    React + Vite frontend (deployed on Vercel)
server/    Node.js/Express + Socket.IO backend (auth, matchmaking, PvP game state, PvC bridge)
engine/    C++ chess engine (bitboard-based), compiled to a native binary and driven as a subprocess
```

The app has two distinct ways of playing a game, and they're implemented very differently under the hood:

| Mode | How moves are validated | How the opponent moves |
|---|---|---|
| **PvP** (Player vs Player) | `chess.js` on the server | Real opponent, relayed over a Socket.IO room |
| **PvC** (Player vs Computer) | `chess.js` on the client (optimistic) + engine's own board state | Custom C++ engine subprocess, spoken to over stdin/stdout |

---

## The engine (`engine/`) — bitboards in C++

The chess engine itself has nothing to do with Node — it's a standalone C++ program with no external dependencies, built entirely around **bitboards**: each piece type/colour is represented as a single 64-bit integer (`uint64_t`), where each bit maps to one of the 64 squares. A knight's attack squares, a pawn's push, a sliding piece's ray — all of these become bit shifts and masks (`afile`, `hfile`, `rank1`, `rank8` masks handle wraparound at the board edges) instead of loops over an 8x8 array.

Key pieces:

- **`board.h`** — the `Board` class: `BB pieces[2][6]` holds one bitboard per (colour, piece-type) pair, plus castling rights, en passant square, and side-to-move. Move application (`makeMove`) and reversal are done directly on these bitboards.
- **`validmoves.cpp` / `move.cpp`** — pseudo-legal move generation per piece type, and legality filtering via `isInCheck` (attacking the king square from every angle using the same bitboard shift logic, in reverse).
- **`evaluate.cpp`** — static position evaluation (material + positional heuristics) used to score leaf nodes.
- **`search.cpp`** — the actual "thinking": generates legal moves, orders them (captures/promotions scored higher for better alpha-beta cutoffs), and runs a fixed-depth **alpha-beta minimax** search (see `DEPTH` in `enginewrapper.cpp`) to pick the best move. The `hard/` variant adds a transposition table (`tt.h`) for stronger, faster search; `easy/` is a shallower/simpler build for a beatable opponent.
- **`enginewrapper.cpp`** — the `main()` entry point. It's a tiny **text-protocol REPL**: it reads lines like `move e2e4` or `go` from stdin and writes back `bestmove e7e5` / `gameover checkmate` to stdout. This is the entire interface between the C++ world and the Node.js world.

There are two prebuilt "personalities" (`chess_engine_easy` / `chess_engine_hard`) compiled from the `easy/` and `hard/` source variants, matching the difficulty picker in the UI.

### How Node talks to the engine

`server/pvc/bridge.js` spawns the compiled engine binary as a **child process** (`child_process.spawn`) per game and communicates over its stdin/stdout pipes using that same line-based protocol — write a move, read a line back, resolve a Promise. `server/pvc/pvcController.js` drives this: when a player POSTs a move to `/api/pvc/move`, it validates the move with `chess.js`, forwards it to the engine process, and returns whatever the engine replies with as the opponent's move.

The binary itself is **built from source at install time**, not committed pre-compiled for the deploy target — `server/scripts/build-engine.js` runs as an npm `postinstall` hook and invokes `g++` directly on the `.cpp` files in `engine/`, so the binary always matches whatever OS the server is actually installed on (this is what the Docker setup below exists to solve).

---

## PvP mode — Socket.IO

Player-vs-player games are real-time and stateful, so they run over a persistent WebSocket connection rather than REST:

- **`server/socket/socketHandler.js`** is the single Socket.IO event router for the whole app: matchmaking (`findMatch`, `cancelSearch`), friend challenges (`challengeFriend`, `respondChallenge`), and in-game events (`makeMove`, `offerDraw`, `resign`, disconnect handling).
- **`server/game/GameManager.js`** owns the in-memory registry of active `ChessGame` instances, keyed by `gameId`, and pairs matched players into a Socket.IO **room** (`socket.join(gameId)`) so a move from either side can be broadcast to just that pair.
- **`server/game/ChessGame.js`** wraps a `chess.js` instance per game (`this.chess = new Chess()`) as the single source of truth for the position — it owns move legality, check/checkmate/stalemate detection, and per-player clocks (`startTimer`/`stopTimer`, decremented on a `setInterval` and pushed to clients via `timerUpdate`).

The flow for a move: client emits `makeMove` → server checks it's actually that player's turn and game exists → `game.makeMove(from, to, promotion)` validates and applies it via `chess.js` → server broadcasts `moveMade` (with the updated FEN/board and SAN move history) plus `timerUpdate` to **everyone in that room**, so both players' boards update from the same server-confirmed state rather than each client just trusting its own move.

---

## `chess.js` — the rules engine on the JS side

`chess.js` (the npm package, unrelated to the C++ engine above) is used anywhere the JS side needs to know "is this move legal / is this checkmate / what's the SAN notation" without reimplementing chess rules:

- **Server, PvP (`ChessGame.js`)** — authoritative move validation. The server never trusts a client's claim that a move was legal; every `makeMove` call goes through a real `chess.js` instance.
- **Server, PvC (`pvcController.js`)** — validates the human's move before handing the resulting position to the C++ engine, and again applies the engine's reply to keep the server-side board in sync.
- **Client (`game.jsx`, `PvcGame.jsx`, `analysis.jsx`)** — drives the UI's own `Chess()` instance for move legality highlighting, detecting check/game-over locally for instant feedback, and generating SAN for the move-history panel — effectively a client-side mirror of whatever the server just confirmed.

In short: the C++ engine only ever decides *what move to play*; `chess.js` is what everyone (server and client, in both modes) uses to decide *whether a move is legal* and to track the resulting game state.

---

## Docker

The tricky part of containerizing this app is that the server's `postinstall` step needs to **compile C++ source into a native binary**, and that binary has to end up in exactly the folder structure the code expects at runtime.

`server/Dockerfile` handles this:

1. Starts from `node:20-slim` and installs `g++` (not present in the base image) so the container can compile the engine itself.
2. **Must be built from the repo root**, not from inside `server/` — the build needs to `COPY` both `engine/` and `server/` into the image as sibling folders:
   ```bash
   docker build -f server/Dockerfile -t chess-server .
   ```
   This matters because `bridge.js` and `build-engine.js` both resolve the engine's location as `../../engine` relative to themselves, which only resolves correctly if `engine/` and `server/` sit next to each other inside the container the same way they do in the repo.
3. `RUN npm install --omit=dev` inside `/server` triggers the `postinstall` script, which invokes `g++` against the copied `engine/` source and produces a **Linux binary at build time** — so the engine that ships in the image always matches the container's own OS/architecture, regardless of what platform (Windows, macOS) the image was built from.
4. `.dockerignore` excludes `node_modules` (rebuilt fresh inside the Linux container so native deps aren't polluted by a host OS build) and `server/.env` (secrets are injected at `docker run` time via `--env-file`, never baked into the image).
5. `EXPOSE 3000` documents the server's port; `CMD ["node", "index.js"]` starts it.

The client is a static Vite build and is deployed separately (Vercel), so it isn't part of this Dockerfile.

---

## Tech stack summary

- **Frontend:** React, Vite, `chess.js`, Socket.IO client — deployed on [Vercel](https://chess-eight-psi.vercel.app/)
- **Backend:** Node.js, Express, Socket.IO, `chess.js`, PostgreSQL (auth/history/ratings), JWT auth
- **Engine:** C++ (bitboard board representation, alpha-beta search with move ordering, optional transposition table), compiled per-deploy and driven as a child process over a stdin/stdout text protocol
- **Containerization:** Docker (multi-folder build context to compile the engine and run the server together)