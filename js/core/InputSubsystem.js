// web/js/core/InputSubsystem.js
//
// Bridges a Phaser-like input source to the application's EventBus.
// Source contract:
//   source.onPointerDown(cb)  -> unsubscribe via returned handle
//   source.onPointerMove(cb)
//   source.onPointerUp(cb)
//   source.onKeyDown(cb)
//
// Source is injected rather than hard-coded for testability (fake source
// in Vitest, real Phaser scene later in T2.4 BattleScene).
//
// W2 T2.3 contract (1st of 3 deliverables):
//   - attach({eventBus, source}): install four bridges; emit
//     InputEvents.POINTER_DOWN / POINTER_MOVE / POINTER_UP / KEY_DOWN
//   - destroy(): unsubscribe everything; idempotent
//   - reattach() rebuilds after destroy; idempotent on no-op

export const InputEvents = Object.freeze({
  POINTER_DOWN: 'input:pointer_down',
  POINTER_MOVE: 'input:pointer_move',
  POINTER_UP:   'input:pointer_up',
  KEY_DOWN:     'input:key_down',
});

// What the InputSubsystem expects on a `source`. Exposed for doc/tests.
export const InputSourceShape = Object.freeze({
  onPointerDown: 'fn(callback) -> unsubscribe handle',
  onPointerMove: 'fn(callback) -> unsubscribe handle',
  onPointerUp:   'fn(callback) -> unsubscribe handle',
  onKeyDown:     'fn(callback) -> unsubscribe handle',
});

const REQUIRED_METHODS = ['onPointerDown', 'onPointerMove', 'onPointerUp', 'onKeyDown'];

export class InputSubsystem {
  constructor({ eventBus, source } = {}) {
    if (!eventBus || typeof eventBus.on !== 'function') {
      throw new TypeError('InputSubsystem: eventBus must be an EventBus instance');
    }
    if (!source) {
      throw new TypeError('InputSubsystem: source is required');
    }
    for (const m of REQUIRED_METHODS) {
      if (typeof source[m] !== 'function') {
        throw new TypeError(`InputSubsystem: source must implement source.${m}()`);
      }
    }
    this._bus = eventBus;
    this._source = source;
    this._unsubs = [];
    this._attached = false;
    this._attach();
  }

  _attach() {
    if (this._attached) return;

    const onDown = (x, y, button = 0) => {
      this._bus.emit(InputEvents.POINTER_DOWN, { x, y, button });
    };
    const onMove = (x, y) => {
      this._bus.emit(InputEvents.POINTER_MOVE, { x, y });
    };
    const onUp   = (x, y) => {
      this._bus.emit(InputEvents.POINTER_UP, { x, y });
    };
    const onKey  = (key, mods = {}) => {
      this._bus.emit(InputEvents.KEY_DOWN, { key, mods });
    };

    this._unsubs.push(this._source.onPointerDown(onDown));
    this._unsubs.push(this._source.onPointerMove(onMove));
    this._unsubs.push(this._source.onPointerUp(onUp));
    this._unsubs.push(this._source.onKeyDown(onKey));
    this._attached = true;
  }

  destroy() {
    if (!this._attached) return;
    for (const off of this._unsubs) {
      try { typeof off === 'function' && off(); }
      catch (_err) { /* swallow — destroy must always succeed */ }
    }
    this._unsubs = [];
    this._attached = false;
  }

  reattach() {
    if (this._attached) return;
    this._attach();
  }

  get isAttached() { return this._attached; }
}
