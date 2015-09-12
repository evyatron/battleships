var API = (function API() {
  function API() {
    this.socket;
    this.isConnected = false;

    this.requestsQueue = [];
    this.callbacksQueue = [];
  }

  API.prototype.init = function init(options) {

  };

  API.prototype.guess = function guess(x, y) {
    this.request(CONFIG.FROM_CLIENT.GAME_TAKE_TURN, {
      'x': x,
      'y': y
    });
  };

  API.prototype.ready = function ready() {
    this.request(CONFIG.FROM_CLIENT.PLAYER_READY);
  };

  API.prototype.findGame = function findGame() {
    this.request(CONFIG.FROM_CLIENT.GAME_FIND);
  };

  API.prototype.startGame = function startGame(isPrivate) {
    this.request(CONFIG.FROM_CLIENT.GAME_START, {
      'isPrivate': Boolean(isPrivate)
    });
  };

  API.prototype.updatePlayer = function updatePlayer(data) {
    this.request(CONFIG.FROM_CLIENT.PLAYER_UPDATE, data);
  };

  API.prototype.on = function on(message, callback) {
    if (!CONFIG.TO_CLIENT[message]) {
      console.warn('Trying to listen to invalid event:', message, callback);
      return false;
    }

    if (!this.isConnected) {
      this.callbacksQueue.push(arguments);
      this.connect();
      return true;
    }

    console.log('[API] Listen to:', message);
    this.socket.on(message, callback);

    return true;
  };

  API.prototype.request = function request(action, data) {
    if (!CONFIG.FROM_CLIENT[action]) {
      return false;
    }

    if (!this.isConnected) {
      this.requestsQueue.push(arguments);
      this.connect();
      return true;
    }

    console.log('[API][' + action + ']', data);

    this.socket.emit(action, data);

    return true;
  };

  API.prototype.onConnect = function onConnect() {
    this.isConnected = true;

    var i;
    var len;

    for (i = 0, len = this.requestsQueue.length; i < len; i++) {
      this.request.apply(this, this.requestsQueue[i]);
    }
    for (i = 0, len = this.callbacksQueue.length; i < len; i++) {
      this.on.apply(this, this.callbacksQueue[i]);
    }

    this.requestsQueue = [];
    this.callbacksQueue = [];
  };

  API.prototype.connect = function connect() {
    if (!this.isConnected) {
      this.socket = io.connect();
      this.socket.on('connect', this.onConnect.bind(this));
    }
  };

  return API;
}());