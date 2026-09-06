// web/js/ui/HUD.js
//
// W2 T2.4 — HUD overlay (top-left): round / current player / phase.
// Pure DOM updates; subscribes to EventBus and BattleEvents from
// BattleLoop. Knows nothing about Phaser or canvas rendering.
//
// Lifecycle:
//   const hud = new HUD({ eventBus });
//   hud.destroy()   // unsubscribe + clear DOM references
//
// Event contract (BattleEvents catalog in core/EventBus.js):
//   round:start  -> { roundNumber }
//   turn:start   -> { context: TurnContext }   (.phase, .currentPlayerId, ...)
//   turn:end     -> { context: TurnContext }
//
// The HUD always reflects the LATEST known value (last-wins).

import { BattleEvents } from '../core/EventBus.js';

export class HUD {
  /**
   * @param {object} deps
   * @param {import('../core/EventBus.js').EventBus} deps.eventBus
   * @param {HTMLElement} [deps.root] - override the default #hud
   */
  constructor({ eventBus, root } = {}) {
    if (!eventBus || typeof eventBus.on !== 'function') {
      throw new TypeError('HUD: eventBus must be an EventBus instance');
    }
    this._bus = eventBus;
    this._root = root || document.getElementById('hud');
    if (!this._root) {
      throw new Error('HUD: missing #hud root element');
    }
    this._roundEl = this._root.querySelector('#hud-round');
    this._playerEl = this._root.querySelector('#hud-player');
    this._phaseEl = this._root.querySelector('#hud-phase');

    // Default text — visible even before the first event.
    this._set('round',  '—');
    this._set('player', '—');
    this._set('phase',  '—');

    this._handleRound = (p) => this._set('round', p.roundNumber);
    this._handleTurnStart = (p) => {
      const ctx = p.context;
      this._set('player', ctx.currentPlayerId);
      this._set('phase',  ctx.phase);
    };
    this._handleTurnEnd = (p) => {
      // Only update phase on TURN_END — playerId stays the same until next TURN_START
      this._set('phase', p.context.phase);
    };
  }

  /** Begin listening on the bus. Idempotent. */
  init() {
    if (this._initialized) return;
    this._bus.on(BattleEvents.ROUND_START, this._handleRound);
    this._bus.on(BattleEvents.TURN_START,  this._handleTurnStart);
    this._bus.on(BattleEvents.TURN_END,    this._handleTurnEnd);
    this._initialized = true;
  }

  /** Unsubscribe and drop DOM references. */
  destroy() {
    if (!this._initialized) return;
    this._bus.off(BattleEvents.ROUND_START, this._handleRound);
    this._bus.off(BattleEvents.TURN_START,  this._handleTurnStart);
    this._bus.off(BattleEvents.TURN_END,    this._handleTurnEnd);
    this._initialized = false;
  }

  get root() { return this._root; }

  /** @private */
  _set(field, value) {
    const el =
      field === 'round' ? this._roundEl :
      field === 'player' ? this._playerEl :
      field === 'phase' ? this._phaseEl : null;
    if (el) el.textContent = String(value);
  }
}