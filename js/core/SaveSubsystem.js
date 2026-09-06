// web/js/core/SaveSubsystem.js
//
// localStorage-backed persistence for Animal Civ (W2 T2.5). The single
// owner of the storage keys and the JSON (de)serialization boundary.
//
// Two independent keys (both schema-versioned):
//   - run  key: `animal-civ-save-v1`  -> SaveData_Run  (current battle)
//   - meta key: `animal-civ-meta-v1`  -> SaveData_Meta (cross-run unlocks)
//
// W2 T2.5 contract (part 3 of 3 deliverables):
//   - saveRun / loadRun / hasRun / clearRun
//   - saveMeta / loadMeta / hasMeta / clearMeta
//   - clearAll
//   - JSON.stringify on save, JSON.parse + schema check on load
//   - corrupt / schema-mismatched / absent data -> load returns null
//     (never throws), so the caller treats it as "fresh start"
//
// Storage is injected for testability: the constructor defaults to
// `globalThis.localStorage` (present in browsers; vitest/happy-dom also
// exposes it) but tests pass an in-memory mock so they can assert on
// writes and simulate corruption / quota errors without a real store.
//
// Design note: W2 auto-saves on turn end + run end. W3 "load & resume"
// will consume loadRun() and rebuild BattleMap/BattleLoop via their
// (then-added) fromJSON() factories. SaveSubsystem itself stays a dumb
// string-in / string-out boundary.

import { SaveData_Run } from './SaveData_Run.js';
import { SaveData_Meta } from './SaveData_Meta.js';

const DEFAULT_RUN_KEY  = 'animal-civ-save-v1';
const DEFAULT_META_KEY = 'animal-civ-meta-v1';

export class SaveSubsystem {
  constructor({
    storage = globalThis.localStorage,
    runKey = DEFAULT_RUN_KEY,
    metaKey = DEFAULT_META_KEY,
  } = {}) {
    if (!storage || typeof storage.getItem !== 'function' ||
        typeof storage.setItem !== 'function') {
      throw new TypeError(
        'SaveSubsystem: storage must implement getItem/setItem (a localStorage-like object)'
      );
    }
    if (typeof runKey !== 'string' || runKey.length === 0) {
      throw new TypeError('SaveSubsystem: runKey must be a non-empty string');
    }
    if (typeof metaKey !== 'string' || metaKey.length === 0) {
      throw new TypeError('SaveSubsystem: metaKey must be a non-empty string');
    }
    this._storage = storage;
    this._runKey = runKey;
    this._metaKey = metaKey;
  }

  get runKey() { return this._runKey; }
  get metaKey() { return this._metaKey; }

  // === Run persistence ===

  /**
   * Persist a run snapshot. Accepts a SaveData_Run instance or any object
   * with a serialize() method returning the JSON-safe payload.
   */
  saveRun(run) {
    const payload = this._payloadOf(run);
    this._storage.setItem(this._runKey, JSON.stringify(payload));
    return true;
  }

  /** Load the run snapshot, or null when absent / corrupt / mismatched. */
  loadRun() {
    return this._load(this._runKey, SaveData_Run.deserialize);
  }

  hasRun() {
    return this._storage.getItem(this._runKey) !== null;
  }

  clearRun() {
    this._storage.removeItem(this._runKey);
    return true;
  }

  // === Meta persistence ===

  saveMeta(meta) {
    const payload = this._payloadOf(meta);
    this._storage.setItem(this._metaKey, JSON.stringify(payload));
    return true;
  }

  loadMeta() {
    return this._load(this._metaKey, SaveData_Meta.deserialize);
  }

  hasMeta() {
    return this._storage.getItem(this._metaKey) !== null;
  }

  clearMeta() {
    this._storage.removeItem(this._metaKey);
    return true;
  }

  clearAll() {
    this.clearRun();
    this.clearMeta();
    return true;
  }

  // === private ===

  _payloadOf(x) {
    if (x && typeof x.serialize === 'function') return x.serialize();
    if (x && typeof x === 'object') return x;
    throw new TypeError('SaveSubsystem: expected a serializable object or a serialize()-able instance');
  }

  _load(key, deserialize) {
    const raw = this._storage.getItem(key);
    if (raw === null || raw === undefined) return null;
    try {
      const data = JSON.parse(raw);
      return deserialize(data);
    } catch {
      // Corrupt JSON or a deserialize that threw — treat as no save.
      return null;
    }
  }
}
