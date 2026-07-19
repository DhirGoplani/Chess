import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import { EventEmitter } from "events";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_BINARY = process.platform === "win32" ? "chess_engine.exe" : "chess_engine";
const ENGINE_PATH = path.join(__dirname, "../../engine", ENGINE_BINARY);

export class EngineProcess extends EventEmitter {
  constructor(gameId, engineColour) {
    super();
    this.gameId = gameId;
    this.engineColour = engineColour; // "white" or "black"
    this.process = null;
    this.buffer = "";
    this.ready = false;
    this._pendingResolve = null;
    this._pendingReject = null;
    this._pendingTimeout = null;
    // fix: the engine's stdin/stdout protocol only ever has ONE request in
    // flight at a time — the old code had a single _pendingResolve/
    // _pendingReject slot with no queue, so two overlapping calls (a retry,
    // a double submit, any race from elsewhere) could stomp on each other:
    // the second write would land before the first reply came back, and
    // whichever promise happened to be "pending" at that moment would
    // resolve with the wrong line. That's how the engine's internal board
    // can silently drift from the real game. This promise chain forces
    // every request (move/sync/go) through one at a time, in order.
    this._chain = Promise.resolve();
  }

  // Spawn the C++ engine and send the init line
  start() {
    return new Promise((resolve, reject) => {
      this.process = spawn(ENGINE_PATH, [], {
        stdio: ["pipe", "pipe", "pipe"], // 3 pipes , one for input, one for output, one for error
      });

      this.process.on("error", (err) => {
        const hint =
          err.code === "ENOENT"
            ? ` Binary not found at ${ENGINE_PATH} - run "npm install" in /server to build it (requires g++).`
            : "";
        console.error(`[Engine ${this.gameId}] Spawn error:`, err.message + hint);
        reject(new Error(`Failed to start engine: ${err.message}${hint}`));
      });

      this.process.stderr.on("data", (data) => {
        console.error(`[Engine ${this.gameId}] stderr:`, data.toString().trim());
      });

      this.process.stdout.on("data", (data) => {
        this.buffer += data.toString();
        this._processBuffer();
      });

      this.process.on("close", (code) => {
        console.log(`[Engine ${this.gameId}] Process exited with code ${code}`);
        this.emit("closed");
        if (this._pendingReject) {
          this._pendingReject(new Error("Engine process closed unexpectedly"));
          this._clearPending();
        }
      });

      // Send which colour the engine plays
      // The wrapper reads this as its first line
      this.process.stdin.write(`engine ${this.engineColour}\n`);
      this.ready = true;

      // If engine plays white, it will immediately output a bestmove
      // If engine plays black, it waits. Either way, resolve after spawn.
      // Give it a moment to potentially send the first move
      setTimeout(() => resolve(), 100);
    });
  }

  // Process stdout buffer line by line
  _processBuffer() {
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop(); // keep incomplete last line

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      console.log(`[Engine ${this.gameId}] →`, trimmed);

      if (this._pendingResolve) {
        this._pendingResolve(trimmed);
        this._clearPending();
      } else {
        // Unsolicited output (e.g. engine plays white, first move)
        this.emit("message", trimmed);
      }
    }
  }

  _clearPending() {
    if (this._pendingTimeout) clearTimeout(this._pendingTimeout);
    this._pendingResolve = null;
    this._pendingReject = null;
    this._pendingTimeout = null;
  }

  // fix: run `fn` only once every previously-queued request has settled
  // (resolved or rejected), so calls to this engine are always strictly
  // serialized — no two "move"/"sync"/"go" writes can ever be in flight
  // on the same stdin pipe at once.
  _enqueue(fn) {
    const run = this._chain.then(fn, fn);
    // Swallow so one failed request doesn't permanently wedge the queue
    // for requests that come after it.
    this._chain = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  sendMove(move) {
    return this._enqueue(() => this._sendMoveNow(move));
  }

  // fix: push the authoritative move history to the engine and have it
  // rebuild its internal board from scratch by replaying it. Call this when
  // the engine's proposed move fails validation against the real game
  // state, to recover instead of failing the whole game.
  sync(moves) {
    return this._enqueue(() => this._syncNow(moves));
  }

  // fix: ask the engine to compute + apply a move for whatever position it
  // currently holds, without first applying a "human" move. Use this right
  // after sync() to get a fresh, trustworthy reply.
  requestBestMove() {
    return this._enqueue(() => this._requestBestMoveNow());
  }

  _sendMoveNow(move) {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.ready) {
        return reject(new Error("Engine not started"));
      }

      const promoSuffix = move.promotion ? ` ${move.promotion}` : "";
      const cmd = `move ${move.from} ${move.to}${promoSuffix}\n`;
      console.log(`[Engine ${this.gameId}] ←`, cmd.trim());

      this._pendingResolve = (line) => resolve(this._parseLine(line));
      this._pendingReject = reject;

      // 10-second timeout (depth 4 should be well within this)
      this._pendingTimeout = setTimeout(() => {
        this._clearPending();
        reject(new Error("Engine response timeout"));
      }, 10000);

      this.process.stdin.write(cmd);
    });
  }

  // fix: serialize a full move history to the engine's "sync" command.
  _syncNow(moves) {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.ready) {
        return reject(new Error("Engine not started"));
      }

      const parts = moves
        .map((m) => `${m.from} ${m.to} ${m.promotion || "-"}`)
        .join(" ");
      const cmd = `sync ${parts}\n`;
      console.log(`[Engine ${this.gameId}] ← (resync, ${moves.length} moves)`);

      this._pendingResolve = (line) => resolve(this._parseLine(line));
      this._pendingReject = reject;

      this._pendingTimeout = setTimeout(() => {
        this._clearPending();
        reject(new Error("Engine sync timeout"));
      }, 10000);

      this.process.stdin.write(cmd);
    });
  }

  // fix: send the "go" command (compute a reply for the current position).
  _requestBestMoveNow() {
    return new Promise((resolve, reject) => {
      if (!this.process || !this.ready) {
        return reject(new Error("Engine not started"));
      }

      const cmd = `go\n`;
      console.log(`[Engine ${this.gameId}] ←`, cmd.trim());

      this._pendingResolve = (line) => resolve(this._parseLine(line));
      this._pendingReject = reject;

      this._pendingTimeout = setTimeout(() => {
        this._clearPending();
        reject(new Error("Engine response timeout"));
      }, 10000);

      this.process.stdin.write(cmd);
    });
  }

  // Parse a line from the engine into a structured response
  _parseLine(line) {
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      // "bestmove e7 e5" or "bestmove e7 e8 q"
      return {
        type: "bestmove",
        from: parts[1],
        to: parts[2],
        promotion: parts[3] || null,
      };
    }
    // fix: recognize the "synced <n>" response from the new sync command
    if (line.startsWith("synced")) {
      const parts = line.split(" ");
      return { type: "synced", count: parseInt(parts[1], 10) };
    }
    if (line.startsWith("gameover")) {
      const parts = line.split(" ");
      return {
        type: "gameover",
        reason: parts[1], // "checkmate" or "stalemate"
      };
    }
    if (line.startsWith("error")) {
      return { type: "error", message: line.slice(6) };
    }
    return { type: "unknown", raw: line };
  }

  kill() {
    if (this.process) {
      try {
        this.process.stdin.write("quit\n");
        this.process.stdin.end();
      } catch (_) {}
      setTimeout(() => {
        if (this.process) this.process.kill("SIGTERM");
      }, 500);
      this.process = null;
      this.ready = false;
    }
  }
}