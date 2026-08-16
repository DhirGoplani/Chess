import { execFileSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineBaseDir = path.join(__dirname, "../../engine");
const isWindows = process.platform === "win32";

function findCompiler() {
  const candidates = ["g++", "clang++"];
  for (const compiler of candidates) {
    try {
      execFileSync(compiler, ["--version"], { stdio: "ignore" });
      return compiler;
    } catch {
      // try next
    }
  }
  return null;
}

const compiler = findCompiler();

if (!compiler) {
  console.error(
    "\n[build-engine] No C++ compiler (g++ or clang++) found on PATH.\n" +
    "The Player-vs-Computer feature requires a compiled engine binary.\n" +
    "  - Windows: install MinGW-w64 (or use WSL) so `g++` is available\n" +
    "  - Mac: `xcode-select --install`\n" +
    "  - Linux: `apt install g++` / `apt install build-essential`\n" +
    "Skipping engine build; PvC games will fail to start until this is resolved.\n"
  );
  process.exit(0);
}

function compileTarget(subDir, binaryBaseName) {
  const dirPath = path.join(engineBaseDir, subDir);
  const outputName = isWindows ? `${binaryBaseName}.exe` : binaryBaseName;
  const outputPath = path.join(engineBaseDir, outputName);

  const sources = [
    "enginewrapper.cpp",
    "move.cpp",
    "evaluate.cpp",
    "search.cpp",
    "validmoves.cpp",
  ].map((f) => path.join(dirPath, f));

  try {
    console.log(`[build-engine] Compiling ${subDir} engine with ${compiler} -> ${outputPath}`);
    execFileSync(
      compiler,
      ["-O2", "-std=c++17", "-o", outputPath, ...sources],
      { stdio: "inherit" }
    );
    console.log(`[build-engine] ${subDir} engine build succeeded.`);
  } catch (err) {
    console.error(`[build-engine] ${subDir} engine build failed:`, err.message);
  }

  if (!existsSync(outputPath)) {
    console.error(`[build-engine] Expected binary not found at ${outputPath}`);
  }
}

// Build both Easy and Hard engines
compileTarget("easy", "chess_engine_easy");
compileTarget("hard", "chess_engine_hard");
// Build default chess_engine as hard engine fallback
compileTarget("hard", "chess_engine");
