import dotenv from "dotenv";
import fetch from "node-fetch";
import { EngineProcess } from "./pvc/bridge.js";

dotenv.config();

const LICHESS_TOKEN = process.env.LICHESS_TOKEN;

if (!LICHESS_TOKEN) {
  console.error("❌ ERROR: LICHESS_TOKEN is missing in .env file!");
  console.error("Please add: LICHESS_TOKEN=lip_YOUR_TOKEN_HERE into server/.env");
  process.exit(1);
}

const HEADERS = {
  Authorization: `Bearer ${LICHESS_TOKEN}`,
  "Content-Type": "application/json",
};

// Active Lichess Bot Games Map & My Bot Username
const activeGames = new Map();
let myBotUsername = "";

// Auto Loop Rating Runner State
let isLoopMode = false;
let totalLoopTarget = 12;
let completedLoopGames = 0;
const loopOpponents = ["maia9"];

console.log("==================================================");
console.log("🤖 LICHESS BOT RUNNER FOR CHESS ENGINE");
console.log("==================================================");

// 1. Verify Bot Account Details
async function checkAccount() {
  try {
    const res = await fetch("https://lichess.org/api/account", { headers: HEADERS });
    const data = await res.json();
    if (res.ok) {
      myBotUsername = data.username;
      console.log(`✅ Logged in as: @${data.username} (Title: ${data.title || "BOT"})`);
      console.log(`🔗 Profile: https://lichess.org/@/${data.username}`);
      console.log("==================================================\n");
    } else {
      console.error("❌ Failed to verify token:", data.error || data);
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Network error verifying account:", err.message);
    process.exit(1);
  }
}

// Helper: Send Outgoing Challenge to another Bot/Player using official form-encoded Lichess API
async function challengeTarget(targetUser, minTime = 3) {
  console.log(`🚀 Sending official API challenge from @${myBotUsername} to @${targetUser} (${minTime} min Blitz)...`);
  try {
    const params = new URLSearchParams({
      rated: "true",
      "clock.limit": (minTime * 60).toString(),
      "clock.increment": "0",
      color: "random",
      variant: "standard",
    });

    const res = await fetch(`https://lichess.org/api/challenge/${targetUser}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LICHESS_TOKEN}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await res.json();
    if (res.ok) {
      console.log(`✅ Outgoing API challenge sent to @${targetUser}! Waiting for @${targetUser} to accept...`);
    } else {
      console.error(`❌ Lichess API challenge error to @${targetUser}:`, data);
    }
  } catch (err) {
    console.error("Error sending outgoing challenge:", err.message);
  }
}

// 2. Stream Lichess Account Events (Incoming Challenges & Game Start)
async function listenEvents() {
  console.log("📡 Listening for live Lichess events & incoming challenges...");
  try {
    const response = await fetch("https://lichess.org/api/stream/event", { headers: HEADERS });

    if (!response.ok) {
      console.error("❌ Event stream failed:", response.status, response.statusText);
      const isRateLimited = response.status === 429;
      const cooldownMs = isRateLimited ? 60000 : 5000;

      if (isRateLimited) {
        console.log("⏳ Rate limited (HTTP 429) by Lichess. Waiting 60 seconds for cooldown...");
      }

      setTimeout(listenEvents, cooldownMs);
      return;
    }

    const reader = response.body;

    // Line-by-line NDJSON stream reader
    let buffer = "";
    reader.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop(); // Keep partial line

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line.trim());
          handleLichessEvent(event);
        } catch (err) {
          console.error("Error parsing NDJSON event:", err.message);
        }
      }
    });

    reader.on("end", () => {
      console.log("⚠️ Event stream disconnected. Reconnecting in 5s...");
      setTimeout(listenEvents, 5000);
    });

    reader.on("error", (err) => {
      console.error("❌ Stream error:", err.message);
      setTimeout(listenEvents, 5000);
    });

  } catch (err) {
    console.error("❌ Event stream connection error:", err.message);
    setTimeout(listenEvents, 5000);
  }
}

// Handle Event Router
async function handleLichessEvent(event) {
  if (event.type === "challenge") {
    const challenge = event.challenge;
    if (!challenge) return;

    const challengerName =
      challenge.challenger?.username ||
      challenge.challenger?.name ||
      challenge.challenger?.id ||
      "Player";

    const destName =
      challenge.destUser?.username ||
      challenge.destUser?.name ||
      challenge.destUser?.id ||
      "";

    const variantKey = challenge.variant?.key || "standard";
    const speed = challenge.speed || "game";

    // 1. Check if WE created this outgoing challenge to another user/bot
    if (myBotUsername && challengerName.toLowerCase() === myBotUsername.toLowerCase()) {
      if (destName && destName.toLowerCase() !== myBotUsername.toLowerCase()) {
        console.log(`\n🚀 Outgoing challenge from @${myBotUsername} to @${destName} (${variantKey} ${speed}) created! Waiting for @${destName} to accept...`);
        return;
      } else {
        console.log(`\n⚠️ Ignored True Self-Challenge: Lichess does not allow an account to play against itself.`);
        return;
      }
    }

    console.log(`\n⚔️ INCOMING CHALLENGE [ID: ${challenge.id}] from @${challengerName} (${variantKey} ${speed})`);

    // Decline non-standard variants (Horde, Atomic, Chess960)
    if (variantKey !== "standard") {
      console.log(`⚠️ Declining non-standard variant: ${variantKey}`);
      try {
        await fetch(`https://lichess.org/api/challenge/${challenge.id}/decline`, {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({ reason: "variant" }),
        });
      } catch (e) {}
      return;
    }

    // Auto-accept standard incoming challenges from other users/bots
    try {
      const acceptRes = await fetch(`https://lichess.org/api/challenge/${challenge.id}/accept`, {
        method: "POST",
        headers: HEADERS,
        body: "{}",
      });

      if (acceptRes.ok) {
        console.log(`✅ Accepted challenge [ID: ${challenge.id}] from @${challengerName}!`);
      } else {
        const errText = await acceptRes.text();
        console.log(`❌ Could not accept challenge [ID: ${challenge.id}]: HTTP ${acceptRes.status} -> ${errText}`);
      }
    } catch (err) {
      console.error(`Error accepting challenge [ID: ${challenge.id}]:`, err.message);
    }
  } else if (event.type === "gameStart") {
    const gameId = event.game?.gameId || event.game?.id;
    if (gameId) {
      console.log(`\n♟️ GAME STARTED! Game ID: ${gameId}`);
      console.log(`👉 WATCH LIVE ON LICHESS BOARD: https://lichess.org/${gameId}`);
      playGame(gameId);
    }
  }
}

