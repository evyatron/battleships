/*global EventDispatcher*/

(function ShipPlacer(scope) {
  function ShipPlacer(options) {
    this.el;
    this.board = null;
    this.shipToPlace = null;
    this.isVertical = true;
    this.isDone = false;

    this.ships = {};
    this.shipsLeftToPlace = {};
    this.tempSlots = null;

    this.PICKUP_SHIP = 'pickup';
    this.SHIP_PLACED = 'placed';
    this.DONE = 'done';

    this.init(options);
  }

  ShipPlacer.prototype = Object.create(EventDispatcher.prototype);
  ShipPlacer.prototype.constructor = ShipPlacer;

  ShipPlacer.prototype.init = function init(options) {
    this.board = options.board;

    for (var i = 0, len = options.ships.length; i < len; i++) {
      var ship = options.ships[i];

      this.shipsLeftToPlace[ship.id] = true;
      this.ships[ship.id] = ship;
    }

    this.createHTML();

    this._onShipClick = this.onShipClick.bind(this);
    this._onBoardRightClick = this.onBoardRightClick.bind(this);
    this._onBoardClick = this.onBoardClick.bind(this);
    this._onBoardSlotOver = this.onBoardSlotOver.bind(this);
    this._removeTempShip = this.removeTempShip.bind(this);

    this.enable();
  };

  ShipPlacer.prototype.destroy = function destroy(options) {
    this.disable();

    if (this.el && this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  };

  ShipPlacer.prototype.enable = function enable() {
    this.el.addEventListener('click', this._onShipClick);
    this.board.el.addEventListener('contextmenu', this._onBoardRightClick);
    this.board.on(this.board.SLOT_CLICK, this._onBoardClick);
    this.board.on(this.board.SLOT_OVER, this._onBoardSlotOver);
    this.board.on(this.board.SLOT_OUT, this._removeTempShip);

    this.board.el.appendChild(this.el);
  };

  ShipPlacer.prototype.disable = function disable() {
    this.el.removeEventListener('click', this._onShipClick);
    this.board.el.removeEventListener('contextmenu', this._onBoardRightClick);
    this.board.off(this.board.SLOT_CLICK, this._onBoardClick);
    this.board.off(this.board.SLOT_OVER, this._onBoardSlotOver);
    this.board.off(this.board.SLOT_OUT, this._removeTempShip);

    this.el.parentNode.removeChild(this.el);
  };

  ShipPlacer.prototype.setShipToPlace = function setShipToPlace(ship) {
    if (this.shipsLeftToPlace[ship.id]) {
      if (this.shipToPlace) {
        this.ships[this.shipToPlace.id].el.classList.remove('picked-up');

        if (this.shipToPlace.id === ship.id) {
          this.shipToPlace = null;
          this.removeTempShip();
          return false;
        }
      }

      this.isVertical = false;
      this.shipToPlace = new Ship(ship);

      ship.el.classList.add('picked-up');

      this.dispatch(this.PICKUP_SHIP, ship);

      return true;
    }
  };

  ShipPlacer.prototype.onShipClick = function onShipClick(e) {
    var elClicked = utils.getMatchedParent(e.target, '.ship[data-id]');

    if (elClicked) {
      var ship = this.ships[elClicked.dataset.id];

      if (ship) {
        this.setShipToPlace(ship);
      }
    }
  };

  ShipPlacer.prototype.onShipPlaced = function onShipPlaced() {
    var ship = this.shipToPlace;

    this.shipToPlace = null;
    delete this.shipsLeftToPlace[ship.id];

    this.ships[ship.id].el.classList.add('placed');
    this.ships[ship.id].el.classList.remove('picked-up');

    this.dispatch(this.SHIP_PLACED, ship);

    if (Object.keys(this.shipsLeftToPlace).length === 0) {
      this.isDone = true;

      this.dispatch(this.DONE, {
        'ships': this.ships
      });
    }
  };

  ShipPlacer.prototype.onBoardSlotOver = function onBoardSlotOver(slot) {
    if (this.shipToPlace) {
      this.setTempShip(slot);
    }
  };

  ShipPlacer.prototype.setTempShip = function setTempShip(slot) {
    var canPlace = this.board.canPlaceShipAt(this.shipToPlace, slot.row, slot.col, this.isVertical);
    if (canPlace) {
      var ship = this.shipToPlace;
      var tempSlots = this.board.getShipSlots(this.shipToPlace, slot.row, slot.col, this.isVertical);

      ship.position(slot.row, slot.col, this.isVertical);
      this.board.elShips.appendChild(ship.el);

      this.tempSlots = tempSlots;
    } else {

    }
  };

  ShipPlacer.prototype.removeTempShip = function removeTempShip() {
    if (this.shipToPlace) {
      if (this.shipToPlace.el.parentNode) {
        this.shipToPlace.el.parentNode.removeChild(this.shipToPlace.el);
      }
    }

    this.tempSlots = null;
  };

  ShipPlacer.prototype.onBoardClick = function onBoardClick(data) {
    if (!this.shipToPlace) {
      console.warn('not holding any ships');
      return;
    }

    var slot = data.slot;
    var didPlace = this.board.placeShipAt(this.shipToPlace, slot.row, slot.col, this.isVertical);
    if (didPlace) {
      this.onShipPlaced();
    }
  };

  ShipPlacer.prototype.onBoardRightClick = function onBoardRightClick(e) {
    e.preventDefault();
    this.isVertical = !this.isVertical;
    this.refreshTempSlots();
  };

  ShipPlacer.prototype.refreshTempSlots = function refreshTempSlots(e) {
    if (!this.tempSlots) {
      return;
    }

    var tempSlots = this.tempSlots;
    this.removeTempShip();
    this.setTempShip(this.board.getSlotAt(tempSlots.row.from, tempSlots.col.from));
  };

  ShipPlacer.prototype.createHTML = function createHTML() {
    this.el = document.createElement('div');
    this.el.className = 'ship-placer';

    for (var id in this.ships) {
      var ship = this.ships[id];
      var elShip = ship.el;

      elShip.style.width = '';
      elShip.style.height = '';

      var elSize = elShip.querySelector('.size');
      var html = '';
      for (var i = 0; i < ship.height; i++) {
        html += '<span class="row">';
          for (var j = 0; j < ship.width; j++) {
            html += '<b></b>';
          }
        html += '</span>';
      }
      elSize.innerHTML = html;

      elShip.setAttribute('title', ship.name + ' - ' + ship.width + 'x' + ship.height);

      this.el.appendChild(elShip);
    }
  };

  if (typeof module === 'undefined') {
    scope.ShipPlacer = ShipPlacer;
  } else {
    module.exports = ShipPlacer;
  }
}(typeof window === 'undefined'? null : window));