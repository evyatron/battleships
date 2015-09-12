var http = require('http');
var path = require('path');

var socketio = require('socket.io');
var express = require('express');

var CONFIG = require('./shared/Config');
var Player = require('./server/Player');
var GameManager = require('./server/GameManager');

var PORT = 3000;
var IP = '0.0.0.0';

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);

router.use(express.static(path.resolve(__dirname, 'client')));
router.use('/shared', express.static(path.resolve(__dirname, 'shared')));

var PLAYERS = {};
var gameManager = new GameManager();

function onPlayerConnected(socket) {
  var player = new Player(socket);
  PLAYERS[player.id] = player;

  player.on('disconnect', onPlayerDisconnected);
  player.on(CONFIG.FROM_CLIENT.GAME_FIND, onPlayerFindGame);
  player.on(CONFIG.FROM_CLIENT.GAME_START, onPlayerStartGame);
}

function onPlayerFindGame(player) {
  gameManager.findGameForPlayer(player);
}

function onPlayerStartGame(player, data) {
  gameManager.startNewGame(player);
}

function onPlayerDisconnected(player) {
  delete PLAYERS[player.id];
}


io.set('log level', 1);

io.on('connection', onPlayerConnected);

server.listen(process.env.PORT || PORT, process.env.IP || IP, function() {
  var addr = server.address();
  console.log('Server created, listening at', addr.address + ':' + addr.port);
});
