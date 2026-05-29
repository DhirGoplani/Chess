import { v4 as uuidv4 } from 'uuid';
import GameManager from '../game/GameManager.js';

class MatchmakingQueue {
  constructor() {
    // 3 separate queues for each format
    this.queues = {
      bullet: [],
      blitz:  [],
      rapid:  []
    };

    // Expand rating range every 5 seconds
    this.EXPAND_INTERVAL  = 5000;
    this.EXPAND_AMOUNT    = 50;
    this.INITIAL_RANGE    = 200;
    this.MAX_WAIT         = 30000; // 30 seconds match anyone
  }

  // Player joins queue
  // playerInfo = { socketId, userId, username, rating, joinedAt, format }
  addPlayer(playerInfo) {
    const { socketId, format } = playerInfo;
    const queue = this.queues[format];
    if (!queue) return null;

    // Already in queue?
    if (queue.find(p => p.socketId === socketId)) return null;

    playerInfo.joinedAt = Date.now();
    queue.push(playerInfo);

    // Try to find a match
    return this.findMatch(socketId, format);
  }

  findMatch(socketId, format) {
    const queue = this.queues[format];
    const player = queue.find(p => p.socketId === socketId);
    if (!player) return null;

    // How long has this player been waiting?
    const waitTime = Date.now() - player.joinedAt;

    // Expand rating range based on wait time
    const extraRange = Math.floor(waitTime / this.EXPAND_INTERVAL) * this.EXPAND_AMOUNT;
    const range = waitTime >= this.MAX_WAIT
      ? Infinity  // after 30s match anyone
      : this.INITIAL_RANGE + extraRange;

    // Find best opponent within rating range
    const opponent = queue.find(p => {
      if (p.socketId === socketId) return false;
      return Math.abs(p.rating - player.rating) <= range;
    });

    if (!opponent) return null;

    // Match found — remove both from queue
    this.queues[format] = queue.filter(
      p => p.socketId !== socketId && p.socketId !== opponent.socketId
    );

    // Randomly assign colours
    const [white, black] = Math.random() > 0.5
      ? [player, opponent]
      : [opponent, player];

    const gameId = uuidv4();
   GameManager.createGame(gameId, white, black);

    return {
      gameId,
      format,
      players: {
        white,
        black
      }
    };
  }

  // Called every 5 seconds to retry unmatched players with expanded range
  tick(io) {
    for (const format of ['bullet', 'blitz', 'rapid']) {
      const queue = this.queues[format];
      for (const player of queue) {
        const match = this.findMatch(player.socketId, format);
        if (match) {
          this._emitMatchFound(io, match);
        }
      }
    }
  }

  _emitMatchFound(io, match) {
    const { gameId, format, players } = match;

    io.sockets.sockets.get(players.white.socketId)?.join(gameId);
    io.sockets.sockets.get(players.black.socketId)?.join(gameId);

    io.to(players.white.socketId).emit('gameStart', {
      gameId,
      color:    'white',
      format,
      opponent: { username: players.black.username, rating: players.black.rating }
    });

    io.to(players.black.socketId).emit('gameStart', {
      gameId,
      color:    'black',
      format,
      opponent: { username: players.white.username, rating: players.white.rating }
    });

    console.log(`[Matchmaking] Game started: ${gameId} | Format: ${format}`);
  }

  removePlayer(socketId) {
    for (const format of ['bullet', 'blitz', 'rapid']) {
      this.queues[format] = this.queues[format].filter(p => p.socketId !== socketId);
    }
  }

  getQueueLength(format) {
    return format ? this.queues[format]?.length ?? 0
                  : Object.values(this.queues).reduce((a, q) => a + q.length, 0);
  }
}

export default new MatchmakingQueue();