// 3. Play Game Loop (Stream Game State & Send Engine Moves)
async function playGame(gameId) {
  try {
    const response = await fetch(`https://lichess.org/api/bot/game/stream/${gameId}`, { headers: HEADERS });
    if (!response.ok) {
      console.error(`Failed to stream game ${gameId}:`, response.statusText);
      return;
    }

    let myColor = null;
    let engine = null;
    let buffer = "";

    const reader = response.body;

    reader.on("data", async (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const update = JSON.parse(line.trim());
          if (update.type === "gameFull") {
            const whiteName = update.white?.name || update.white?.id || "";
            myColor = whiteName.toLowerCase() === myBotUsername.toLowerCase() ? "white" : "black";
            
            console.log(`🎮 Game Setup: Playing as [${myColor.toUpperCase()}] against ${myColor === "white" ? update.black?.name : update.white?.name}`);

            engine = new EngineProcess(gameId, myColor, "hard");
            await engine.start();
            activeGames.set(gameId, { engine, myColor });

            const movesStr = update.state?.moves || "";
            processTurn(gameId, movesStr, myColor, engine);
          } else if (update.type === "gameState") {
            const movesStr = update.moves || "";
            if (activeGames.has(gameId)) {
              const { engine, myColor } = activeGames.get(gameId);
              processTurn(gameId, movesStr, myColor, engine);
            }
          }
        } catch (err) {
          console.error("Error processing game stream event:", err.message);
        }
      }
    });

    reader.on("end", async () => {
      console.log(`🏁 Game ${gameId} ended.`);
      if (activeGames.has(gameId)) {
        activeGames.get(gameId).engine.kill();
        activeGames.delete(gameId);
      }

      // Auto Loop Runner Trigger
      if (isLoopMode) {
        completedLoopGames++;
        console.log(`\n🏆 Progress: Completed ${completedLoopGames} / ${totalLoopTarget} Rated Games!`);
        if (completedLoopGames < totalLoopTarget) {
          const nextOpponent = loopOpponents[completedLoopGames % loopOpponents.length];
          console.log(`⏳ Waiting 5 seconds before starting Game ${completedLoopGames + 1} against @${nextOpponent}...`);
          setTimeout(() => {
            challengeTarget(nextOpponent, 3);
          }, 5000);
        } else {
          console.log(`\n🎉 CONGRATULATIONS! Finished all ${totalLoopTarget} Rated Games!`);
          console.log(`🏆 Check your established official rating on: https://lichess.org/@/${myBotUsername}`);
        }
      }
    });

  } catch (err) {
    console.error(`Error in game loop for ${gameId}:`, err.message);
  }
}

