/**
 * Game module
 * @module server/Game
 */

var CONFIG = require('../shared/Config');
var EventDispatcher = require('../shared/EventDispatcher');
var utils = require('./Utils');
var Game = require('./Game');


/**
 * Creates a new GameManager
 *
 * @constructor
 */
function GameManager() {
  // Unique id
  this.id = '';

  // All games
  this.games = {};

  this.init();
}

GameManager.prototype = Object.create(EventDispatcher.prototype);
GameManager.prototype.constructor = GameManager;

GameManager.prototype.init = function init() {
  this.id = utils.createId('game-manager');

  console.log('[' + this.id + '] Created');
};

GameManager.prototype.findGameForPlayer = function findGameForPlayer(player) {
  var didFindGame = false;

  for (var id in this.games) {
    var game = this.games[id];

    if (game.isWaitingForPlayers()) {
      didFindGame = true;
      game.addPlayer(player);
      break;
    }
  }

  if (!didFindGame) {
    this.startNewGame(player);
  }
};

GameManager.prototype.startNewGame = function startNewGame(player) {
  console.log('[' + this.id + '] Create new game for [' + player.id + ']');
  var game = new Game({
    'numberOfPlayers': 1
  });

  this.games[game.id] = game;

  game.addPlayer(player);
};

module.exports = GameManager;