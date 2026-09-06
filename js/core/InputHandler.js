// web/js/core/InputHandler.js
//
// Stateless coordinate converter: screen pixels <-> tile (grid) coords.
//
// W2 T2.3 contract (2nd of 3 deliverables):
//   - screenToTile({x, y}, bounds?) => {x, y} | null
//     bounds: optional {cols, rows} (BattleMap cols/rows). Returns null
//     when out of grid bounds.
//   - tileToScreen({x, y}) => {x, y} — center of the tile.
//   - setCamera({offsetX, offsetY, zoom}): adjust camera transform.
//   - tileSize: 64 px default (T2.4 BattleScene will set explicitly).
//
// Math:
//   worldX = (screenX - offsetX) / zoom
//   tileX  = floor(worldX / tileSize)
//
// Reversible for tileToScreen with center-of-tile snap:
//   worldX = (tileX + 0.5) * tileSize
//   screenX = worldX * zoom + offsetX

const DEFAULT_TILE_SIZE = 64;
const MIN_ZOOM = 0.001;

export class InputHandler {
  constructor({ tileSize = DEFAULT_TILE_SIZE, offsetX = 0, offsetY = 0, zoom = 1 } = {}) {
    if (!Number.isFinite(tileSize) || tileSize <= 0) {
      throw new RangeError(
        `InputHandler: tileSize must be a positive finite number (got ${tileSize})`
      );
    }
    if (!Number.isFinite(zoom) || zoom < MIN_ZOOM) {
      throw new RangeError(
        `InputHandler: zoom must be >= ${MIN_ZOOM} (got ${zoom})`
      );
    }
    this._tileSize = tileSize;
    this._offsetX = offsetX;
    this._offsetY = offsetY;
    this._zoom = zoom;
  }

  setCamera({ offsetX, offsetY, zoom } = {}) {
    if (offsetX !== undefined) {
      if (!Number.isFinite(offsetX)) {
        throw new RangeError(`InputHandler: offsetX must be finite (got ${offsetX})`);
      }
      this._offsetX = offsetX;
    }
    if (offsetY !== undefined) {
      if (!Number.isFinite(offsetY)) {
        throw new RangeError(`InputHandler: offsetY must be finite (got ${offsetY})`);
      }
      this._offsetY = offsetY;
    }
    if (zoom !== undefined) {
      if (!Number.isFinite(zoom) || zoom < MIN_ZOOM) {
        throw new RangeError(
          `InputHandler: zoom must be >= ${MIN_ZOOM} (got ${zoom})`
        );
      }
      this._zoom = zoom;
    }
  }

  get tileSize() { return this._tileSize; }
  get zoom() { return this._zoom; }
  get offsetX() { return this._offsetX; }
  get offsetY() { return this._offsetY; }

  /**
   * Convert a screen pixel coordinate to a tile coordinate.
   * Returns null when out of the optional `bounds` rectangle.
   *
   * @param {{x: number, y: number}} screen
   * @param {{cols: number, rows: number}=} bounds
   * @returns {{x: number, y: number} | null}
   */
  screenToTile({ x, y }, bounds) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      throw new TypeError(
        `InputHandler.screenToTile: requires finite x, y (got x=${x}, y=${y})`
      );
    }
    const wx = (x - this._offsetX) / this._zoom;
    const wy = (y - this._offsetY) / this._zoom;
    const tx = Math.floor(wx / this._tileSize);
    const ty = Math.floor(wy / this._tileSize);
    if (bounds) {
      if (!Number.isInteger(bounds.cols) || bounds.cols <= 0 ||
          !Number.isInteger(bounds.rows) || bounds.rows <= 0) {
        throw new RangeError(
          `InputHandler.screenToTile: bounds must be positive integer cols/rows (got ${JSON.stringify(bounds)})`
        );
      }
      if (tx < 0 || ty < 0 || tx >= bounds.cols || ty >= bounds.rows) {
        return null;
      }
    }
    return { x: tx, y: ty };
  }

  /**
   * Snap a tile coordinate back to screen pixels (center of that tile).
   *
   * @param {{x: number, y: number}} tile
   * @returns {{x: number, y: number}}
   */
  tileToScreen({ x, y }) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError(
        `InputHandler.tileToScreen: requires integer x, y (got x=${x}, y=${y})`
      );
    }
    if (x < 0 || y < 0) {
      throw new RangeError(
        `InputHandler.tileToScreen: tile coordinates must be >= 0 (got ${x}, ${y})`
      );
    }
    const wx = (x + 0.5) * this._tileSize;
    const wy = (y + 0.5) * this._tileSize;
    return {
      x: wx * this._zoom + this._offsetX,
      y: wy * this._zoom + this._offsetY,
    };
  }

  /**
   * Round-trip helper — convert a tile to screen, then back. Returns the
   * same tile if zoom is exactly 1 and no offset (modulo floor snapping).
   * For arbitrary zoom/offset, use this only as a smoke test, not an
   * exact equality assertion.
   */
  roundTrip(tile, bounds) {
    return this.screenToTile(this.tileToScreen(tile), bounds);
  }
}
