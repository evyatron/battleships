/**
 * Utils module
 * @module server/Utils
 */

var CONFIG = require('../shared/Config');
var uuid = require('node-uuid');

module.exports = {
  'createId': function createId(prefix) {
    return (prefix? prefix + '-' : '') + uuid.v4();
  },

  'getAvatars': function getAvatars() {
    var avatars = [];

    for (var id in CONFIG.AVATARS) {
      avatars.push({
        'id': id,
        'src': CONFIG.AVATAR_BASE_SRC + CONFIG.AVATARS[id]
      });
    }

    return avatars;
  }
};