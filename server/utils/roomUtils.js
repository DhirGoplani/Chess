const { v4: uuidv4 } = require('uuid');

const generateRoomId = () => {
  return `game_${uuidv4()}`;
};
const assignColors = () => {
  return Math.random() > 0.5 
    ? { player1: 'white', player2: 'black' }
    : { player1: 'black', player2: 'white' };
};

module.exports = { generateRoomId, assignColors };