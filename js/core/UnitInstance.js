// web/js/core/UnitInstance.js
//
// Runtime representation of a single fighting unit on the map.
// id is global-unique (BattleMap mints them on spawn).
// position is {x, y} grid coordinates mirrored into Tile.occupant on
//   spawn and cleared on remove. BattleMap is the only writer of both.
//
// W2 T2.2 contract (3rd of 4 deliverables):
//   id, faction, type, position, hp, maxHp, attack, defense, buffs, canMove
//   moveTo({x,y}): reposition + side-effects on Tile.occupant owned by
//     BattleMap (this class does NOT touch tiles itself)
//   takeDamage(dmg): pure value mutation; emits via injected callback
//   heal(amount): same
//   isDead() / hasBuff(name) / addBuff(buff) / removeBuff(name)

export const UnitType = Object.freeze({
  WORKER: 'worker',
  SOLDIER: 'soldier',
  ARCHER: 'archer',
  KNIGHT: 'knight',
  HERO: 'hero',
});

const VALID_TYPES = new Set(Object.values(UnitType));

// Default stats per type — selectors override these in unit definition
// (T2.3 SelectionManager). Defaults are tuned for ~8-min single battles.
const DEFAULT_STATS = Object.freeze({
  [UnitType.WORKER]:  { maxHp: 20,  attack: 2, defense: 1, canMove: true  },
  [UnitType.SOLDIER]: { maxHp: 40,  attack: 8, defense: 4, canMove: true  },
  [UnitType.ARCHER]:  { maxHp: 25,  attack: 10, defense: 2, canMove: true  },
  [UnitType.KNIGHT]:  { maxHp: 60,  attack: 12, defense: 8, canMove: true  },
  [UnitType.HERO]:    { maxHp: 100, attack: 18, defense: 10, canMove: true },
});

export class UnitInstance {
  constructor({
    id,
    faction,
    type,
    position,
    hp,
    maxHp,
    attack,
    defense,
    buffs = [],
    canMove,
  } = {}) {
    if (typeof id !== 'string' || id.length === 0) {
      throw new TypeError(`UnitInstance: id must be a non-empty string`);
    }
    if (typeof faction !== 'string' || faction.length === 0) {
      throw new TypeError(`UnitInstance: faction must be a non-empty string`);
    }
    if (!VALID_TYPES.has(type)) {
      throw new RangeError(
        `UnitInstance: type must be one of ${[...VALID_TYPES].join(', ')} (got "${type}")`
      );
    }
    if (!position || !Number.isInteger(position.x) || !Number.isInteger(position.y)) {
      throw new TypeError('UnitInstance: position must be {x, y} integer coordinates');
    }
    if (position.x < 0 || position.y < 0) {
      throw new RangeError('UnitInstance: position coordinates must be >= 0');
    }

    const def = DEFAULT_STATS[type];
    const resolvedMaxHp = maxHp ?? def.maxHp;
    const resolvedHp = hp ?? resolvedMaxHp;
    if (!Number.isInteger(resolvedHp) || resolvedHp < 0) {
      throw new RangeError(`UnitInstance: hp must be a non-negative integer (got ${resolvedHp})`);
    }
    if (!Number.isInteger(resolvedMaxHp) || resolvedMaxHp <= 0) {
      throw new RangeError(`UnitInstance: maxHp must be a positive integer (got ${resolvedMaxHp})`);
    }
    if (resolvedHp > resolvedMaxHp) {
      throw new RangeError(
        `UnitInstance: hp (${resolvedHp}) must not exceed maxHp (${resolvedMaxHp})`
      );
    }

    this.id = id;
    this.faction = faction;
    this.type = type;
    this.position = { x: position.x, y: position.y };
    this.maxHp = resolvedMaxHp;
    this.hp = resolvedHp;
    this.attack = attack ?? def.attack;
    this.defense = defense ?? def.defense;
    this.canMove = canMove ?? def.canMove;
    this.buffs = [];

    for (const buff of buffs) this.addBuff(buff);
  }

  // === Lifecycle ===

  takeDamage(amount) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError(
        `UnitInstance.takeDamage: amount must be a non-negative finite number (got ${amount})`
      );
    }
    const before = this.hp;
    this.hp = Math.max(0, this.hp - Math.floor(amount));
    return before - this.hp;   // actual damage dealt (capped at 0)
  }

  heal(amount) {
    if (!Number.isFinite(amount) || amount < 0) {
      throw new RangeError(
        `UnitInstance.heal: amount must be a non-negative finite number (got ${amount})`
      );
    }
    const before = this.hp;
    this.hp = Math.min(this.maxHp, this.hp + Math.floor(amount));
    return this.hp - before;   // actual amount healed (capped at maxHp)
  }

  isDead() {
    return this.hp <= 0;
  }

  // === Movement ===

  // Just updates own position. BattleMap is responsible for fixing
  // Tile.occupant refs when this is called via map.moveUnit().
  moveTo({ x, y }) {
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new TypeError(
        `UnitInstance.moveTo: requires {x, y} integer coordinates`
      );
    }
    if (x < 0 || y < 0) {
      throw new RangeError('UnitInstance.moveTo: coordinates must be >= 0');
    }
    this.position = { x, y };
  }

  // === Buffs ===

  addBuff(buff) {
    if (!buff || typeof buff.name !== 'string' || buff.name.length === 0) {
      throw new TypeError(
        `UnitInstance.addBuff: buff must have a non-empty "name" string`
      );
    }
    if (this.hasBuff(buff.name)) return false;
    this.buffs.push({ ...buff });
    return true;
  }

  removeBuff(name) {
    const idx = this.buffs.findIndex((b) => b.name === name);
    if (idx < 0) return false;
    this.buffs.splice(idx, 1);
    return true;
  }

  hasBuff(name) {
    return this.buffs.some((b) => b.name === name);
  }

  getBuff(name) {
    return this.buffs.find((b) => b.name === name) ?? null;
  }

  // === Serialization (SaveSubsystem T2.5) ===

  serialize() {
    return {
      id: this.id,
      faction: this.faction,
      type: this.type,
      position: { ...this.position },
      hp: this.hp,
      maxHp: this.maxHp,
      attack: this.attack,
      defense: this.defense,
      canMove: this.canMove,
      buffs: this.buffs.map((b) => ({ ...b })),
    };
  }
}
