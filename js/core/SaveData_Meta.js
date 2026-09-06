// web/js/core/SaveData_Meta.js
//
// Meta-progression snapshot for the SaveSubsystem (W2 T2.5). Persists
// cross-run unlocks — which factions / starting buffs the player has
// unlocked and how much meta-currency they hold. This survives across
// many Run snapshots, hence a separate storage key.
//
// W2 T2.5 contract (part 2 of 3 deliverables):
//   - unlockedFactions: string[] (faction ids the player may pick)
//   - unlockedBuffs:    string[] (starting buff ids available)
//   - currency:         number (meta-currency balance, >= 0)
//   - serialize() -> plain JSON; static deserialize() -> SaveData_Meta
//     or null on corrupt / schema-mismatch input
//
// W2 only needs the container + persistence. W4 roguelike layer will
// actually populate / mutate these (unlock UI, buff selection, meta shop).

export const META_SCHEMA_VERSION = 1;

export class SaveData_Meta {
  constructor({
    unlockedFactions = [],
    unlockedBuffs = [],
    currency = 0,
    updatedAt,
  } = {}) {
    if (!Array.isArray(unlockedFactions) ||
        unlockedFactions.some((f) => typeof f !== 'string')) {
      throw new TypeError('SaveData_Meta: unlockedFactions must be an array of strings');
    }
    if (!Array.isArray(unlockedBuffs) ||
        unlockedBuffs.some((b) => typeof b !== 'string')) {
      throw new TypeError('SaveData_Meta: unlockedBuffs must be an array of strings');
    }
    if (!Number.isFinite(currency) || currency < 0) {
      throw new RangeError(`SaveData_Meta: currency must be a non-negative number (got ${currency})`);
    }

    this.schemaVersion = META_SCHEMA_VERSION;
    this.unlockedFactions = [...unlockedFactions];
    this.unlockedBuffs = [...unlockedBuffs];
    this.currency = currency;
    this.updatedAt = updatedAt ?? new Date().toISOString();
  }

  // === Serialization ===

  serialize() {
    return {
      schemaVersion: this.schemaVersion,
      unlockedFactions: [...this.unlockedFactions],
      unlockedBuffs: [...this.unlockedBuffs],
      currency: this.currency,
      updatedAt: this.updatedAt,
    };
  }

  /** Rebuild from serialized data; null on corrupt / mismatch (never throws). */
  static deserialize(data) {
    try {
      if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
      if (data.schemaVersion !== META_SCHEMA_VERSION) return null;
      return new SaveData_Meta({
        unlockedFactions: data.unlockedFactions,
        unlockedBuffs: data.unlockedBuffs,
        currency: data.currency,
        updatedAt: data.updatedAt,
      });
    } catch {
      return null;
    }
  }
}
