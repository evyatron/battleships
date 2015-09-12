/*global EventDispatcher*/
/*global CONFIG*/
/*global API*/
/*global utils*/
/*global DataStore*/
/*global ShipPlacer*/

var elContainer;

var api;

var game;
var localPlayer;
var otherPlayer;

var dataStore;

function init() {
  elContainer = document.querySelector('#container');

  dataStore = new DataStore();

  localPlayer = new LocalPlayer();

  playOffline();

  if (false) {
    api = new API();
  }
}

function playOffline() {
  if (game) {
    game.destroy();
  }

  if (!otherPlayer) {
    otherPlayer = new Player({
      'id': 'ai-player',
      'name': 'Opponent',
      'avatar': utils.random(dataStore.avatars).image,
      'isHuman': false,
      'isLocal': false
    });
  }

  game = new Game();
  elContainer.appendChild(game.el);

  game.on(game.START, onGameStarted);

  game.addPlayer(localPlayer);
  game.addPlayer(otherPlayer);

  game.startAnimation();
}

function playOnline() {
  console.warn('state online logic');
}

function onGameStarted(game) {
  var otherPlayerBoard = game.getPlayerBoard(otherPlayer);
  otherPlayerBoard.on(otherPlayerBoard.SLOT_CLICK, onClickOtherBoard);
}

function onClickOtherBoard(data) {
  if (game.isInProgress()) {
    if (game.isPlayerTurn(localPlayer)) {
      game.getPlayer(localPlayer).guess(data.board, data.slot.row, data.slot.col);
    } else {
      console.warn('not your turn')
    }
  }
}

(function DataStore(scope) {
  function DataStore() {
    this.ships = [];
    this.avatars = [];

    this.shipIdToIndex = {};
    this.avatarIdToIndex = {};

    this.init();
  }

  DataStore.prototype.init = function init() {
    var i, len;

    for (i = 0, len = CONFIG.SHIPS.length; i < len; i++) {
      var ship = new Object(CONFIG.SHIPS[i]);

      ship.image = CONFIG.SHIP_BASE_SRC + ship.image;

      this.shipIdToIndex[ship.id] = i;
      this.ships.push(ship);
    }

    for (i = 0, len = CONFIG.AVATARS.length; i < len; i++) {
      var avatar = new Object(CONFIG.AVATARS[i]);

      avatar.image = CONFIG.AVATAR_BASE_SRC + avatar.image;

      this.avatarIdToIndex[avatar.id] = i;
      this.avatars.push(avatar);
    }
  };

  DataStore.prototype.getShip = function getShip(id) {
    return this.ships[this.shipIdToIndex[id]];
  };

  DataStore.prototype.getAvatar = function getAvatar(id) {
    return this.avatars[this.avatarIdToIndex[id]];
  };

  DataStore.prototype.getShipObjects = function getShipObjects() {
    var ships = [];

    for (var i = 0, len = this.ships.length; i < len; i++) {
      ships.push(new Ship(this.ships[i]));
    }

    return ships;
  };

  if (typeof module === 'undefined') {
    scope.DataStore = DataStore;
  } else {
    module.exports = DataStore;
  }
}(typeof window === 'undefined'? null : window));

