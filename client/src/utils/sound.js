// Centralized sound handling. All game sound effects should be played
// through playSound(event) / playMoveSound(...) below instead of calling
// `new Audio(...)` directly — that's what makes the classic/goofy/off
// setting possible.

const STORAGE_KEY = "soundMode"; // "classic" | "goofy" | "off"
const DEFAULT_MODE = "goofy";

// move/capture sound the same regardless of pack, so they live directly
// under /public/sounds/ instead of being duplicated per pack.
const SHARED_FILES = {
  move: "move.mp3",
  capture: "capture.mp3",
};

// These differ per pack — /public/sounds/<pack>/<filename>. To add the
// classic pack, drop files with these exact names into
// client/public/sounds/classic/.
const PACK_FILES = {
  check: "check.mp3",
  win: "victory.mp3",
  loss: "defeat.mp3",
  drawDeclined: "draw_declined.mp3",
};

export function getSoundMode() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === "classic" || stored === "goofy" || stored === "off" ? stored : DEFAULT_MODE;
}

export function setSoundMode(mode) {
  localStorage.setItem(STORAGE_KEY, mode);
  // Let any mounted components (e.g. the settings modal itself, if open
  // in two places) know the mode changed.
  window.dispatchEvent(new CustomEvent("soundModeChanged", { detail: mode }));
}

// event: "move" | "capture" | "check" | "win" | "loss" | "drawDeclined"
export function playSound(event) {
  const mode = getSoundMode();
  if (mode === "off") return;

  if (SHARED_FILES[event]) {
    new Audio(`/sounds/${SHARED_FILES[event]}`).play().catch(() => {});
    return;
  }

  const filename = PACK_FILES[event];
  if (!filename) return;

  new Audio(`/sounds/${mode}/${filename}`).play().catch(() => {});
}

// Priority-based sound for a move that just happened, on either side:
//   1. checkmate  -> nothing here (caller plays "win"/"loss" via playSound
//                     once it knows which side was mated — see playCheckmateOutcome)
//   2. check      -> check sound only
//   3. capture    -> capture sound only
//   4. otherwise  -> move sound
export function playMoveSound({ isCheckmate, isCheck, isCapture }) {
  if (isCheckmate) return;
  if (isCheck) { playSound("check"); return; }
  if (isCapture) { playSound("capture"); return; }
  playSound("move");
}