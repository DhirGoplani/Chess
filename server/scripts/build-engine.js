import { execFileSync } from "child_process";
import { existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const engineDir = path.join(__dirname, "../../engine");
const isWindows = process.platform === "win32";
const outputName = isWindows ? "chess_engine.exe" : "chess_engine";
const outputPath = path.join(engineDir, outputName);

const sources = [
  "enginewrapper.cpp",
  "move.cpp",
  "evaluate.cpp",
  "search.cpp",
  "validmoves.cpp",
].map((f) => path.join(engineDir, f));

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
  process.exit(0); // don't fail the whole install over this
}

try{
  console.log(`[build-engine] Compiling engine with ${compiler} -> ${outputPath}`);
  execFileSync(
    compiler,
    ["-O2", "-std=c++17", "-o", outputPath, ...sources],
    { stdio: "inherit" }
  );
  console.log("[build-engine] Build succeeded.");
}catch (err){
  console.error("[build-engine] Build failed:", err.message);
  process.exit(0); // still don't hard-fail install
}

if(!existsSync(outputPath))  console.error(`[build-engine] Expected binary not found at ${outputPath}`);