(function Game(scope) {
  var TEMPLATE = '<div class="game-state">' +
                    '<div class="status"></div>' +
                '</div>' +
                '<button class="ready disabled">Ready!</button>';

  function Game(options) {
    this.id = '';
    this.el = null;
    this.elState = null;
    this.players = [];

    this.state = -1;
    this.currentPlayer = -1;
    this.shipPlacer;

    this.START = 'start';
    this.END = 'end';

    this.STATES = {
      WAITING: 0,
      IN_PROGRESS: 1,
      ENDED: 2
    };

    this.STATE_NAMES = {};
    this.STATE_NAMES[this.STATES.WAITING] = 'Waiting for players...';
    this.STATE_NAMES[this.STATES.IN_PROGRESS] = 'In Progress';
    this.STATE_NAMES[this.STATES.ENDED] = 'Game Over!';

    this.init(options);
  }

  Game.prototype = Object.create(EventDispatcher.prototype);
  Game.prototype.constructor = Game;

  Game.prototype.init = function init(options) {
    this.id = 'game_' + Date.now();

    this.createHTML();
  };

  Game.prototype.destroy = function destroy(options) {
    for (var i = 0, len = this.players.length; i < len; i++) {
      this.players[i].destroy();
    }

    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  };

  Game.prototype.isPlayerTurn = function isPlayerTurn(player) {
    if (this.isInProgress()) {
      var currentPlayer = this.players[this.currentPlayer];

      if (currentPlayer && currentPlayer.player === player) {
        return true;
      }
    }

    return false;
  };

  Game.prototype.isInProgress = function isInProgress() {
    return this.state === this.STATES.IN_PROGRESS;
  };

  Game.prototype.startAnimation = function startAnimation() {
    this.animatePlayer(this.players[0], function onLocalAnimationDone() {
      this.animatePlayer(this.players[1], function onOtherAnimationEnd() {

        for (var i = 0, len = this.players.length; i < len; i++) {
          if (!this.players[i].player.isHuman) {
            this.players[i].randomiseShips();
          }
        }

        this.startWaiting();
      }.bind(this));
    }.bind(this));
  };

  Game.prototype.startWaiting = function startWaiting() {
    this.setState(this.STATES.WAITING);
  };

  Game.prototype.start = function start() {
    console.info('[' + this.id + '] Start');

    this.setState(this.STATES.IN_PROGRESS);

    this.el.classList.add('in-progress');

    this.shipPlacer.disable();

    this.dispatch(this.START, this);

    this.currentPlayer = Math.round(utils.random(0, this.players.length - 1));

    var player = this.players[this.currentPlayer];
    if (player) {
      player.setState(player.STATES.PLAYING);
    }
  };

  Game.prototype.nextTurn = function nextTurn() {
    var player = this.players[this.currentPlayer];
    if (player) {
      player.setState(player.STATES.WAITING);
    }

    this.currentPlayer++;

    if (this.currentPlayer >= this.players.length) {
      this.currentPlayer = 0;
    }

    console.info('[' + this.id + '] nextTurn:', this.currentPlayer);

    player = this.players[this.currentPlayer];
    if (player) {
      player.setState(player.STATES.PLAYING);
    }
  };

  Game.prototype.addPlayer = function addPlayer(player) {
    var playerEntry = new GamePlayer(this, player);

    this.players.push(playerEntry);

    this.el.appendChild(playerEntry.board.el);
    this.elState.appendChild(player.el);

    if (player.isLocal) {
      this.addLocalPlayer();
    }

    playerEntry.on(playerEntry.STATE_CHANGE, this.onPlayerStateChange.bind(this));
    playerEntry.on(playerEntry.GUESS, this.onPlayerGuess.bind(this));
  };

  Game.prototype.addLocalPlayer = function addLocalPlayer() {
    this.el.classList.add('has-local-player');

    this.shipPlacer = new ShipPlacer({
      'board': this.getLocalPlayer().board,
      'ships': dataStore.getShipObjects()
    });

    this.shipPlacer.on(this.shipPlacer.DONE, this.onDonePlacingShips.bind(this));

    this.elReady.addEventListener('click', this.onClickReady.bind(this));
  };

  Game.prototype.onPlayerGuess = function onPlayerGuess(data) {
    var player = data.player;
    var board = data.board;
    var row = data.row;
    var col = data.col;

    if (!board) {
      console.warn('No board to guess!', data);
      return false;
    }

    if (!board.canGuess(row, col)) {
      console.warn('cant guess');
      return;
    }

    board.markAsGuessed(row, col);
    var hasGameEnded = this.checkBoard(board);

    if (hasGameEnded) {
      this.setState(this.STATES.ENDED);

      this.dispatch(this.END, {
        'playerWon': player
      });
    } else {
      this.nextTurn();
    }

    return true;
  };

  Game.prototype.checkBoard = function checkBoard(board) {
    for (var shipId in board.shipsSlots) {
      if (board.shipsDown[shipId]) {
        continue;
      }

      var slots = board.shipsSlots[shipId];
      var isDown = true;

      for (var i = 0, len = slots.length; i < len; i++) {
        if (!slots[i].isGuessed) {
          isDown = false;
          break;
        }
      }

      if (isDown) {
        board.shipsDown[shipId] = true;
        board.revealShip(shipId);
      }
    }

    return Object.keys(board.shipsDown).length === Object.keys(board.shipsSlots).length;
  };

  Game.prototype.onPlayerStateChange = function onPlayerStateChange(player) {
    var isEveryoneReady = true;

    for (var i = 0, len = this.players.length; i < len; i++) {
      if (this.players[i].state !== this.players[i].STATES.READY) {
        isEveryoneReady = false;
        break;
      }
    }

    if (isEveryoneReady) {
      this.start();
    }
  };

  Game.prototype.getPlayerBoard = function getPlayerBoard(player) {
    var playerEntry = this.getPlayer(player);
    return playerEntry? playerEntry.board : null;
  };

  Game.prototype.getPlayer = function getPlayer(player) {
    for (var i = 0, len = this.players.length; i < len; i++) {
      if (this.players[i].player === player) {
        return this.players[i];
      }
    }

    return null;
  };

  Game.prototype.getLocalPlayer = function getLocalPlayer() {
    for (var i = 0, len = this.players.length; i < len; i++) {
      if (this.players[i].player.isLocal) {
        return this.players[i];
      }
    }

    return null;
  };

  Game.prototype.getPlayers = function getPlayers() {
    return this.players;
  };

  Game.prototype.setState = function setState(state) {
    if (state === this.state) {
     return;
    }

    console.log('[' + this.id + '] Set State: ', state);

    this.el.classList.remove('state-' + this.state);
    this.state = state;
    this.elState.querySelector('.status').innerHTML = this.STATE_NAMES[state];
    this.el.classList.add('state-' + this.state);
  };

  Game.prototype.onClickReady = function onClickReady(e) {
    if (this.shipPlacer.isDone) {
      var localPlayerEntry = game.getLocalPlayer();
      if (localPlayerEntry) {
        localPlayerEntry.ready();
      }
    }
  };

  Game.prototype.onDonePlacingShips = function onDonePlacingShips() {
    this.elReady.classList.remove('disabled');
  };

  Game.prototype.animatePlayer = function animatePlayer(player, callback) {
    var el = player.player.el;
    var bounds = el.getBoundingClientRect();
    var yTarget = bounds.top;
    var xTarget = bounds.left;
    var ySource = window.innerHeight / 2 - bounds.height / 2;
    var xSource = window.innerWidth / 2 - bounds.width / 2;
    var duration = 500;

    // place at centre of screen
    el.style.cssText = 'position: fixed; top: 0; left: 0; transform: translate(' + xSource + 'px, ' + ySource + 'px) scale(2.5);';

    // enable transition
    el.offsetWidth;
    el.style.transition = 'transform ' + duration + 'ms cubic-bezier(1, 0, 1, 1)';
    el.classList.add('visible');

    // scale down
    el.offsetWidth;
    el.style.transform = 'translate(' + xSource + 'px, ' + ySource + 'px) scale(1)';

    window.setTimeout(function() {
      el.addEventListener('webkitTransitionEnd', function onTransitionEnd(e) {
        e.target.removeEventListener('webkitTransitionEnd', onTransitionEnd);
        // enable transition
        e.target.offsetWidth;
        el.style.cssText = '';


        window.setTimeout(callback, duration * 1.25);
      });

      // enable transition
      el.style.transition = 'transform ' + duration + 'ms ease-in-out';
      el.offsetWidth;
      el.style.transform = 'translate(' + xTarget + 'px, ' + yTarget + 'px) scale(1)';
    }, duration * 1.5);
  };

  Game.prototype.createHTML = function createHTML() {
    this.el = document.createElement('div');
    this.el.className = 'game';
    this.el.innerHTML = TEMPLATE.format(this);

    this.elState = this.el.querySelector('.game-state');
    this.elReady = this.el.querySelector('button.ready');
  };

  if (typeof module === 'undefined') {
    scope.Game = Game;
  } else {
    module.exports = Game;
  }
}(typeof window === 'undefined'? null : window));