// Process Move & Calculate Engine Reply
async function processTurn(gameId, movesStr, myColor, engine) {
  const movesArr = movesStr ? movesStr.trim().split(" ") : [];
  const currentTurn = movesArr.length % 2 === 0 ? "white" : "black";

  if (currentTurn !== myColor) {
    // Waiting for opponent's move
    return;
  }

  console.log(`\n🧠 Engine thinking for game ${gameId} (Turn: ${myColor})...`);

  try {
    // Parse moves into {from, to, promotion}
    const formattedMoves = movesArr.map((m) => ({
      from: m.slice(0, 2),
      to: m.slice(2, 4),
      promotion: m.length > 4 ? m.slice(4, 5) : null,
    }));

    // Resync engine with move history and request best move
    await engine.sync(formattedMoves);
    const response = await engine.requestBestMove();

    if (response.type === "bestmove") {
      const bestMoveUCI = `${response.from}${response.to}${response.promotion || ""}`;
      console.log(`🎯 Engine proposed move: [${bestMoveUCI}]`);

      // Post move to Lichess API
      const moveRes = await fetch(`https://lichess.org/api/bot/game/${gameId}/move/${bestMoveUCI}`, {
        method: "POST",
        headers: HEADERS,
        body: "{}",
      });

      if (moveRes.ok) {
        console.log(`⚡ Played ${bestMoveUCI} on Lichess!`);
      } else {
        const errData = await moveRes.text();
        console.error(`❌ Failed to send move ${bestMoveUCI} to Lichess: ${moveRes.status} ${errData}`);
      }
    }
  } catch (err) {
    console.error(`❌ Engine move calculation error in ${gameId}:`, err.message);
  }
}

// Start Lichess Bot Service
(async () => {
  await checkAccount();

  const arg1 = process.argv[2];
  const arg2 = process.argv[3];

  if (arg1 && arg1.toLowerCase() === "loop") {
    isLoopMode = true;
    totalLoopTarget = arg2 ? parseInt(arg2, 10) : 12;
    console.log(`🔄 AUTO-LOOP RATING MODE ACTIVATED: Playing ${totalLoopTarget} Rated Games automatically!`);
    const initialOpponent = loopOpponents[0];
    await challengeTarget(initialOpponent, 3);
  } else if (arg1 && arg1.trim()) {
    const targetName = arg1.trim().replace(/^@/, "");
    await challengeTarget(targetName);
  }

  listenEvents();
})();
