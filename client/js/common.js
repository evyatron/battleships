// TODO: do
var l10n = {

};


(function utils(scope) {
  var utils = {
    random: function random() {
      var args = arguments;
      var result;

      if (typeof args[0] === 'number' && typeof args[1] === 'number') {
        result = Math.random() * (args[1] - args[0]) + args[0];
      } else if (Array.isArray(args[0])) {
        result = args[0][Math.floor(utils.random(0, args[0].length))];
      } else if (typeof args[0] === 'object') {
        var keys = Object.keys(args[0]);
        result = args[utils.random(keys)];
      }

      return result;
    },

    getMatchedParent: function getMatchedParent(el, selector) {
      while (el) {
        if (utils.elMatchesSelector(el, selector)) {
          return el;
        } else {
          el = el.parentNode;
        }
      }

      return null;
    },

    elMatchesSelector: function elMatchesSelector(el, selector) {
      return el.matches? el.matches(selector) :
             el.mozMatchesSelector? el.mozMatchesSelector(selector) :
             el.msMatchesSelector? el.msMatchesSelector(selector) :
             null;
    },

    storage: {
      get: function get(key) {
        return localStorage[key];
      },
      set: function set(key, value) {
        localStorage[key] = value;
      }
    }
  };

  if (typeof module === 'undefined') {
    scope.utils = utils;
  } else {
    module.exports = utils;
  }
}(typeof window === 'undefined'? null : window));

// A template formatting method
// Replaces {{propertyName}} with properties from the 'args' object
// Supports {{object.property}}
// Use {{l10n(key-name)}} to automatically get from l10n object
String.prototype.REGEX_FORMAT = /(\{\{([^\}]+)\}\})/g;
String.prototype.REGEX_FORMAT_L10N = /l10n\(([^\)]*)\)/;
String.prototype.format = function format(args, shouldSanitise) {
  !args && (args = {});

  if (window.CONFIG) {
    args.CONFIG = CONFIG;
  }

  return this.replace(String.prototype.REGEX_FORMAT, function onMatch() {
    var key = arguments[2],
        properties = key.split('.'),
        value = args,
        l10nMatch = key.match(String.prototype.REGEX_FORMAT_L10N);

    if (l10nMatch) {
      value = l10n.get(l10nMatch[1]);
    } else {
      // support nesting - "I AM {{ship.info.name}}"
      for (var i = 0, len = properties.length; i < len; i++) {
        value = value && value[properties[i]];
      }
    }

    if (value === undefined || value === null) {
      value = arguments[0];
    }

    return value;
  });
};