var GamePlayer = (function GamePlayer() {
  function GamePlayer(game, player) {
    this.game = game;
    this.player = player;
    this.board = null;

    this.state;

    this.STATE_CHANGE = 'stateChange';
    this.GUESS = 'guess';

    this.STATES = {
      PLACING_SHIPS: 1,
      READY: 2,
      WAITING: 3,
      PLAYING: 4
    };

    this.STATE_NAMES = {};
    this.STATE_NAMES[this.STATES.PLACING_SHIPS] = 'Preparing Battlefield';
    this.STATE_NAMES[this.STATES.READY] = 'Waiting for game to start...';
    this.STATE_NAMES[this.STATES.WAITING] = 'Waiting for other player...';
    this.STATE_NAMES[this.STATES.PLAYING] = 'Playing';

    this.init();
  }

  GamePlayer.prototype = Object.create(EventDispatcher.prototype);
  GamePlayer.prototype.constructor = GamePlayer;

  GamePlayer.prototype.init = function init() {
    this.setState(this.STATES.PLACING_SHIPS);

    this.createBoard();
  };

  GamePlayer.prototype.randomiseShips = function randomiseShips() {
    this.board.placeAtRandom([
      new Ship(dataStore.getShip('hunter'))
    ]);

    this.ready();
  };

  GamePlayer.prototype.destroy = function destroy() {
    if (this.board) {
      this.board.destroy();
    }
  };

  GamePlayer.prototype.guess = function guess(board, row, col) {
    this.dispatch(this.GUESS, {
      'player': this,
      'board': board,
      'row': row,
      'col': col
    });
  };

  GamePlayer.prototype.setState = function setState(state) {
    if (this.state === state) {
      return false;
    }

    this.state = state;
    this.player.updateStatus(this.STATE_NAMES[state]);
    this.dispatch(this.STATE_CHANGE, this);

    if (!this.player.isHuman && this.state === this.STATES.PLAYING) {
      window.setTimeout(this.aiGuess.bind(this), utils.random(400, 1300));
    }

    return true;
  };

  GamePlayer.prototype.aiGuess = function aiGuess() {
    var players = this.game.getPlayers();
    var board = null;
    var didGuess = false;

    for (var i = 0, len = players.length; i < len; i++) {
      if (players[i] !== this) {
        board = players[i].board;
      }
    }

    while (!didGuess) {
      var row = Math.round(utils.random(0, board.size - 1));
      var col = Math.round(utils.random(0, board.size - 1));
      var slot = board.getSlotAt(row, col);

      if (slot.canGuess()) {
        this.guess(board, row, col);
        didGuess = true;
      }
    }
  };

  GamePlayer.prototype.ready = function ready() {
    if (this.state === this.STATES.PLACING_SHIPS) {
      this.setState(this.STATES.READY);
    }
  };

  GamePlayer.prototype.onBoardPlaceShip = function onBoardPlaceShip(data) {
    if (this.player.isLocal) {
      this.board.revealShip(data.ship.id);
    }
  };

  GamePlayer.prototype.createBoard = function createBoard() {
    this.board = new Board();

    this.board.on(this.board.PLACE_SHIP, this.onBoardPlaceShip.bind(this));

    this.board.el.classList.add('local-' + this.player.isLocal);
  };

  return GamePlayer;
}());

