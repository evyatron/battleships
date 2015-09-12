/**
 * Game module
 * @module server/Game
 */

var CONFIG = require('../shared/Config');
var EventDispatcher = require('../shared/EventDispatcher');
var utils = require('./Utils');


/**
 * Creates a new Game
 *
 * @constructor
 * @param {Object} options - Settings for initializing the game
 */
function Game(options) {
  // Unique player id
  this.id = '';

  // Players in the game, and their boards
  this.players = [];

  // Max number of players in game
  this.numberOfPlayers = -1;

  // Index of the player whose turn it is
  this.turn = -1;

  // Current game state
  this.state = -1;

  this.STATES = {
    INVALID: -1,
    WAITING_FOR_PLAYERS: 0,
    WARM_UP: 1,
    IN_PROGRESS: 2,
    ENDED: 3
  };

  this.init(options);
}

Game.prototype = Object.create(EventDispatcher.prototype);
Game.prototype.constructor = Game;

Game.prototype.init = function init(options) {
  !options && (options = {});

  this.id = utils.createId('game');
  this.numberOfPlayers = options.numberOfPlayers || CONFIG.NUMBER_OF_PLAYERS;

  this.state = this.STATES.WAITING_FOR_PLAYERS;

  console.log('[' + this.id + '] Created');
};

Game.prototype.isWaitingForPlayers = function isWaitingForPlayers() {
  return this.state === this.STATES.WAITING_FOR_PLAYERS;
};

Game.prototype.addPlayer = function addPlayer(player) {
  if (this.players.indexOf(player) !== -1) {
    return false;
  }

  if (!this.isWaitingForPlayers()) {
    return false;
  }

  var board = new Board();

  this.players.push({
    'player': player,
    'isReady': false,
    'board': board
  });

  player.addToGame(this);


  player.emit(CONFIG.TO_CLIENT.GAME_FOUND, {
    'gameId': this.id,
    'players': this.getPlayersData(),
    'board': board.getData()
  });

  console.log('[' + this.id + '] Added player [' + player.id + ']');

  if (this.players.length === this.numberOfPlayers) {
    this.startWarmup();
  }

  return true;
};

Game.prototype.startWarmup = function startWarmup() {
  var isEveryoneReady = true;

  for (var i = 0, len = this.players.length; i < len; i++) {
    if (!this.players[i].isReady) {
      isEveryoneReady = false;
      break;
    }
  }

  if (isEveryoneReady) {
    this.start();
  } else if (this.state !== this.STATES.WARM_UP) {
    this.state = this.STATES.WARM_UP;

    for (var i = 0, len = this.players.length; i < len; i++) {
      var player = this.players[i];

      player.player.emit(CONFIG.TO_CLIENT.GAME_IN_WARMUP, {
        'gameId': this.id
      });
    }
  }
};

Game.prototype.start = function start() {
  if (this.state !== this.STATES.WARM_UP) {
    return false;
  }

  console.info('[' + this.id + '] Start game');

  this.state = this.STATES.IN_PROGRESS;
  this.turn = Math.floor(Math.random() * this.numberOfPlayers);

  this.emit(CONFIG.TO_CLIENT.GAME_STARTED, {
    'firstPlayer': this.players[this.turn].player.id
  });

  return true;
};

Game.prototype.nextTurn = function nextTurn() {
  this.turn++;

  if (this.turn >= this.players.length) {
    this.turn = 0;
  }

  var player = this.players[this.turn];

  this.emit(CONFIG.TO_CLIENT.GAME_NEXT_TURN, {
    'playerId': player.player.id
  });
};

Game.prototype.getPlayersData = function getPlayersData() {
  var data = [];

  for (var i = 0, len = this.players.length; i < len; i++) {
    data.push(this.players[i].player.getData());
  }

  return data;
};

Game.prototype.emit = function emit() {
  for (var i = 0, len = this.players.length; i < len; i++) {
    var player = this.players[i].player;
    player.emit.apply(player, arguments);
  }
};



function Board(size) {
  this.size = size || CONFIG.BOARD_SIZE;
  this.slots = [];

  this.init();
}

Board.prototype.init = function init() {
  this.create();
};

Board.prototype.getData = function getData() {
  return {
    'size': this.size
  };
};

Board.prototype.create = function create() {
  this.slots = [];

  for (var i = 0; i < this.size; i++) {
    var row = [];

    for (var j = 0; j < this.size; j++) {
      row.push(new BoardSlot());
    }

    this.slots.push(row);
  }
};


function BoardSlot() {
  this.isGuessed = false;
}

BoardSlot.prototype.guess = function guess() {
  if (this.isGuessed) {
    return false;
  }

  this.isGuessed = true;

  return true;
};


module.exports = Game;