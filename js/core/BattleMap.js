// web/js/core/BattleMap.js
//
// Owns the grid of Tiles and the bookkeeping for UnitInstance and
// BuildingInstance entities. BattleLoop only talks to BattleMap through
// the EventBus pattern established in T2.1 — but BattleMap is a writer
// of occupant / building refs on Tiles, so it bypasses the bus for these
// internal pointers (no need for app-level subscribers to learn about
// each move).
//
// W2 T2.2 contract (2nd of 4 deliverables):
//   - fixed-size grid (cols x rows), `plain` terrain by default
//   - spawn/remove UnitInstance & BuildingInstance, fixing refs both ways
//   - getTile(x, y), getUnit(id), getUnitAt(x, y), getBuilding(id), getBuildingAt(x, y)
//   - moveUnit(id, {x, y}): re-wire Tile.occupant refs in one atomic op
//   - serialize() for T2.5 SaveSubsystem to consume

import { Tile, TERRAINS } from './Tile.js';
import { UnitInstance } from './UnitInstance.js';
import { BuildingInstance } from './BuildingInstance.js';

function mintIdFactory(prefix) {
  let n = 0;
  return () => `${prefix}-${++n}`;
}

export class BattleMap {
  constructor({ cols = 16, rows = 9, defaultTerrain = TERRAINS.PLAIN } = {}) {
    if (!Number.isInteger(cols) || cols <= 0) {
      throw new RangeError(`BattleMap: cols must be a positive integer (got ${cols})`);
    }
    if (!Number.isInteger(rows) || rows <= 0) {
      throw new RangeError(`BattleMap: rows must be a positive integer (got ${rows})`);
    }
    this.cols = cols;
    this.rows = rows;
    this.defaultTerrain = defaultTerrain;

    this._tiles = new Array(rows);
    for (let y = 0; y < rows; y++) {
      this._tiles[y] = new Array(cols);
      for (let x = 0; x < cols; x++) {
        this._tiles[y][x] = new Tile({ x, y, terrain: defaultTerrain });
      }
    }

    this._unitById = new Map();
    this._buildingById = new Map();
    this._unitsByFaction = new Map();   // faction -> Set<id>
    this._buildingsByFaction = new Map();

    this._unitMint    = mintIdFactory('unit');
    this._buildingMint = mintIdFactory('bld');
  }

  /**
   * Public read-only view of the underlying tiles grid. Index by
   * `grid[y][x]`. The returned reference is the live array — callers
   * that want to replace a Tile should still go through
   * `setTile(x, y, tile)` so occupant/building references stay sane.
   *
   * Why expose it: renderers (BattleScene, future W3 path-preview layer)
   * need to read tiles for drawing. Hiding the array behind a private
   * field forces every consumer to add a new BattleMap method just to
   * iterate; this is one of those "trust the in-process bus" cases.
   */
  get grid() { return this._tiles; }

  // === Grid queries ===

  isInBounds(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < this.cols && y < this.rows;
  }

  getTile(x, y) {
    if (!this.isInBounds(x, y)) return null;
    return this._tiles[y][x];
  }