var Board = (function Board() {
  function Board(options) {
    this.el;
    this.elShips;
    this.elSlots;
    this.space;

    this.size = -1;
    this.slots = [];
    this.ships = {};
    this.shipsPositions = {};
    this.shipsDown = {};

    this.shipsSlots = {};

    this.SLOT_CLICK = 'slotClick';
    this.SLOT_OVER = 'slotOver';
    this.SLOT_OUT = 'slotOut';

    this.init(options);
  }

  Board.prototype = Object.create(EventDispatcher.prototype);
  Board.prototype.constructor = Board;

  Board.prototype.init = function init(options) {
    !options && (options = {});

    this.size = options.size || CONFIG.BOARD_SIZE;

    this.createHTML();

    this._onClick = this.onClick.bind(this);
    this._onOver = this.onOver.bind(this);

    this.el.addEventListener('click', this._onClick);
    this.el.addEventListener('mouseover', this._onOver);

    window.setTimeout(this.space.start.bind(this.space), 0);
  };

  Board.prototype.destroy = function destroy() {
    this.el.removeEventListener('click', this._onClick);
    this.el.removeEventListener('mouseover', this._onOver);

    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  };

  Board.prototype.onOver = function onOver(e) {
    var elSlot = e.target;
    if (!elSlot.classList.contains('slot')) {
      return;
    }

    var slot = this.slots[elSlot.dataset.row][elSlot.dataset.col];
    if (!slot) {
      return;
    }

    (function(board, slot, elSlot) {
      elSlot.addEventListener('mouseout', function onMouseOut(e) {
        elSlot.removeEventListener('mouseout', onMouseOut);
        board.dispatch(board.SLOT_OUT, slot);
      });
    }(this, slot, elSlot));

    this.dispatch(this.SLOT_OVER, slot);
  };

  Board.prototype.onClick = function onClick(e) {
    var elClicked = e.target;
    if ('row' in elClicked.dataset && 'col' in elClicked.dataset) {
      var slot = this.slots[elClicked.dataset.row][elClicked.dataset.col];

      if (slot) {
        this.dispatch(this.SLOT_CLICK, {
          'board': this,
          'slot': slot
        });
      }
    }
  };

  Board.prototype.canGuess = function canGuess(row, col) {
    var slot = this.getSlotAt(row, col);
    return slot && !slot.isGuessed;
  };

  Board.prototype.markAsGuessed = function markAsGuessed(row, col) {
    var slot = this.getSlotAt(row, col);

    if (slot) {
      slot.markAsGuessed();
    }

    return slot;
  };

  Board.prototype.placeAtRandom = function placeAtRandom(ships) {
    var i = 0;
    var board = this;

    function placeNextShip() {
      var row = Math.round(Math.random() * (board.size - 1));
      var col = Math.round(Math.random() * (board.size - 1));
      var didPlace = board.placeShipAt(ships[i], row, col, Math.random() > 0.5);

      if (didPlace) {
        i++;
      }

      if (i < ships.length) {
        window.setTimeout(placeNextShip, utils.random(300, 1000));
      }
    }

    placeNextShip();
  };

  Board.prototype.placeShipAt = function placeShipAt(ship, row, col, isVertical) {
    var canPlaceShip = this.canPlaceShipAt(ship, row, col, isVertical);

    if (canPlaceShip) {
      var range = this.getShipSlots(ship, row, col, isVertical);
      this.shipsSlots[ship.id] = [];

      this.onSlots(range, function placeShip(slot) {
        slot.setShip(ship);
        this.shipsSlots[ship.id].push(slot);
      }.bind(this));

      this.dispatch(this.PLACE_SHIP, {
        'ship': ship,
        'row': row,
        'col': col,
        'isVertical': isVertical
      });

      this.ships[ship.id] = ship;
      this.shipsPositions[ship.id] = {
        'row': row,
        'col': col,
        'isVertical': isVertical
      };
    }

    return canPlaceShip;
  };

  Board.prototype.revealShip = function revealShip(shipId) {
    var ship = this.ships[shipId];
    if (ship) {
      var shipPosition = this.shipsPositions[shipId];
      if (shipPosition) {
        ship.position(shipPosition.row, shipPosition.col, shipPosition.isVertical);
        this.elShips.appendChild(ship.el);
      }
    }
  };

  Board.prototype.getShipSlots = function getShipSlots(ship, row, col, isVertical) {
    var width = (isVertical? ship.height : ship.width) - 1;
    var height = (isVertical? ship.width : ship.height) - 1;

    return {
      'row': {
        'from': row,
        'to': row + height
      },
      'col': {
        'from': col,
        'to': col + width
      }
    };
  };

  Board.prototype.canPlaceShipAt = function canPlaceShipAt(ship, row, col, isVertical) {
    var range = this.getShipSlots(ship, row, col, isVertical);
    var isFree = true;

    for (var i = range.row.from; i <= range.row.to; i++) {
      for (var j = range.col.from; j <= range.col.to; j++) {
        var slot = (this.slots[i] || [])[j];

        if (!slot || !slot.isFree()) {
          isFree = false;
          break;
        }
      }

      if (!isFree) {
        break;
      }
    }

    return isFree;
  };

  Board.prototype.getSlotAt = function getSlotAt(row, col) {
    return this.slots[row][col];
  };

  Board.prototype.onSlots = function onSlots(range, action) {
    for (var i = range.row.from; i <= range.row.to; i++) {
      for (var j = range.col.from; j <= range.col.to; j++) {
        action.call(this, this.slots[i][j]);
      }
    }
  };

  Board.prototype.createHTML = function createHTML() {
    this.el = document.createElement('div');
    this.el.className = 'board';
    this.el.innerHTML = '<div class="side up"></div>' +
                        '<div class="side down"></div>' +
                        '<div class="side left"></div>' +
                        '<div class="side right"></div>' +
                        '<div class="bottom"></div>' +
                        '<canvas></canvas>' +
                        '<div class="slots"></div>' +
                        '<div class="ships"></div>';


    this.elShips = this.el.querySelector('.ships');
    this.elSlots = this.el.querySelector('.slots');

    for (var i = 0; i < this.size; i++) {
      var row = [];
      var elRow = document.createElement('div');
      elRow.classList.add('row');

      for (var j = 0; j < this.size; j++) {
        var slot = new BoardSlot({
          'row': i,
          'col': j
        });

        row.push(slot);

        elRow.appendChild(slot.el);
      }

      this.elSlots.appendChild(elRow);
      this.slots.push(row);
    }

    this.space = new Space({
      'el': this.el.querySelector('canvas')
    });
  };

  return Board;
}());

