var AudioPlayer = (function AudioPlayer() {
  function AudioPlayer() {
    this.baseSrc = '';

    this.isEnabled;
    this.effectsVolume;
    this.musicVolume;

    this.audioContext = null;

    this.SOUNDS = {};
  }

  AudioPlayer.prototype.init = function init(options) {
    !options && (options = {});

    this.baseSrc = options.baseSrc || '';
    this.isEnabled = options.isEnabled !== undefined? options.isEnabled : true;
    this.effectsVolume = options.effectsVolume !== undefined? options.effectsVolume : 0.5;
    this.musicVolume = options.musicVolume !== undefined? options.musicVolume : 0.5;

    for (var id in options.sounds) {
      this.SOUNDS[id] = {
        'id': id,
        'src': options.sounds[id]
      };
      this[id] = id;
    }

    this.audioContext = new AudioContext();

    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    this.setEffectsVolume(this.effectsVolume);
    this.setMusicVolume(this.musicVolume);
  };

  AudioPlayer.prototype.setEnabled = function setEnabled(isEnabled) {
    this.isEnabled = isEnabled;
  };

  AudioPlayer.prototype.setEffectsVolume = function setEffectsVolume(volume) {
    this.gainNode.gain.value = volume;
  };

  AudioPlayer.prototype.setMusicVolume = function setMusicVolume(volume) {
    //this.gainNode.gain.value = volume;
  };

  AudioPlayer.prototype.play = function play(id, shouldLoop) {
    if (!this.isEnabled) {
      return;
    }

    var sound = this.SOUNDS[id];

    if (!sound) {
      console.warn('Trying to play a missing sound', id);
      return false;
    }

    if (!sound.buffer) {
      this.load(id, this.play.bind(this, id, shouldLoop));
      return;
    }

    var soundSource = this.audioContext.createBufferSource();
    soundSource.buffer = sound.buffer;
    soundSource.connect(this.gainNode);
    soundSource.loop = Boolean(shouldLoop);
    soundSource.start(0);

    this.SOUNDS[id].source = soundSource;

    return sound.source;
  };

  AudioPlayer.prototype.loop = function loop(id) {
    this.play(id, true);
  };

  AudioPlayer.prototype.load = function load(id, callback) {
    var sound = this.SOUNDS[id],
        request = new XMLHttpRequest();

    request.open('GET', this.baseSrc + '/' + sound.src, true);
    request.responseType = 'arraybuffer';

    request.onload = function onAudioLoad() {
      var audioData = request.response;

      this.audioContext.decodeAudioData(audioData, function onAudioDecode(buffer) {
        this.SOUNDS[id].buffer = buffer;

        callback();
      }.bind(this));
    }.bind(this);

    request.send();
  };

  return new AudioPlayer();
}());