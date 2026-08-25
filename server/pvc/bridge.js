import { spawn } from "child_process";
import { fileURLToPath } from "url";
import path from "path";
import { existsSync } from "fs";
import { EventEmitter } from "events";
import { getJsEngineBestMove } from "./jsEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class EngineProcess extends EventEmitter {
  constructor(gameId, engineColour, difficulty = "hard") {
    super();
    this.gameId = gameId;
    this.engineColour = engineColour; // "white" or "black"
    this.difficulty = difficulty; // "easy" or "hard"
    this.process = null;
    this.buffer = "";
    this.ready = false;
    this.isFallback = false;
    this.moveHistory = [];
    this._pendingResolve = null;
    this._pendingReject = null;
    this._pendingTimeout = null;

    const binaryPrefix = difficulty === "easy" ? "chess_engine_easy" : "chess_engine_hard";
    const binaryName = process.platform === "win32" ? `${binaryPrefix}.exe` : binaryPrefix;
    this.enginePath = path.join(__dirname, "../../engine", binaryName);

    // Fallback path check (e.g. chess_engine)
    if (!existsSync(this.enginePath)) {
      const fallbackBinary = process.platform === "win32" ? "chess_engine.exe" : "chess_engine";
      const altPath = path.join(__dirname, "../../engine", fallbackBinary);
      if (existsSync(altPath)) {
        this.enginePath = altPath;
      }
    }

    this._chain = Promise.resolve();
  }

  // Spawn the C++ engine or switch to JS Engine fallback
  start() {
    return new Promise((resolve) => {
      if (!existsSync(this.enginePath)) {
        console.warn(`[Engine ${this.gameId}] C++ binary not found at ${this.enginePath}. Activating JS Engine fallback!`);
        this.isFallback = true;
        this.ready = true;

        if (this.engineColour === "white") {
          const firstMoveRes = getJsEngineBestMove([], this.difficulty);
          if (firstMoveRes) {
            this.moveHistory.push(firstMoveRes);
            setTimeout(() => {
              const line = `bestmove ${firstMoveRes.from} ${firstMoveRes.to}${firstMoveRes.promotion ? " " + firstMoveRes.promotion : ""}`;
              this.emit("message", line);
            }, 100);
          }
        }
        return resolve();
      }

      try {
        this.process = spawn(this.enginePath, [], {
          stdio: ["pipe", "pipe", "pipe"],
        });

        this.process.on("error", (err) => {
          console.warn(`[Engine ${this.gameId}] C++ Spawn failed (${err.message}). Activating JS Engine fallback!`);
          this.isFallback = true;
          this.ready = true;
          resolve();
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

        this.process.stdin.write(`engine ${this.engineColour}\n`);
        this.ready = true;
        setTimeout(() => resolve(), 100);

      } catch (err) {
        console.warn(`[Engine ${this.gameId}] Exception starting C++ binary. Activating JS Engine fallback!`);
        this.isFallback = true;
        this.ready = true;
        resolve();
      }
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

  _enqueue(fn) {
    const run = this._chain.then(fn, fn);
    this._chain = run.then(
      () => {},
      () => {}
    );
    return run;
  }

  sendMove(move) {
    if (this.isFallback) {
      return this._enqueue(() => {
        this.moveHistory.push(move);
        const reply = getJsEngineBestMove(this.moveHistory, this.difficulty);
        if (reply) this.moveHistory.push(reply);
        return Promise.resolve(reply || { type: "error", message: "No legal moves" });
      });
    }
    return this._enqueue(() => this._sendMoveNow(move));
  }

  sync(moves) {
    if (this.isFallback) {
      return this._enqueue(() => {
        this.moveHistory = [...moves];
        return Promise.resolve({ type: "synced", count: moves.length });
      });
    }
    return this._enqueue(() => this._syncNow(moves));
  }

  requestBestMove() {
    if (this.isFallback) {
      return this._enqueue(() => {
        const reply = getJsEngineBestMove(this.moveHistory, this.difficulty);
        if (reply) this.moveHistory.push(reply);
        return Promise.resolve(reply || { type: "error", message: "No legal moves" });
      });
    }
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

      this._pendingTimeout = setTimeout(() => {
        this._clearPending();
        reject(new Error("Engine response timeout"));
      }, 10000);

      this.process.stdin.write(cmd);
    });
  }

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

  _parseLine(line) {
    if (line.startsWith("bestmove")) {
      const parts = line.split(" ");
      return {
        type: "bestmove",
        from: parts[1],
        to: parts[2],
        promotion: parts[3] || null,
      };
    }
    if (line.startsWith("synced")) {
      const parts = line.split(" ");
      return { type: "synced", count: parseInt(parts[1], 10) };
    }
    if (line.startsWith("gameover")) {
      const parts = line.split(" ");
      return {
        type: "gameover",
        reason: parts[1],
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