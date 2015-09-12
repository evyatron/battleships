/**
 * Player module
 * @module server/Player
 */

var CONFIG = require('../shared/Config');
var EventDispatcher = require('../shared/EventDispatcher');
var utils = require('./Utils');

/**
 * Creates a new Player (client)
 *
 * @constructor
 * @param {Object} socket - The io socket the player is using
 * @param {Object} options - Settings for initializing the player
 */
function Player(socket, onDisconnected) {
  // Unique player id
  this.id = '';

  // Player name
  this.name = '';

  // Player avatar
  this.avatar = '';

  // The socket the player is using
  this.socket = socket;

  // All games player is part of
  this.games = {};

  // Callback for when player disconnected
  this.onDisconnected = onDisconnected || function(){};

  this.init();
}
console.warn(EventDispatcher)
Player.prototype = Object.create(EventDispatcher.prototype);
Player.prototype.constructor = Player;

Player.prototype.init = function init() {
  this.id = utils.createId('player');

  this.socket.on(CONFIG.FROM_CLIENT.PLAYER_READY, this.onClientReady.bind(this));
  this.socket.on(CONFIG.FROM_CLIENT.PLAYER_UPDATE, this.onUpdateData.bind(this));
  this.socket.on('disconnect', this.disconnect.bind(this));

  // Fire ready event to the client
  this.emit(CONFIG.TO_CLIENT.READY, {
    'id': this.id,
    'avatars': utils.getAvatars()
  });

  console.log('[' + this.id + '] Created');
};

Player.prototype.onUpdateData = function onUpdateData(data) {
  for (var k in data) {
    this[k] = data[k];
  }

  console.log('[' + this.id + '] Updated', data);

  this.emit(CONFIG.TO_CLIENT.PLAYER_UPDATE, this.getData());

  this.dispatch('updated');
};

Player.prototype.addToGame = function addToGame(game) {
  if (this.games[game.id]) {
    return false;
  }

  this.games[game.id] = game;

  console.log('[' + this.id + '] Added to game: [' + game.id + ']');

  return false;
};

Player.prototype.getData = function getData() {
  return {
    'id': this.id,
    'name': this.name,
    'avatar': this.avatar
  };
};

Player.prototype.onClientReady = function onClientReady() {
  console.log('[' + this.id + '] Ready on client');
};

// Player disconnected - remove from game
Player.prototype.disconnect = function disconnect() {
  console.log('[' + this.id + '] Disconnected');

  this.onDisconnected(this);
};

// Expose the socket's emit functionality
Player.prototype.emit = function emit() {
  if (this.socket) {
    this.socket.emit.apply(this.socket, arguments);
  }
};

// Expose the socket's on functionality
Player.prototype.on = function on(event, callback) {
  if (this.socket) {
    this.socket.on(event, function onEvent() {
      var args = Array.prototype.slice.call(arguments);
      args.splice(0, 0, this);
      callback.apply(this, args);
    }.bind(this));
  }
};

module.exports = Player;