/* ======================================================================
   FASE 5.2 — Exploration re-roll mechanics.

   Canon p.113: after the initial roll, the player may re-roll one die
   (general re-roll). If the player won the game, a second re-roll is
   available (win re-roll). Each is one-shot per battle.

   The Fase 1 engine rollExplorationDice already honours both via opts
   { won, useReroll, useWinReroll }. These helpers wire the wizard
   state to it: detect won-status from the participant result, expose
   per-discovery remaining re-rolls, and apply them mutating the
   stored discovery record.
   ====================================================================== */

function wizardWonForWarband(w, warbandId) {
  if (!w || !w.battle || !Array.isArray(w.battle.participants)) return false;
  const part = w.battle.participants.find(p => p && p.warbandId === warbandId);
  return !!(part && part.result === 'win');
}

function wizardRerollStatus(disc) {
  if (!disc) return { generalAvailable: false, winAvailable: false };
  return {
    generalAvailable: !disc.rerollUsed,
    winAvailable:     !disc.rerollWinUsed,
  };
}

function applyWizardExplorationReroll(w, ctx, kind) {
  if (!w || !w.battle || !Array.isArray(w.battle.discoveries) || !ctx) return;
  const disc = w.battle.discoveries.find(d => d && d.warbandId === ctx.warbandId);
  if (!disc) return;
  const status = wizardRerollStatus(disc);

  if (kind === 'general') {
    if (!status.generalAvailable) return;
    // Re-roll with engine. We forward whatever win-state already applied
    // and only the general re-roll flag — the engine picks the lowest die.
    const r = rollExplorationDice(ctx.dice, {
      won: wizardWonForWarband(w, ctx.warbandId),
      useReroll: true,
      useWinReroll: disc.rerollWinUsed || false,
    });
    Object.assign(disc, {
      dice: r.dice,
      rollTotal: r.rollTotal,
      rerollUsed: true,
      result: resolveExplorationRoll(r.rollTotal, ctx.tableName || disc.tableName || 'common',
                                     ctx.alreadyDiscovered || [], ctx.factionId || null),
    });
    // Drop any prior pick — the result entry may have changed.
    delete disc.chosenOptionId;
    delete disc.chosenOption;
    return;
  }

  if (kind === 'win') {
    if (!status.winAvailable) return;
    if (!wizardWonForWarband(w, ctx.warbandId)) return;  // canon gate
    const r = rollExplorationDice(ctx.dice, {
      won: true,
      useReroll: disc.rerollUsed || false,
      useWinReroll: true,
    });
    Object.assign(disc, {
      dice: r.dice,
      rollTotal: r.rollTotal,
      rerollWinUsed: true,
      result: resolveExplorationRoll(r.rollTotal, ctx.tableName || disc.tableName || 'common',
                                     ctx.alreadyDiscovered || [], ctx.factionId || null),
    });
    delete disc.chosenOptionId;
    delete disc.chosenOption;
    return;
  }
  // Unknown kind: no-op
}