var BoardSlot = (function BoardSlot() {
  function BoardSlot(options) {
    this.el;
    this.row = -1;
    this.col = -1;
    this.x = 0;
    this.y = 0;

    this.isGuessed = false;
    this.shipId = '';

    this.init(options);
  }

  BoardSlot.prototype.init = function init(options) {
    this.row = options.row;
    this.col = options.col;
    this.x = this.col * CONFIG.GRID_SIZE;
    this.y = this.row * CONFIG.GRID_SIZE;

    this.createHTML();
  };

  BoardSlot.prototype.markAsGuessed = function markAsGuessed() {
    this.isGuessed = true;
    this.el.classList.add('guessed');
  };

  BoardSlot.prototype.canGuess = function canGuess() {
    return !this.isGuessed;
  };

  BoardSlot.prototype.setShip = function setShip(ship) {
    this.shipId = ship.id;
    this.el.classList.remove('free');
  };

  BoardSlot.prototype.removeShip = function removeShip() {
    this.shipId = '';
    this.el.classList.add('free');
  };

  BoardSlot.prototype.isFree = function isFree() {
    return this.shipId === '';
  };

  BoardSlot.prototype.createHTML = function createHTML() {
    this.el = document.createElement('b');
    this.el.className = 'slot free';
    this.el.dataset.row = this.row;
    this.el.dataset.col = this.col;
    this.el.style.width = CONFIG.GRID_SIZE + 'px';
    this.el.style.height = CONFIG.GRID_SIZE + 'px';
  };

  return BoardSlot;
}());

