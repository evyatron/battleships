/**
 * Configuration for the entire project
 * @module Config
 * @type {Object}
 */
 (function CONFIG(scope) {
  var CONFIG = {
    GRID_SIZE: 64,
    BOARD_SIZE: 10,
    NUMBER_OF_PLAYERS: 2,

    FROM_CLIENT: {
      PLAYER_READY: 'PLAYER_READY',
      PLAYER_UPDATE: 'PLAYER_UPDATE',
      GAME_TAKE_TURN: 'GAME_TAKE_TURN',

      GAME_FIND: 'GAME_FIND',
      GAME_START: 'GAME_START',

      CHAT_NEW_MESSAGE: 'CHAT_NEW_MESSAGE'
    },

    TO_CLIENT: {
      READY: 'READY',

      GAME_FOUND: 'GAME_FOUND',
      GAME_IN_WARMUP: 'GAME_IN_WARMUP',
      GAME_STARTED: 'GAME_STARTED',
      GAME_NEXT_TURN: 'GAME_NEXT_TURN',

      PLAYER_UPDATE: 'PLAYER_UPDATE',

      CHAT_NEW_MESSAGE: 'CHAT_NEW_MESSAGE'
    },

    AVATAR_BASE_SRC: '/img/avatars/',
    AVATARS: [
      {
        'id': 'cornelius',
        'image': 'cornelius.jpg'
      },
      {
        'id': 'elvy',
        'image': 'elvy.jpg'
      },
      {
        'id': 'goss',
        'image': 'goss.jpg'
      },
      {
        'id': 'gregori',
        'image': 'gregori.jpg'
      },
      {
        'id': 'johner',
        'image': 'johner.jpg'
      },
      {
        'id': 'marie',
        'image': 'marie.jpg'
      },
      {
        'id': 'matilda',
        'image': 'matilda.jpg'
      },
      {
        'id': 'tyrain',
        'image': 'tyrain.jpg'
      },
      {
        'id': 'zhang',
        'image': 'zhang.jpg'
      }
    ],

    SHIP_BASE_SRC: '/img/ships/',
    SHIPS: [
      {
        'id': 'corvette',
        'name': 'Corvette',
        'width': 2,
        'height': 1,
        'image': 'corvette.png'
      },
      {
        'id': 'hunter',
        'name': 'Hunter',
        'width': 3,
        'height': 1,
        'image': 'hunter.png'
      },
      {
        'id': 'flagship',
        'name': 'Flagship',
        'width': 5,
        'height': 2,
        'image': 'flagship.png'
      }
    ],

    AI_PLAYERS: [
      {
        'name': 'Computerson',
        'avatar': 'cornelius'
      }
    ]
  };

  if (typeof module === 'undefined') {
    scope.CONFIG = CONFIG;
  } else {
    module.exports = CONFIG;
  }
}(typeof window === 'undefined'? null : window));