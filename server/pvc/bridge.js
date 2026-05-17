import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import { EventEmitter } from "events";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENGINE_PATH = path.join(__dirname, "../../engine/chess_engine");

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
  }

  // Spawn the C++ engine and send the init line
  start() {
    return new Promise((resolve, reject) => {
      this.process = spawn(ENGINE_PATH, [], {
        stdio: ["pipe", "pipe", "pipe"], // 3 pipes , one for input, one for output, one for error
      });

      this.process.on("error", (err) => {
        console.error(`[Engine ${this.gameId}] Spawn error:`, err.message);
        reject(new Error(`Failed to start engine: ${err.message}`));
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

  sendMove(move) {
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