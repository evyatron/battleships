var UserSettings = (function UserSettings() {
  function UserSettings() {
    this.EFFECTS_VOLUME = 'effects-volume';
    this.MUSIC_VOLUME = 'music-volume';
    this.SOUND_ENABLED = 'sound-enabled';

    this.init();
  }

  UserSettings.prototype.init = function init() {

  };

  UserSettings.prototype.set = function set(key, value) {
    var oldValue = this.get(key),
        valueToSave = {
          'value': value
        };

    localStorage[key] = JSON.stringify(valueToSave);

    return oldValue;
  };

  UserSettings.prototype.get = function get(key) {
    var value = key in localStorage? localStorage[key] : undefined;

    if (value !== undefined) {
      try {
        value = JSON.parse(value);
      } catch(ex) {
        value = null;
      }

      if (value) {
        value = value.value;
      }
    }

    return value;
  };

  UserSettings.prototype.remove = function remove(key) {
    var value = this.get(key);

    delete localStorage[key];

    return value;
  };

  return new UserSettings();
}());