var Ship = (function Ship() {
  var TEMPLATE = '<span class="image" style="background-image: url(\'{{image}}\');"></span>' +
                 '<span class="name">{{name}}</span>' +
                 '<span class="size">{{width}}x{{height}}</span>';

  function Ship(options) {
    if (options instanceof Ship) {
      options = options.data;
    }

    this.el;

    this.id = '';
    this.name = '';
    this.image = '';

    this.width = 0;
    this.height = 0;

    this.data = null;

    this.init(options);
  }

  Ship.prototype.init = function init(options) {
    !options && (options = {});

    this.id = options.id || 'ship-' + Date.now();
    this.name = options.name || this.id;
    this.image = options.image;
    this.width = options.width || 1;
    this.height = options.height || 1;

    this.data = options;

    this.createHTML();
  };

  Ship.prototype.position = function position(row, col, isVertical) {
    var top = row * CONFIG.GRID_SIZE;
    var left = col * CONFIG.GRID_SIZE;

    this.el.style.top = top + 'px';
    this.el.style.left = left + 'px';
    this.el.dataset.row = row;
    this.el.dataset.col = col;

    if (isVertical) {
      this.el.style.transformOrigin = (this.height ) * CONFIG.GRID_SIZE / 2 + 'px ' + (this.height ) * CONFIG.GRID_SIZE / 2 + 'px';
      this.el.classList.add('vertical');
    } else {
      this.el.classList.remove('vertical');
    }
  };

  Ship.prototype.createHTML = function createHTML() {
    var width = this.width * CONFIG.GRID_SIZE;
    var height = this.height * CONFIG.GRID_SIZE;

    this.el = document.createElement('div');
    this.el.innerHTML = TEMPLATE.format(this);
    this.el.dataset.id = this.id;
    this.el.dataset.width = this.width;
    this.el.dataset.height = this.height;
    this.el.className = 'ship ' + this.id;
    this.el.style.width = width + 'px';
    this.el.style.height = height + 'px';
  };

  return Ship;
}());

