import { v4 as uuidv4 } from 'uuid';
import GameManager from '../game/GameManager.js';

class MatchmakingQueue{
    constructor(){
        this.queue=[];
    }

addPlayer(socketId){
    if(this.queue.includes(socketId))return null;
    this.queue.push(socketId);
    if(this.queue.length>=2){
        return this.createMatch();
    }
    return null;
}
createMatch(){
    const player1=this.queue.shift();
    const player2=this.queue.shift();
    const gameId=uuidv4();
    const game=GameManager.createGame(gameId,player1,player2);
    return {
        gameId,
        players:{
            white:player1,
            black : player2
        },
        game
    };
}
removePlayer(socketId){
    this.queue=this.queue.filter(id=>id!==socketId);

}
  getQueueLength() {
    return this.queue.length;
  }
}
export default new MatchmakingQueue();
