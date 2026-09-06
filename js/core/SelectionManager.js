// web/js/core/SelectionManager.js
//
// Owns the player's "what is currently selected" state. W2 T2.3 only
// handles single-unit selection + target hover — no multi-select, no
// dragbox, no path preview. Those come in T2.4 once BattleScene wires
// it up to a real Phaser Scene.
//
// Selection rules:
//   - Click on a player-faction unit  -> select that unit (emit UNIT_SELECTED)
//   - Click on empty tile OR a friendly non-unit -> clear() (DESELECTED)
//   - Click on enemy tile WITH a unit already selected -> set targetTile (TARGET_HOVER)
//   - Click on enemy tile WITHOUT a selected unit -> nothing (just hover the enemy's image)
//   - explicit clear() cancels selection + target
//
// W2 T2.3 contract (3rd of 3 deliverables):
//   - handleTileClick({x, y}, {button?}) applies the rules above
//   - selectedUnitId / targetTile getters
//   - emit SelectionEvents on state changes
//
// Selection operates on ALREADY-CONVERTED tile coordinates — InputSubsystem
// (raw pixel events) + InputHandler (screen -> tile) belong to the
// caller. Keeping SelectionManager pure makes T2.4 BattleScene a thin
// glue layer: pointer -> pointer event -> InputHandler -> handleTileClick.

import { UnitInstance } from './UnitInstance.js';
import { BuildingInstance } from './BuildingInstance.js';

export const SelectionEvents = Object.freeze({
  UNIT_SELECTED:   'selection:unit',
  TARGET_HOVER:    'selection:target',
  DESELECTED:      'selection:cleared',
});

const HOVER_EMIT_GAP_MS = 50;  // throttle: don't flood EventBus on every move
const PLAYER_FACTION_DEFAULT = 'player';

export class SelectionManager {
  constructor({ eventBus, map, playerFaction = PLAYER_FACTION_DEFAULT } = {}) {
    if (!eventBus || typeof eventBus.on !== 'function') {
      throw new TypeError('SelectionManager: eventBus must be an EventBus instance');
    }
    if (!map || typeof map.getTile !== 'function') {
      throw new TypeError('SelectionManager: map must be a BattleMap instance');
    }
    if (typeof playerFaction !== 'string' || playerFaction.length === 0) {
      throw new TypeError('SelectionManager: playerFaction must be a non-empty string');
    }
    this._bus = eventBus;
    this._map = map;
    this._playerFaction = playerFaction;
    this._unitId = null;
    this._targetTile = null;
    // Sentinel so the FIRST hover (any now, including now=0) is always
    // allowed to emit. Without this, now=0 - 0 = 0 < HOVER_EMIT_GAP_MS
    // would block the very first event.
    this._lastHoverAt = -Infinity;
  }

  get selectedUnitId() { return this._unitId; }
  get targetTile() { return this._targetTile; }
  get playerFaction() { return this._playerFaction; }
  hasSelection() { return this._unitId !== null; }
  hasTarget() { return this._targetTile !== null; }

  // === Public API ===

  /**
   * Apply the click rules at the supplied tile. Right-click (button=2)
   * is "explicit cancel" — clears any current selection / target.
   *
   * @param {{x: number, y: number}} tile
   * @param {{button?: number}=} opts
   * @returns {boolean} true if the click changed selection state
   */
  handleTileClick({ x, y }, { button = 0 } = {}) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError(
        `SelectionManager.handleTileClick: requires integer tile (got x=${x}, y=${y})`
      );
    }
    if (button === 2) return this.clear();

    const tile = this._map.getTile(x, y);
    if (!tile) return false;

    const occupant = tile.occupant;     // may be a UnitInstance or null
    const building = tile.building;     // may be a BuildingInstance or null

    // (1) Friendly unit -> select.
    if (occupant && occupant instanceof UnitInstance &&
        occupant.faction === this._playerFaction) {
      this._setSelected(occupant.id);
      return true;
    }

    // (2) Enemy unit while we already have a selection -> set target.
    if (occupant && occupant instanceof UnitInstance &&
        occupant.faction !== this._playerFaction &&
        this._unitId !== null) {
      this._setTarget({ x, y });
      return true;
    }

    // (3) Click on an enemy/friendly building with selection -> target.
    if (building && building instanceof BuildingInstance &&
        building.faction !== this._playerFaction &&
        this._unitId !== null) {
      this._setTarget({ x, y });
      return true;
    }

    // (4) Otherwise (empty / own building / no selection) -> clear.
    return this.clear();
  }

  /**
   * Pure hover — emit TARGET_HOVER throttled to HOVER_EMIT_GAP_MS so the
   * UI doesn't drown the bus. Returns true if a hover event was emitted.
   */
  handleTileHover({ x, y }, now = Date.now()) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError(
        `SelectionManager.handleTileHover: requires integer tile (got x=${x}, y=${y})`
      );
    }
    if (now - this._lastHoverAt < HOVER_EMIT_GAP_MS) return false;
    this._lastHoverAt = now;
    this._bus.emit(SelectionEvents.TARGET_HOVER, { tile: { x, y } });
    return true;
  }

  clear() {
    if (this._unitId === null && this._targetTile === null) return false;
    this._unitId = null;
    this._targetTile = null;
    this._bus.emit(SelectionEvents.DESELECTED, {});
    return true;
  }

  // === Internal setters ===

  _setSelected(unitId) {
    if (this._unitId === unitId && this._targetTile === null) return;
    this._unitId = unitId;
    this._targetTile = null;
    this._bus.emit(SelectionEvents.UNIT_SELECTED, { unitId });
  }

  _setTarget(targetTile) {
    const prev = this._targetTile;
    if (prev && prev.x === targetTile.x && prev.y === targetTile.y) return;
    this._targetTile = targetTile;
    this._bus.emit(SelectionEvents.TARGET_HOVER, { tile: targetTile });
  }
}
