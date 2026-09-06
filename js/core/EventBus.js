// web/js/core/EventBus.js
//
// Lightweight synchronous pub-sub bus with exception isolation.
// W2 T2.1 contract (3rd of 3 deliverables):
//   BattleLoop emits BattleEvents.* and zero or more listeners subscribe.
//   W3 BT AI and W4 roguelike layers wire into this bus independently.
//
// Stage 2 design doc (`docs/architecture/event-bus.md`) deferred concerns —
// WAL persistence, ACK semantics, single-battle replay, schema versioning,
// Editor visualization, dead-letter queue, strict dependency graph,
// global sequence numbers — are NOT in W2 scope. Stage 1 web settles for:
//   - synchronous in-process dispatch (no async, no microtask queue)
//   - try/catch per listener with explicit onError callback
//   - unsubscribe handle returned by `on()` to avoid stale-listener leaks
//   - `listenerCount()` and `clear()` for test introspection
//
// BattleEvents catalog is a single source of truth for event names —
// no string typos at subscriber or publisher sites.

const DEFAULT_ERROR_CALLBACK = (event, err) =>
  console.error(`[EventBus] listener for "${event}" threw:`, err);

export class EventBus {
  constructor({ onError } = {}) {
    this._listeners = new Map();   // event name -> Set<fn>
    this._onError = onError || DEFAULT_ERROR_CALLBACK;
  }

  on(event, listener) {
    if (typeof event !== 'string' || event.length === 0) {
      throw new TypeError('EventBus.on: event must be a non-empty string');
    }
    if (typeof listener !== 'function') {
      throw new TypeError(
        `EventBus.on: listener must be a function for "${event}"`
      );
    }
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(listener);
    return () => this.off(event, listener);   // unsubscribe handle
  }

  once(event, listener) {
    const wrapper = (payload) => {
      this.off(event, wrapper);
      listener(payload);
    };
    return this.on(event, wrapper);
  }

  off(event, listener) {
    const set = this._listeners.get(event);
    if (!set) return false;
    const removed = set.delete(listener);
    if (set.size === 0) this._listeners.delete(event);
    return removed;
  }

  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return 0;
    let called = 0;
    // snapshot to allow safe concurrent off() during dispatch
    for (const listener of Array.from(set)) {
      try {
        listener(payload);
        called++;
      } catch (err) {
        this._onError(event, err);
      }
    }
    return called;
  }

  listenerCount(event) {
    const set = this._listeners.get(event);
    return set ? set.size : 0;
  }

  clear() {
    this._listeners.clear();
  }
}

// Event catalog — single source of truth. Frozen to forbid typos at runtime.
export const BattleEvents = Object.freeze({
  ROUND_START: 'round:start',
  TURN_START:  'turn:start',
  TURN_END:    'turn:end',
  ROUND_END:   'round:end',
  BATTLE_WIN:  'battle:win',
  BATTLE_LOSE: 'battle:lose',
});
