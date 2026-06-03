import { v4 as uuidv4 } from 'uuid';
import GameManager from '../game/GameManager.js';

class MatchmakingQueue {
  constructor() {
    this.queues = {
      bullet: [],
      blitz:  [],
      rapid:  [],
    };

    this.EXPAND_INTERVAL = 5000;  // expand range every 5 s
    this.EXPAND_AMOUNT   = 50;    // rating points per expansion
    this.INITIAL_RANGE   = 200;   // starting rating range
    this.MAX_WAIT        = 30000; // after 30 s, match anyone
  }

  addPlayer(playerInfo) {
    const { socketId, format } = playerInfo;
    const queue = this.queues[format];
    if (!queue) return null;

    // Already queued?
    if (queue.find(p => p.socketId === socketId)) return null;

    playerInfo.joinedAt = Date.now();
    queue.push(playerInfo);

    return this.findMatch(socketId, format);
  }

  findMatch(socketId, format) {
    const queue  = this.queues[format];
    const player = queue.find(p => p.socketId === socketId);
    if (!player) return null;

    const waitTime   = Date.now() - player.joinedAt;
    const extraRange = Math.floor(waitTime / this.EXPAND_INTERVAL) * this.EXPAND_AMOUNT;
    const range      = waitTime >= this.MAX_WAIT
      ? Infinity
      : this.INITIAL_RANGE + extraRange;


    const opponent = queue.find(p => {
      if (p.socketId === socketId) return false;
      const ratingOk      = Math.abs(p.rating - player.rating) <= range;
      const timeControlOk = waitTime >= this.MAX_WAIT
        ? true
        : p.timeControl === player.timeControl;
      return ratingOk && timeControlOk;
    });

    if (!opponent) return null;

    this.queues[format] = queue.filter(
      p => p.socketId !== socketId && p.socketId !== opponent.socketId
    );

    // Randomly assign colours
    const [white, black] = Math.random() > 0.5
      ? [player, opponent]
      : [opponent, player];


    const timeControl = player.timeControl;
    const gameId      = uuidv4();


    GameManager.createGame(gameId, white, black, timeControl).catch(err =>
      console.error(`[Matchmaking] createGame failed for ${gameId}:`, err.message)
    );

    return { gameId, format, timeControl, players: { white, black } };
  }


  tick(io) {
    for (const format of ['bullet', 'blitz', 'rapid']) {

      const queue = [...this.queues[format]];
      for (const player of queue) {
        const match = this.findMatch(player.socketId, format);
        if (match) this._emitMatchFound(io, match);
      }
    }
  }

  _emitMatchFound(io, match) {
    const { gameId, format, timeControl, players } = match;

    io.sockets.sockets.get(players.white.socketId)?.join(gameId);
    io.sockets.sockets.get(players.black.socketId)?.join(gameId);

    io.to(players.white.socketId).emit('gameStart', {
      gameId,
      color:       'white',
      format,
      timeControl,
      opponent: { username: players.black.username, rating: players.black.rating },
    });

    io.to(players.black.socketId).emit('gameStart', {
      gameId,
      color:       'black',
      format,
      timeControl,
      opponent: { username: players.white.username, rating: players.white.rating },
    });

    // Start the server-side clock after both clients are notified
    GameManager.startTimer(gameId, io);

    console.log(`[Matchmaking] Game started: ${gameId} | Format: ${format} | Time: ${timeControl}ms`);
  }

  removePlayer(socketId) {
    for (const format of ['bullet', 'blitz', 'rapid']) {
      this.queues[format] = this.queues[format].filter(p => p.socketId !== socketId);
    }
  }

  getQueueLength(format) {
    return format
      ? this.queues[format]?.length ?? 0
      : Object.values(this.queues).reduce((a, q) => a + q.length, 0);
  }
}

export default new MatchmakingQueue();