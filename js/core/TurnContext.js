// web/js/core/TurnContext.js
//
// Immutable snapshot of the current turn. The state machine (BattleLoop)
// replaces TurnContext on each phase advance — never mutates. Frozen
// arrays / strings on construction prevent accidental downstream mutation.
//
// W2 T2.1 contract (2nd of 3 deliverables):
//   - phase ∈ TurnPhase
//   - currentPlayerId: string|null
//   - availableActions: read-only list of action names exposed to UI
//   - roundNumber: 1-based
//
// nextPhase() is the canonical phase graph (PLAYER -> ENEMY -> EVENT ->
// END_ROUND). It returns null at END_ROUND — caller decides whether to
// close the round (BattleLoop does) or stay frozen (game over before loop).

export const TurnPhase = Object.freeze({
  PLAYER_TURN: 'player_turn',
  ENEMY_TURN:  'enemy_turn',
  EVENT_TURN:  'event_turn',
  END_ROUND:   'end_round',
});

const PHASE_ORDER = Object.freeze([
  TurnPhase.PLAYER_TURN,
  TurnPhase.ENEMY_TURN,
  TurnPhase.EVENT_TURN,
  TurnPhase.END_ROUND,
]);

const VALID_PHASE_SET = new Set(Object.values(TurnPhase));

export class TurnContext {
  constructor({ phase, currentPlayerId, availableActions = [], roundNumber = 1 } = {}) {
    if (phase === undefined || phase === null) {
      throw new RangeError('TurnContext: phase is required');
    }
    if (!VALID_PHASE_SET.has(phase)) {
      throw new RangeError(`TurnContext: unknown phase "${phase}"`);
    }
    if (!Number.isInteger(roundNumber) || roundNumber < 1) {
      throw new RangeError(
        `TurnContext: roundNumber must be a positive integer (got ${roundNumber})`
      );
    }
    if (availableActions !== undefined && !Array.isArray(availableActions)) {
      throw new TypeError(
        'TurnContext: availableActions must be an array (or omitted)'
      );
    }
    if (currentPlayerId !== null && currentPlayerId !== undefined &&
        typeof currentPlayerId !== 'string') {
      throw new TypeError(
        'TurnContext: currentPlayerId must be a string or null'
      );
    }
    this.phase = phase;
    this.currentPlayerId = currentPlayerId ?? null;
    this.availableActions = availableActions;
    this.roundNumber = roundNumber;
    Object.freeze(this.availableActions);
    Object.freeze(this);
  }

  static initial(currentPlayerId = 'player') {
    return new TurnContext({
      phase: TurnPhase.PLAYER_TURN,
      currentPlayerId,
      availableActions: ['move', 'attack', 'build', 'end_turn'],
      roundNumber: 1,
    });
  }

  // Returns a new TurnContext with overrides. Original is untouched.
  with({ phase, currentPlayerId, availableActions, roundNumber } = {}) {
    return new TurnContext({
      phase: phase ?? this.phase,
      currentPlayerId: currentPlayerId !== undefined ? currentPlayerId : this.currentPlayerId,
      availableActions: availableActions ?? this.availableActions,
      roundNumber: roundNumber ?? this.roundNumber,
    });
  }

  // Next phase in the canonical graph, or null at END_ROUND.
  nextPhase() {
    const idx = PHASE_ORDER.indexOf(this.phase);
    if (idx < 0 || idx >= PHASE_ORDER.length - 1) return null;
    return PHASE_ORDER[idx + 1];
  }
}
