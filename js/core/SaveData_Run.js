// web/js/core/SaveData_Run.js
//
// Immutable snapshot of a single battle "run" for the SaveSubsystem
// (W2 T2.5). It does NOT hold a live BattleMap / BattleLoop — it holds
// their JSON-safe snapshots (BattleMap.serialize() output + the turn
// state read off BattleLoop), so a save can round-trip through
// localStorage as a pure string.
//
// W2 T2.5 contract (part 1 of 3 deliverables):
//   - capture roundNumber / phase / currentPlayerId / players / status
//   - carry the map snapshot (tiles + units + buildings)
//   - serialize() -> plain JSON object; static deserialize() -> new
//     SaveData_Run (or null on corrupt / schema-mismatch input)
//
// Deliberately decoupled from TurnContext / BattleLoop: this layer is a
// dumb data bag. Callers (BattleScene) read the live objects and hand us
// the flattened values. W3 "load & resume" will add a fromJSON() on
// BattleMap to rebuild the runtime objects; W2 only persists.

export const RUN_SCHEMA_VERSION = 1;

export const RunStatus = Object.freeze({
  ACTIVE:     'active',      // mid-battle, round in progress
  WON:        'won',         // player won
  LOST:       'lost',        // player lost
  ABANDONED:  'abandoned',   // player quit / cleared manually
});

const VALID_STATUS = new Set(Object.values(RunStatus));

export class SaveData_Run {
  constructor({
    runId,
    roundNumber,
    phase,
    currentPlayerId = null,
    players = [],
    status = RunStatus.ACTIVE,
    map,
    savedAt,
  } = {}) {
    if (typeof runId !== 'string' || runId.length === 0) {
      throw new TypeError('SaveData_Run: runId must be a non-empty string');
    }
    if (!Number.isInteger(roundNumber) || roundNumber < 1) {
      throw new RangeError(
        `SaveData_Run: roundNumber must be a positive integer (got ${roundNumber})`
      );
    }
    if (typeof phase !== 'string' || phase.length === 0) {
      throw new TypeError('SaveData_Run: phase must be a non-empty string');
    }
    if (currentPlayerId !== null && typeof currentPlayerId !== 'string') {
      throw new TypeError('SaveData_Run: currentPlayerId must be a string or null');
    }
    if (!Array.isArray(players) || players.some((p) => typeof p !== 'string')) {
      throw new TypeError('SaveData_Run: players must be an array of strings');
    }
    if (!VALID_STATUS.has(status)) {
      throw new RangeError(
        `SaveData_Run: unknown status "${status}" (expected ${[...VALID_STATUS].join(', ')})`
      );
    }
    if (!map || typeof map !== 'object' || Array.isArray(map)) {
      throw new TypeError('SaveData_Run: map must be a plain object (BattleMap.serialize() output)');
    }

    this.schemaVersion = RUN_SCHEMA_VERSION;
    this.runId = runId;
    this.roundNumber = roundNumber;
    this.phase = phase;
    this.currentPlayerId = currentPlayerId;
    this.players = [...players];
    this.status = status;
    this.map = structuredCloneSafe(map);
    this.savedAt = savedAt ?? new Date().toISOString();
  }

  // === Serialization ===

  serialize() {
    return {
      schemaVersion: this.schemaVersion,
      runId: this.runId,
      roundNumber: this.roundNumber,
      phase: this.phase,
      currentPlayerId: this.currentPlayerId,
      players: [...this.players],
      status: this.status,
      map: structuredCloneSafe(this.map),
      savedAt: this.savedAt,
    };
  }

  /**
   * Rebuild a SaveData_Run from previously-serialized data.
   * Returns null (never throws) on corrupt input or schema mismatch —
   * the caller treats "no valid save" as "fresh start".
   */
  static deserialize(data) {
    try {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
      if (data.schemaVersion !== RUN_SCHEMA_VERSION) return null;
      return new SaveData_Run({
        runId: data.runId,
        roundNumber: data.roundNumber,
        phase: data.phase,
        currentPlayerId: data.currentPlayerId,
        players: data.players,
        status: data.status,
        map: data.map,
        savedAt: data.savedAt,
      });
    } catch {
      return null;
    }
  }
}

// Deep-copy a JSON-safe value. structuredClone is present in all modern
// browsers + Node >=17; fall back to JSON round-trip for the few targets
// that lack it (happy-dom uses the host Node, which has it).
function structuredCloneSafe(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