var Space = (function Space() {
  function Space(options) {
    this.elCanvas;
    this.context;

    this.width = 0;
    this.height = 0;
    this.numberOfStars = 0;
    this.stars = [];

    this.lastUpdate = 0;
    this.isActive = false;

    this.minSize;
    this.maxSize;
    this.minBrightness;
    this.maxBrightness;
    this.minShineSpeed = 1;
    this.maxShineSpeed = 3.5;
    this.minShineDelay = 1;
    this.maxShineDelay = 60;

    this.DEFAULT_DENSITY = 0.1;
    this.DEFAULT_MIN_SIZE = 1;
    this.DEFAULT_MAX_SIZE = 3;
    this.DEFAULT_MIN_BRIGHTNESS = 0.2;
    this.DEFAULT_MAX_BRIGHTNESS = 0.7;

    this.init(options);
  }

  Space.prototype.init = function init(options) {
    this.elCanvas = options.el;
    this.context = this.elCanvas.getContext('2d');
    this.density = options.density || this.DEFAULT_DENSITY;
    this.minSize = options.minSize || this.DEFAULT_MIN_SIZE;
    this.maxSize = options.maxSize || this.DEFAULT_MAX_SIZE;
    this.minBrightness = options.minBrightness || this.DEFAULT_MIN_BRIGHTNESS;
    this.maxBrightness = options.maxBrightness || this.DEFAULT_MAX_BRIGHTNESS;

    if (this.elCanvas.parentNode) {
      this.elCanvas.parentNode.classList.add('has-space');
    }
  };

  Space.prototype.start = function start() {
    if (!this.isActive) {
      if (this.numberOfStars === 0) {
        this.createStars();
      }

      this.isActive = true;
      this.lastUpdate = Date.now();
      window.requestAnimationFrame(this.tick.bind(this));
    }

    return this;
  };

  Space.prototype.stop = function stop() {
    this.isActive = false;
    return this;
  };

  Space.prototype.tick = function tick() {
    if (!this.isActive) {
      return;
    }

    var now = Date.now(),
        dt = (now - this.lastUpdate) / 1000;

    this.context.clearRect(0, 0, this.width, this.height);

    for (var i = 0, star; i < this.numberOfStars; i++) {
      star = this.stars[i];

      if (star.timeUntilShine <= 0) {
        if (!star.isShining && !star.isDawning) {
          star.isShining = true;
        }

        if (star.isShining) {
          star.brightness += star.shineSpeed * dt;

          if (star.brightness >= star.shineBrightness) {
            star.brightness = star.shineBrightness;
            star.isShining = false;
            star.isDawning = true;
          }
        } else if (star.isDawning) {
          star.brightness -= star.shineSpeed * dt;

          if (star.brightness <= star.restingBrightness) {
            star.brightness = star.restingBrightness;
            star.isShining = false;
            star.isDawning = false;

            star.timeUntilShine = utils.random(this.minShineDelay, this.maxShineDelay);
            star.shineBrightness = Math.min(star.restingBrightness * utils.random(1.2, 2), 1);
            star.shineSpeed = utils.random(this.minShineSpeed, this.maxShineSpeed);
          }
        }
      } else {
        star.timeUntilShine -= dt;
      }

      this.context.fillStyle = 'rgba(255, 255, 255, ' + star.brightness + ')';
      this.context.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
    }

    this.lastUpdate = now;
    window.requestAnimationFrame(this.tick.bind(this));
  };

  Space.prototype.createStars = function createStars() {
    var elParent = this.elCanvas.parentNode;

    this.elCanvas.width = this.width = elParent.offsetWidth;
    this.elCanvas.height = this.height = elParent.offsetHeight;
    this.numberOfStars = Math.round(this.width * this.height * this.density / 100);

    for (var i = 0; i < this.numberOfStars; i++) {
      var brightness = utils.random(this.minBrightness, this.maxBrightness);

      this.stars.push({
        'x': utils.random(0, this.width),
        'y': utils.random(0, this.height),
        'size': Math.round(utils.random(this.minSize, this.maxSize)),
        'brightness': brightness,
        'restingBrightness': brightness,
        'shineBrightness': Math.min(brightness * utils.random(1.2, 2), 1),
        'timeUntilShine': utils.random(this.minShineDelay, this.maxShineDelay),
        'shineSpeed': utils.random(this.minShineSpeed, this.maxShineSpeed)
      });
    }
  };

  return Space;
}());

// demo for creating a special ship with additional functionality
var Corvette = (function Corvette() {
  function Corvette() {
    this.init(CONFIG.SHIPS.CORVETTE);
  }

  Corvette.prototype = Object.create(Ship.prototype);
  Corvette.prototype.constructor = Corvette;

  return Corvette;
}());

var Player = (function Player() {
  var TEMPLATE = '<div class="avatar" style="background-image: url(\'{{avatar}}\');"></div>' +
                 '<div class="content">' +
                   '<div class="name">{{name}}</div>' +
                   '<div class="status">{{status}}</div>' +
                 '</div>';

  function Player(options) {
    this.el;

    this.id = '';
    this.name = '';
    this.avatar = '';
    this.status = '';

    this.isHuman = false;
    this.isLocal = false;

    this.init(options);
  }

  Player.prototype = Object.create(EventDispatcher.prototype);
  Player.prototype.constructor = Player;

  Player.prototype.init = function init(options) {
    !options && (options = {});

    this.id = options.id || 'player_' + Date.now();
    this.isHuman = Boolean(options.isHuman);
    this.isLocal = Boolean(options.isLocal);

    this.createHTML();

    this.update(options);
  };

  Player.prototype.update = function update(data) {
    for (var k in data) {
      this[k] = data[k];
    }

    this.el.innerHTML = TEMPLATE.format(this);
  };

  Player.prototype.updateStatus = function updateStatus(status) {
    this.update({
      'status': status
    });
  };

  Player.prototype.createHTML = function createHTML() {
    this.el = document.createElement('div');
    this.el.className = 'player';
    this.el.dataset.id = this.id;

    this.el.classList.add('local-' + this.isLocal);
    this.el.classList.add('human-' + this.isHuman);
  };

  return Player;
}());

