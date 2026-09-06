// web/js/core/Tile.js
//
// One map cell. Holds terrain type + live references to whoever stands
// (occupant) or sits (building) here. Markers is a transient gameplay
// tag set used by the SelectionManager in T2.3 ('reachable',
// 'attackable', 'path', 'aoe', etc.).
//
// W2 T2.2 contract (1st of 4 deliverables):
//   x, y >= 0 integer coordinates (grid address; grid system stores
//     Tile[] such that grid[row][col].x === col, grid[row][col].y === row)
//   terrain ∈ {plain, forest, mountain, water, desert}
//   occupant, building are nullable references; lifecycle owned by
//     BattleMap, never mutated here
//   isPassable() / movementCost() are read-only conveniences for the
//     BattleLoop turn advances (T2.3+ SelectionManager uses them)

const VALID_TERRAINS = Object.freeze(new Set([
  'plain',
  'forest',
  'mountain',
  'water',
  'desert',
]));

// Movement cost to ENTER a tile. Mountains and water are impassable.
// Plain is the cheapest (1), forest & desert slow you down (2).
const TERRAIN_COST = Object.freeze({
  plain:    1,
  forest:   2,
  desert:   2,
  mountain: Infinity,
  water:    Infinity,
});

export class Tile {
  constructor({ x, y, terrain = 'plain' } = {}) {
    if (!Number.isInteger(x) || x < 0) {
      throw new RangeError(`Tile: x must be a non-negative integer (got ${x})`);
    }
    if (!Number.isInteger(y) || y < 0) {
      throw new RangeError(`Tile: y must be a non-negative integer (got ${y})`);
    }
    if (!VALID_TERRAINS.has(terrain)) {
      throw new RangeError(
        `Tile: terrain must be one of ${[...VALID_TERRAINS].join(', ')} (got "${terrain}")`
      );
    }
    this.x = x;
    this.y = y;
    this.terrain = terrain;
    this.occupant = null;
    this.building = null;
    this.markers = new Set();
    // NO Object.freeze here — BattleMap legitimately reassigns
    // occupant / building refs as units move and structures spawn.
    // Tile is a mutable container; TurnContext is the immutable
    // counterpart (per-turn snapshot).
  }

  isPassable() {
    return TERRAIN_COST[this.terrain] !== Infinity;
  }

  // Infinity for impassable — caller must compare with `< budget`.
  movementCost() {
    return TERRAIN_COST[this.terrain];
  }

  // Tag mutation. Markers are gameplay flags, NOT identity — frozen Map
  // semantics would block legitimate add/remove.
  addMarker(name) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new TypeError('Tile.addMarker: name must be a non-empty string');
    }
    this.markers.add(name);
    return this.markers.size;
  }

  removeMarker(name) {
    return this.markers.delete(name);
  }

  hasMarker(name) {
    return this.markers.has(name);
  }

  clearMarkers() {
    this.markers.clear();
  }
}

// Exported for tests to assert against.
export const TERRAINS = Object.freeze({
  PLAIN:    'plain',
  FOREST:   'forest',
  MOUNTAIN: 'mountain',
  WATER:    'water',
  DESERT:   'desert',
});
