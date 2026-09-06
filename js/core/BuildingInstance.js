// web/js/core/BuildingInstance.js
//
// Runtime representation of a static building on the map. Same shape as
// UnitInstance's hp bookkeeping but no movement; has a `production`
// dictionary instead. Headquarters ('base' type) destruction in the main
// battle triggers BATTLE_LOSE — BattleLoop queries isHeadquarters() to
// decide.
//
// W2 T2.2 contract (4th of 4 deliverables):
//   id, faction, type, position, hp, maxHp, production{ gold?, wood?, ... }
//   takeDamage / heal / isDestroyed / isHeadquarters
//   productionTick() increments a resource (T2.5 SaveSubsystem persists it)
//   serialize()

export const BuildingType = Object.freeze({
  BASE:        'base',          // faction HQ — destroyed = lose
  BARRACKS:    'barracks',      // trains soldiers (W3)
  MINE:        'mine',          // +gold per turn
  TOWER:       'tower',         // ranged attack in Defense phase
  WORKSHOP:    'workshop',      // upgrades (W4)
});

const VALID_TYPES = new Set(Object.values(BuildingType));

const DEFAULT_STATS = Object.freeze({
  [BuildingType.BASE]:     { maxHp: 200, production: {} },
  [BuildingType.BARRACKS]: { maxHp: 100, production: {} },
  [BuildingType.MINE]:     { maxHp: 60,  production: { gold: 5 } },
  [BuildingType.TOWER]:    { maxHp: 80,  production: {} },
  [BuildingType.WORKSHOP]: { maxHp: 60,  production: {} },
});

const HEADQUARTERS = new Set([BuildingType.BASE]);

export class BuildingInstance {
  constructor({
    id,
    faction,
    type,
    position,
    hp,
    maxHp,
    production,
  } = {}) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError(`BuildingInstance: id must be a non-empty string`);
    }
    if (typeof faction !== 'string' || faction.length === 0) {
      throw new TypeError(`BuildingInstance: faction must be a non-empty string`);
    }
    if (!VALID_TYPES.has(type)) {
      throw new RangeError(
        `BuildingInstance: type must be one of ${[...VALID_TYPES].join(', ')} (got "${type}")`
      );
    }
    if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) {
      throw new TypeError('BuildingInstance: position must be {x, y} integer coordinates');
    }
    if (position.x < 0 || position.y < 0) {
      throw new RangeError('BuildingInstance: position coordinates must be >= 0');
    }

    const def = DEFAULT_STATS[type];
    const resolvedMaxHp = maxHp ?? def.maxHp;
    const resolvedHp = hp ?? resolvedMaxHp;
    if (!Number.isInteger(resolvedHp) || resolvedHp < 0) {
      throw new RangeError(
        `BuildingInstance: hp must be a non-negative integer (got ${resolvedHp})`
      );
    }
    if (!Number.isInteger(resolvedMaxHp) || resolvedMaxHp <= 0) {
      throw new RangeError(
        `BuildingInstance: maxHp must be a positive integer (got ${resolvedMaxHp})`
      );
    }
    if (resolvedHp > resolvedMaxHp) {
      throw new RangeError(
        `BuildingInstance: hp (${resolvedHp}) must not exceed maxHp (${resolvedMaxHp})`
      );
    }

    this.id = id;
    this.faction = faction;
    this.type = type;
    this.position = { x: position.x, y: position.y };
    this.maxHp = resolvedMaxHp;
    this.hp = resolvedHp;
    this.production = { ...(production ?? def.production) };
  }

  // === Lifecycle ===

  takeDamage(amount) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError(
        `BuildingInstance.takeDamage: amount must be a non-negative finite number (got ${amount})`
      );
    }
    const before = this.hp;
    this.hp = Math.max(0, this.hp - Math.floor(amount));
    return before - this.hp;
  }

  heal(amount) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError(
        `BuildingInstance.heal: amount must be a non-negative finite number (got ${amount})`
      );
    }
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.floor(amount));
    return this.hp - before;
  }

  isDestroyed() {
    return this.hp <= 0;
  }

  // True iff this building is the faction HQ. BattleLoop queries this
  // to determine BATTLE_LOSE on AI's BASE going down (or BATTLE_WIN on
  // the player's BASE going down — actually that means the player lost,
  // so BattleLoop matches faction).
  isHeadquarters() {
    return HEADQUARTERS.has(this.type);
  }

  // Each call advances one turn worth of production. Resources accumulate
  // by integer amount. Caller (BattleLoop on round tick) is responsible
  // for actually crediting the player's gold reserve — BuildingInstance
  // only owns the per-turn delta.
  productionTick() {
    const yields = { ...this.production };
    return yields;
  }

  // === Serialization ===

  serialize() {
    return {
      id: this.id,
      faction: this.faction,
      type: this.type,
      position: { ...this.position },
      hp: this.hp,
      maxHp: this.maxHp,
      production: { ...this.production },
    };
  }
}
