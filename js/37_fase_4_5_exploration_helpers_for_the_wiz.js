/* ======================================================================
   FASE 4.5 — Exploration helpers for the wizard step.

   The Fase 1 engine (determineExplorationDice / selectExplorationTable /
   rollExplorationDice / resolveExplorationRoll) is canon-correct but
   participant-agnostic. The wizard needs to map its current state to
   one exploration context per participant, then roll and resolve.

     - getWizardExplorationContexts(w, opts): array of per-participant
       contexts { warbandId, dice, tableName, alreadyDiscovered, factionId }.
       Free context: 1 entry from WIZARD.lfb, dice=lfb.dicePicked,
       tableName='common'. Campaign: one per participant, dice and
       tableName derived from campaign.gameNumber.
     - rollWizardExploration(ctx, opts): rolls and resolves one ctx,
       returning { dice, rollTotal, rerollUsed, rerollWinUsed, result }.

   Out of scope for 4.5: option-pick modal, fork modal, applying the
   chosen effect to the warband. Those land in CLAUDE.md Fase 5.
   ====================================================================== */

function getWizardExplorationContexts(w, opts) {
  if (!w) return [];
  opts = opts || {};
  const getWb = opts.getWarband || ((id) => (typeof loadWarband === 'function' ? loadWarband(id) : null));
  const out = [];
  if (w.context === 'free') {
    const lfb = w.lfb || {};
    if (!lfb.warbandId) return [];
    const wb = getWb(lfb.warbandId) || {};
    out.push({
      warbandId: lfb.warbandId,
      dice: typeof lfb.dicePicked === 'number' ? lfb.dicePicked : 3,
      tableName: 'common',
      alreadyDiscovered: Array.isArray(wb.discoveredLocations) ? wb.discoveredLocations.slice() : [],
      factionId: wb.factionId || null,
    });
    return out;
  }
  // Campaign context: one ctx per participant. Game number drives the
  // dice count and which table is consulted (lower-tier as default
  // preference in overlap ranges, matching selectExplorationTable's
  // contract).
  if (!w.battle || !Array.isArray(w.battle.participants)) return [];
  const camp = opts.campaign || (typeof STATE !== 'undefined' ? STATE.currentCampaign : null);
  const gameNumber = camp && camp.gameNumber ? camp.gameNumber : 1;
  for (const part of w.battle.participants) {
    if (!part || !part.warbandId) continue;
    const wb = getWb(part.warbandId) || {};
    out.push({
      warbandId: part.warbandId,
      dice: determineExplorationDice(gameNumber, false),
      tableName: selectExplorationTable(gameNumber, false, opts.preference),
      alreadyDiscovered: Array.isArray(wb.discoveredLocations) ? wb.discoveredLocations.slice() : [],
      factionId: wb.factionId || null,
    });
  }
  return out;
}

function rollWizardExploration(ctx, opts) {
  ctx = ctx || {};
  const dice = typeof ctx.dice === 'number' && ctx.dice > 0 ? ctx.dice : 0;
  const r = rollExplorationDice(dice, opts || {});
  const result = resolveExplorationRoll(r.rollTotal, ctx.tableName || 'common',
                                        ctx.alreadyDiscovered || [], ctx.factionId || null);
  return {
    dice: r.dice,
    rollTotal: r.rollTotal,
    rerollUsed: r.rerollUsed,
    rerollWinUsed: r.rerollWinUsed,
    result,
  };
}


