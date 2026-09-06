// web/js/ui/ActionPanel.js
//
// W2 T2.4 — ActionPanel overlay (bottom-center). Buttons for the
// current turn's available actions. Pure DOM; knows nothing about
// Phaser rendering.
//
// Buttons (data-action attribute drives the matching constant):
//   - end-turn  -> always enabled once a TURN_START has fired for the
//                  player phase; disabled on ENEMY phase
//   - move      -> enabled when a friendly unit is selected
//   - attack    -> enabled when a friendly unit is selected AND there's
//                  a valid enemy target on hover (W2 stub: just friendly selected)
//   - build     -> W3+; always disabled in W2
//
// Events (BattleEvents catalog in core/EventBus.js):
//   turn:start            { context: TurnContext } -> enable end-turn only on PLAYER phase
//   turn:end              { context: TurnContext } -> disable end-turn (busy phase)
// Events (SelectionEvents from SelectionManager):
//   selection:unit        { unitId, faction }      -> enable move/attack if friendly
//   selection:target      { tile }                 -> (future) show attack target preview
//   selection:cleared     {}                       -> disable move/attack

import { BattleEvents } from '../core/EventBus.js';
import { SelectionEvents } from '../core/SelectionManager.js';

export class ActionPanel {
  /**
   * @param {object} deps
   * @param {import('../core/EventBus.js').EventBus} deps.eventBus
   * @param {string} [deps.playerFaction='panda'] - faction considered "friendly"
   * @param {HTMLElement} [deps.root] - override the default #action-panel
   * @param {(action: string) => void} [deps.onAction] - callback for clicks
   */
  constructor({ eventBus, playerFaction = 'panda', root, onAction } = {}) {
    if (!eventBus || typeof eventBus.on !== 'function') {
      throw new TypeError('ActionPanel: eventBus must be an EventBus instance');
    }
    this._bus = eventBus;
    this._playerFaction = playerFaction;
    this._onAction = typeof onAction === 'function' ? onAction : null;
    this._root = root || document.getElementById('action-panel');
    if (!this._root) {
      throw new Error('ActionPanel: missing #action-panel root element');
    }
    this._buttons = {};
    this._root.querySelectorAll('button.action-btn').forEach((b) => {
      const action = b.dataset.action;
      if (action) {
        this._buttons[action] = b;
        b.disabled = true;
        b.addEventListener('click', () => this._fire(action));
      }
    });

    // No-selection baseline: nothing enabled.
    this._hasSelection = false;
    this._phase = null;
    this._refresh();
  }

  init() {
    if (this._initialized) return;
    this._handleSelected = (p) => {
      this._hasSelection = true;
      // Only the player's own units unlock move/attack in W2.
      this._friendlySelected = p.faction === this._playerFaction;
      this._refresh();
    };
    this._handleDeselected = () => {
      this._hasSelection = false;
      this._friendlySelected = false;
      this._refresh();
    };
    this._handleTurnStart = (p) => {
      this._phase = p.context.phase;
      this._refresh();
    };
    this._handleTurnEnd = (p) => {
      this._phase = p.context.phase;
      this._refresh();
    };
    this._bus.on(SelectionEvents.UNIT_SELECTED, this._handleSelected);
    this._bus.on(SelectionEvents.DESELECTED,    this._handleDeselected);
    this._bus.on(BattleEvents.TURN_START,       this._handleTurnStart);
    this._bus.on(BattleEvents.TURN_END,         this._handleTurnEnd);
    this._initialized = true;
  }

  destroy() {
    if (!this._initialized) return;
    this._bus.off(SelectionEvents.UNIT_SELECTED, this._handleSelected);
    this._bus.off(SelectionEvents.DESELECTED,    this._handleDeselected);
    this._bus.off(BattleEvents.TURN_START,       this._handleTurnStart);
    this._bus.off(BattleEvents.TURN_END,         this._handleTurnEnd);
    this._initialized = false;
  }

  get root() { return this._root; }

  /** Programmatic dispatch — useful for tests + keyboard shortcuts later. */
  trigger(action) { this._fire(action); }

  /** @private */
  _fire(action) {
    if (!this._onAction) return;
    if (this._buttons[action] && this._buttons[action].disabled) return;
    this._onAction(action);
  }

  /** @private — recompute disabled state of every button. */
  _refresh() {
    // Use TurnPhase constants (core/TurnContext.js) — string values are
    // lowercase 'player_turn' / 'enemy_turn' / 'event_turn' / 'end_round'.
    const canEndTurn = this._phase === 'player_turn';
    const canMove    = this._hasSelection && this._friendlySelected && canEndTurn;
    const canAttack  = this._hasSelection && this._friendlySelected && canEndTurn;

    if (this._buttons['end-turn']) this._buttons['end-turn'].disabled = !canEndTurn;
    if (this._buttons['move'])     this._buttons['move'].disabled     = !canMove;
    if (this._buttons['attack'])   this._buttons['attack'].disabled   = !canAttack;
    if (this._buttons['build'])    this._buttons['build'].disabled    = true; // W3+
  }
}