  *allTiles() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        yield this._tiles[y][x];
      }
    }
  }

  /**
   * Live iterables for renderer/AI consumers. Returns a fresh array
   * each call (cheap: at most a handful of units/buildings in W2; we
   * accept the allocation over the iterator-of-Map ceremony).
   */
  get units() { return [...this._unitById.values()]; }
  get buildings() { return [...this._buildingById.values()]; }

  // === Unit lifecycle ===

  spawnUnit({ faction, type, position, id, ...rest } = {}) {
    if (!faction) throw new TypeError('BattleMap.spawnUnit: faction required');
    if (!this.isInBounds(position.x, position.y)) {
      throw new RangeError(
        `BattleMap.spawnUnit: out-of-bounds position (${position.x}, ${position.y})`
      );
    }
    const tile = this.getTile(position.x, position.y);
    if (tile.occupant) {
      throw new Error(
        `BattleMap.spawnUnit: tile (${position.x}, ${position.y}) already occupied by ${tile.occupant.id}`
      );
    }
    if (tile.building) {
      throw new Error(
        `BattleMap.spawnUnit: tile (${position.x}, ${position.y}) has a building (${tile.building.id})`
      );
    }

    const newId = id ?? this._unitMint();
    if (this._unitById.has(newId)) {
      throw new Error(`BattleMap.spawnUnit: id "${newId}" already exists`);
    }

    // Static import (top of file). UnitInstance is leaf module — no
    // BattleMap re-import.
    const unit = new UnitInstance({ id: newId, faction, type, position, ...rest });
    this._unitById.set(newId, unit);
    if (!this._unitsByFaction.has(faction)) this._unitsByFaction.set(faction, new Set());
    this._unitsByFaction.get(faction).add(newId);
    tile.occupant = unit;
    return unit;
  }

  removeUnit(id) {
    const unit = this._unitById.get(id);
    if (!unit) return null;
    const tile = this.getTile(unit.position.x, unit.position.y);
    if (tile && tile.occupant === unit) tile.occupant = null;
    this._unitById.delete(id);
    const factionSet = this._unitsByFaction.get(unit.faction);
    if (factionSet) factionSet.delete(id);
    return unit;
  }

  moveUnit(id, { x, y }) {
    const unit = this._unitById.get(id);
    if (!unit) throw new Error(`BattleMap.moveUnit: unit "${id}" not found`);
    if (!this.isInBounds(x, y)) {
      throw new RangeError(`BattleMap.moveUnit: out-of-bounds (${x}, ${y})`);
    }
    const fromTile = this.getTile(unit.position.x, unit.position.y);
    const toTile   = this.getTile(x, y);
    if (fromTile === toTile) return unit;
    if (toTile.occupant) {
      throw new Error(
        `BattleMap.moveUnit: target (${x}, ${y}) occupied by ${toTile.occupant.id}`
      );
    }
    if (toTile.building) {
      throw new Error(
        `BattleMap.moveUnit: target (${x}, ${y}) blocked by building ${toTile.building.id}`
      );
    }
    if (fromTile) fromTile.occupant = null;
    unit.moveTo({ x, y });
    toTile.occupant = unit;
    return unit;
  }

  // === Unit queries ===

  getUnit(id) { return this._unitById.get(id) ?? null; }
  getUnitAt(x, y) {
    const tile = this.getTile(x, y);
    return tile ? tile.occupant : null;
  }
  getUnitsByFaction(faction) {
    const set = this._unitsByFaction.get(faction);
    if (!set) return [];
    return [...set].map((id) => this._unitById.get(id)).filter(Boolean);
  }
  *allUnits() { for (const u of this._unitById.values()) yield u; }

  // === Building lifecycle ===

  spawnBuilding({ faction, type, position, id, ...rest } = {}) {
    if (!faction) throw new TypeError('BattleMap.spawnBuilding: faction required');
    if (!this.isInBounds(position.x, position.y)) {
      throw new RangeError(
        `BattleMap.spawnBuilding: out-of-bounds position (${position.x}, ${position.y})`
      );
    }
    const tile = this.getTile(position.x, position.y);
    if (tile.building) {
      throw new Error(
        `BattleMap.spawnBuilding: tile (${position.x}, ${position.y}) already has ${tile.building.id}`
      );
    }
    if (tile.occupant) {
      throw new Error(
        `BattleMap.spawnBuilding: tile (${position.x}, ${position.y}) occupied by unit ${tile.occupant.id}`
      );
    }
    const newId = id ?? this._buildingMint();
    if (this._buildingById.has(newId)) {
      throw new Error(`BattleMap.spawnBuilding: id "${newId}" already exists`);
    }
    const bld = new BuildingInstance({ id: newId, faction, type, position, ...rest });
    this._buildingById.set(newId, bld);
    if (!this._buildingsByFaction.has(faction)) this._buildingsByFaction.set(faction, new Set());
    this._buildingsByFaction.get(faction).add(newId);
    tile.building = bld;
    return bld;
  }

  removeBuilding(id) {
    const bld = this._buildingById.get(id);
    if (!bld) return null;
    const tile = this.getTile(bld.position.x, bld.position.y);
    if (tile && tile.building === bld) tile.building = null;
    this._buildingById.delete(id);
    const set = this._buildingsByFaction.get(bld.faction);
    if (set) set.delete(id);
    return bld;
  }

  getBuilding(id) { return this._buildingById.get(id) ?? null; }
  getBuildingAt(x, y) {
    const tile = this.getTile(x, y);
    return tile ? tile.building : null;
  }
  getBuildingsByFaction(faction) {
    const set = this._buildingsByFaction.get(faction);
    if (!set) return [];
    return [...set].map((id) => this._buildingById.get(id)).filter(Boolean);
  }
  *allBuildings() { for (const b of this._buildingById.values()) yield b; }

  // === Serialization (SaveSubsystem T2.5) ===

  serialize() {
    return {
      cols: this.cols,
      rows: this.rows,
      defaultTerrain: this.defaultTerrain,
      tiles: this._tiles.map((row) =>
        row.map((tile) => ({
          x: tile.x,
          y: tile.y,
          terrain: tile.terrain,
          markers: [...tile.markers],
        }))
      ),
      units:      [...this._unitById.values()].map((u) => u.serialize()),
      buildings:  [...this._buildingById.values()].map((b) => b.serialize()),
    };
  }
}

// === End of class ===
