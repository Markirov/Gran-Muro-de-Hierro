/* ======================================================================
   FASE 4.4 — Pure XP helpers for the wizard's Promotions/XP step.

   The previous renderWizardAdvancements inlined XP math AND assumed
   campaign context (XP source = c.warbandStates). To make the same step
   work for free battles, we split the calculation in three pieces:

     - computeModelXPGain(out): pure function of the modelOutcome.
       Survived participation = +1, plus kills + feats, plus the
       canon "Bitter Experience" injury (+1).
     - getCurrentModelXP(wb, uid, ctx): context-aware lookup.
       Campaign reads from ctx.warbandStates (computed replay state).
       Free reads from wb.models[i].baseProgression.xp (the warband's
       own source of truth).
     - wizardHasAdvancements(w, opts): true iff at least one model
       crosses an XP threshold this battle. Used to surface a clean
       "nothing to assign" early-exit instead of an empty list.

   Out of scope: cannotGainXp (Head Wound). The previous code did not
   honour it and changing that behaviour belongs to a separate
   canon-fidelity pass tracked in BACKLOG.md.
   ====================================================================== */

/* Canon-correct XP per ELITE per battle (Digital Rulebook p.103-104):
 *   - Only ELITE models gain XP through this mechanism. Troops use the
 *     Promotion Pool instead and get 0 here.
 *   - ELITE that took part and survived: +1 XP (even if Out of Action).
 *     "Survived" means not killed in Trauma — captured is treated as
 *     not-surviving by default since the ransom decision is ambiguous
 *     at compute time; the player can manually adjust if ransom paid.
 *   - ELITE that performed ≥1 Glorious Deed: +1 extra (cap, no matter
 *     how many Deeds). Kills do NOT grant XP per canon.
 *   - Bitter Lessons (D66 65) is D3 XP applied at trauma resolution
 *     time, not here. The legacy 'bitter-exp' id is kept as +1 fallback
 *     for pre-D66 fixtures.
 *
 * When called without a model (legacy archival path in
 * convertCampaignBattlesToFreeBattles), the ELITE gate is skipped —
 * the caller has no way to resolve the model and the function is only
 * used for display metadata at that point.
 */
function _outcomeModelIsElite(model, wb) {
  if (!model) return false;
  if (model.baseProgression && model.baseProgression.promotedToElite) return true;
  if (Array.isArray(model.companionKeywords)) {
    for (const k of model.companionKeywords) {
      const name = (typeof k === 'string' ? k : (k && k.name) || '').toUpperCase();
      if (name === 'ELITE') return true;
    }
  }
  if (wb && typeof isModelElite === 'function') {
    try { if (isModelElite(model, wb)) return true; } catch (e) {}
  }
  return false;
}


