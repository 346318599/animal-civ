// web/js/core/BattleLoop.js
//
// Finite state machine driving the per-round turn graph:
//
//   round N:   PLAYER_TURN -> ENEMY_TURN -> EVENT_TURN -> END_ROUND
//   round N+1: PLAYER_TURN -> ENEMY_TURN -> EVENT_TURN -> END_ROUND
//                       ...                                       ...
//
// W2 T2.1 contract (1st of 3 deliverables):
//   - start(): enters PLAYER_TURN of round 1, emits ROUND_START then TURN_START
//   - advance({winner?}): called when current turn's actions resolve
//       - normal advance: TURN_END -> next phase -> TURN_START
//       - round wrap (from END_ROUND): TURN_END -> ROUND_END -> ROUND_START (N+1) -> TURN_START
//       - winner supplied: lock state, emit BATTLE_WIN/BATTLE_LOSE, ignore further advance()
//   - state queries: context, round, isRunning, isOver
//
// Pure logic. NO DOM, NO Phaser, NO storage. BattleLoop is the only owner
// of the turn graph; UI and AI both consume via the EventBus and never poke
// at the loop's private fields.

import { TurnContext, TurnPhase } from './TurnContext.js';
import { BattleEvents } from './EventBus.js';

export class BattleLoop {
  constructor({ eventBus, players = ['player', 'ai'] } = {}) {
    if (!eventBus || typeof eventBus.emit !== 'function') {
      throw new TypeError('BattleLoop: eventBus must be an EventBus instance');
    }
    if (!Array.isArray(players) || players.length < 2) {
      throw new RangeError(
        `BattleLoop: players must be an array of >= 2 (got ${JSON.stringify(players)})`
      );
    }
    for (const p of players) {
      if (typeof p !== 'string' || p.length === 0) {
        throw new TypeError(
          `BattleLoop: each player id must be a non-empty string (got ${JSON.stringify(p)})`
        );
      }
    }
    this._bus = eventBus;
    this._players = [...players];
    this._context = TurnContext.initial(this._players[0]);
    this._round = 1;
    this._isRunning = false;
    this._isOver = false;
  }

  // === Queries ===
  get context() { return this._context; }
  get round() { return this._round; }
  get isRunning() { return this._isRunning; }
  get isOver() { return this._isOver; }
  get players() { return [...this._players]; }

  // === Lifecycle ===

  start() {
    if (this._isOver) {
      throw new Error('BattleLoop.start: cannot restart after battle ended');
    }
    if (this._isRunning) return;
    this._isRunning = true;
    this._bus.emit(BattleEvents.ROUND_START, { roundNumber: this._round });
    this._bus.emit(BattleEvents.TURN_START, { context: this._context });
  }

  // Called when all actions of the current turn resolved.
  //   - no winner:  advance to next phase (or wrap to next round)
  //   - winner='player' (or matches players[0]): emit BATTLE_WIN, lock state
  //   - any other winner string: emit BATTLE_LOSE, lock state
  advance({ winner } = {}) {
    if (this._isOver) return;             // silent no-op after game over
    if (!this._isRunning) {
      throw new Error('BattleLoop.advance: call start() first');
    }

    // Pre-empt: game over hook fires synchronously from this advance() call.
    if (winner !== undefined && winner !== null) {
      this._finishBattle(winner);
      return;
    }

    this._bus.emit(BattleEvents.TURN_END, { context: this._context });

    const nextPhase = this._context.nextPhase();

    if (nextPhase === null) {
      // End of round reached — close, increment, loop back to PLAYER.
      this._bus.emit(BattleEvents.ROUND_END, { roundNumber: this._round });
      this._round++;
      this._context = this._context.with({
        phase: TurnPhase.PLAYER_TURN,
        currentPlayerId: this._players[0],
        availableActions: ['move', 'attack', 'build', 'end_turn'],
        roundNumber: this._round,
      });
      this._bus.emit(BattleEvents.ROUND_START, { roundNumber: this._round });
    } else {
      // Pick the actor for the upcoming phase. EVENT_TURN has no actor (a
      // roguelike event card fires). 2-player default: index 0=player, 1=ai.
      let actor = null;
      if (nextPhase === TurnPhase.PLAYER_TURN) {
        actor = this._players[0];
      } else if (nextPhase === TurnPhase.ENEMY_TURN) {
        actor = this._players[1] ?? this._players[0];
      }
      this._context = this._context.with({
        phase: nextPhase,
        currentPlayerId: actor,
      });
    }

    this._bus.emit(BattleEvents.TURN_START, { context: this._context });
  }

  // External hook for timeouts / forced end without winner. Battle ends;
  // both BATTLE_WIN and BATTLE_LOSE are *not* emitted (caller owns that
  // decision). TURN_END fires so UI can flush.
  forceEnd() {
    if (this._isOver || !this._isRunning) return;
    this._bus.emit(BattleEvents.TURN_END, { context: this._context });
    this._isRunning = false;
    this._isOver = true;
  }

  _finishBattle(winner) {
    this._bus.emit(BattleEvents.TURN_END, { context: this._context });
    const isPlayerWin = winner === this._players[0];
    const evt = isPlayerWin ? BattleEvents.BATTLE_WIN : BattleEvents.BATTLE_LOSE;
    this._bus.emit(evt, { winner, roundNumber: this._round });
    this._isRunning = false;
    this._isOver = true;
  }
}