var LocalPlayer = (function LocalPlayer() {
  function LocalPlayer(options) {
    !options && (options = {});

    options.id = 'local-player';
    options.name = utils.storage.get('playerName') || '';
    options.avatar = utils.storage.get('playerAvatar') || '';
    options.isHuman = true;
    options.isLocal = true;

    this.DEFAULT_NAME = 'You';

    this.init(options);
  }

  LocalPlayer.prototype = Object.create(Player.prototype);
  LocalPlayer.prototype.constructor = LocalPlayer;

  LocalPlayer.prototype.init = function init(options) {
    Player.prototype.init.apply(this, arguments);

    this.el.querySelector('.avatar').dataset.changeAvatar = true;

    if (!this.name) {
      this.update({
        'name': this.DEFAULT_NAME
      });
    }
    if (!this.avatar) {
      this.update({
        'avatar': utils.random(dataStore.avatars).image
      });
    }

    this.avatarSelector = new AvatarSelector({
      'avatars': dataStore.avatars
    });
    this.avatarSelector.on('selected', this.onAvatarSelected.bind(this));

    document.body.appendChild(this.avatarSelector.el);

    document.body.addEventListener('click', this.onDocumentClick.bind(this));
  };

  LocalPlayer.prototype.update = function update(data) {
    Player.prototype.update.apply(this, arguments);

    utils.storage.set('playerName', this.name);
    utils.storage.set('playerAvatar', this.avatar);
  };

  LocalPlayer.prototype.onDocumentClick = function onDocumentClick(e) {
    var elClicked = e.target;

    if (elClicked.classList.contains('avatar')) {
      this.avatarSelector.toggle();
    }
  };

  LocalPlayer.prototype.onAvatarSelected = function onAvatarSelected(avatar) {
    this.update({
      'avatar': avatar.image
    });
  };

  return LocalPlayer;
}());

var AvatarSelector = (function AvatarSelector() {
  var TEMPLATE = '<span class="image" style="background-image: url(\'{{image}}\');"></span>';

  function AvatarSelector(options) {
    this.el;
    this.elList;

    this.selected = '';

    this.avatars = [];

    this.init(options);
  }

  AvatarSelector.prototype = Object.create(EventDispatcher.prototype);
  AvatarSelector.prototype.constructor = AvatarSelector;

  AvatarSelector.prototype.init = function init(options) {
    this.createHTML();

    if (options.avatars) {
      this.add(options.avatars);
    }

    this.el.addEventListener('click', this.onClick.bind(this));
  };

  AvatarSelector.prototype.show = function show() {
    this.el.classList.add('visible');
  };

  AvatarSelector.prototype.hide = function hide() {
    this.el.classList.remove('visible');
  };

  AvatarSelector.prototype.toggle = function toggle() {
    this.el.classList.toggle('visible');
  };

  AvatarSelector.prototype.add = function add(avatars) {
    for (var i = 0, len = avatars.length; i < len; i++) {
      var avatar = avatars[i];

      if (this.avatars.indexOf(avatar) !== -1) {
        continue;
      }

      var el = document.createElement('li');
      el.dataset.id = avatar.id;
      el.innerHTML = TEMPLATE.format(avatar);

      this.elList.appendChild(el);
    }
  };

  AvatarSelector.prototype.select = function select(id) {
    if (this.selected === id) {
      return;
    }

    this.selected = id;

    this.onSelect(id);

    this.dispatch('selected', dataStore.getAvatar(id));
  };

  AvatarSelector.prototype.onSelect = function onSelect() {
    var elSelected = this.el.querySelector('.selected');
    var elNew = this.el.querySelector('[data-id = "' + this.selected + '"]');

    if (elSelected) {
      elSelected.classList.remove('selected');
    }
    if (elNew) {
      elNew.classList.add('selected');
    }
  };

  AvatarSelector.prototype.onClick = function onClick(e) {
    var el = e.target;
    if (el.dataset.id) {
      this.select(el.dataset.id);
    }
  };

  AvatarSelector.prototype.createHTML = function createHTML() {
    this.el = document.createElement('div');
    this.el.className = 'avatars';
    this.el.innerHTML = '<ul></ul>';

    this.elList = this.el.querySelector('ul');
  };

  return AvatarSelector;
}());

window.addEventListener('load', init);