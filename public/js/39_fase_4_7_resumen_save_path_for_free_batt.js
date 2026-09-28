/* ======================================================================
   FASE 4.7 — Resumen + save path for free-battle context.

   Two pure helpers carry the conversion + mutation:

     - wizardBattleToFreeBattle(w): folds WIZARD.battle (campaign-style
       shape: participants[].modelOutcomes[]) plus WIZARD.lfb into a
       FreeBattle (shape from createFreeBattle). Single-participant
       only — free context has exactly one warband.
     - applyWizardOutcomesToWarband(wb, w, fb): mutates the warband in
       place. Appends XP gain to baseProgression.xp, appends scars
       and advancements to their respective lists, sets cannotGainXp
       when an injury is the Head Wound, and merges discoveredLocations
       (pillaged rolls do NOT add — they leave no key behind).

   The save handler combines them with addFreeBattle, which already
   persists via persistWarband (Fase 2 path).
   ====================================================================== */

function wizardBattleToFreeBattle(w, opts) {
  // Tolerate degenerate input — the wizard should never call this with
  // a malformed state, but defensive code keeps tests + edge cases sane.
  if (!w || !w.battle || !Array.isArray(w.battle.participants) || !w.battle.participants.length) {
    return createFreeBattle({});
  }
  const part = w.battle.participants[0];
  const lfb  = w.lfb || {};
  const fb = createFreeBattle({
    name: lfb.name,
    opponent: lfb.opponent,
    scenarioId: lfb.scenarioId || w.battle.scenario,
    dicePicked: typeof lfb.dicePicked === 'number' ? lfb.dicePicked : undefined,
  });
  fb.result = part.result || null;
  fb.completedAt = new Date().toISOString();
  fb.loot  = typeof part.ducatsEarned === 'number' ? part.ducatsEarned : 0;
  fb.glory = typeof part.gloryEarned  === 'number' ? part.gloryEarned  : 0;
  // Canon p.113 — Looting: cada Exploration Roll da rollTotal × 10 👑
  // (lootDucats), la fuente principal de dinero. Antes se mostraba pero
  // NO se acreditaba al strongbox; ahora se suma al loot de la batalla.
  {
    const disc0 = (Array.isArray(w.battle.discoveries) ? w.battle.discoveries : [])
                    .find(d => d && d.warbandId === part.warbandId);
    if (disc0 && disc0.result && typeof disc0.result.lootDucats === 'number') {
      fb.loot += disc0.result.lootDucats;
    }
  }
  // Fase 5.3 — add-ducats effects from chosen exploration options pile
  // onto the battle loot. Other effects land on the discovery as
  // pendingEffect (see the discoveries loop below).
  fb.loot += sumExplorationDucatsBonus(w);
  fb.notes = w.battle.notes || '';

  // P1/2 — resolve the warband to honour cannotGainXp. Callers may
  // pass opts.wb to skip the lookup; we fall back to loadWarband when
  // available. Without a resolved warband we proceed with the legacy
  // (no-flag) behaviour, which is what older fixtures expect.
  opts = opts || {};
  let resolvedWb = opts.wb;
  if (!resolvedWb && typeof loadWarband === 'function' && part.warbandId) {
    resolvedWb = loadWarband(part.warbandId);
  }

  // Glorious Deeds — +1 ☼ each (canon p.97), on top of the base reward.
  fb.glory += participantDeedCount(part);
  // Glory Hound (Wildcard 10) — +1 ☼ per skill-bearer on the field.
  if (resolvedWb) fb.glory += gloryHoundBonus(resolvedWb, part.modelOutcomes || []);
  const findModel = (uid) => {
    if (!resolvedWb || !Array.isArray(resolvedWb.models)) return null;
    return resolvedWb.models.find(m => m.uid === uid) || null;
  };

  // xpAwarded map: only models that actually gained XP land in the map.
  fb.xpAwarded = {};
  if (Array.isArray(part.modelOutcomes)) {
    for (const out of part.modelOutcomes) {
      const gain = computeModelXPGain(out, findModel(out.modelUid), resolvedWb);
      if (gain > 0) fb.xpAwarded[out.modelUid] = gain;
    }
  }

  // traumaResults: one entry per OoA model that has an injury recorded.
  fb.traumaResults = [];
  if (Array.isArray(part.modelOutcomes)) {
    for (const out of part.modelOutcomes) {
      if (out && out.outOfAction && out.injury) {
        fb.traumaResults.push(Object.assign({ modelUid: out.modelUid }, out.injury));
      }
    }
  }

  // discoveries: capture the single exploration roll for the participant.
  // We record the canonical key so a future Fase 5 modal can replay or
  // navigate the entry, and we keep kind/rollTotal for downstream UI.
  fb.discoveries = [];
  const disc = (Array.isArray(w.battle.discoveries) ? w.battle.discoveries : [])
                .find(d => d && d.warbandId === part.warbandId);
  if (disc && disc.result) {
    const key = explorationKeyFor(disc);
    const effectSummary = extractExplorationEffectSummary(disc);
    fb.discoveries.push({
      key,
      kind: disc.result.kind,
      name: disc.result.entry ? disc.result.entry.name : null,
      rollTotal: disc.rollTotal,
      lootDucats: disc.result.lootDucats || 0,
      chosenOptionId: disc.chosenOptionId || null,
      chosenOption: disc.chosenOption || null,
      // Fase 5.3 — unresolved effect (e.g. choose-battlekit) preserved
      // verbatim for future-subphase UI to consume. Null when the
      // chosen option's effect was auto-applied (add-ducats) or absent.
      pendingEffect: effectSummary.pending,
    });
  }

  return fb;
}

/* Reusable key builder. Mirrors resolveExplorationRoll's encoding:
 *   'common:6'        for top-level discoveries
 *   'common:6#1'      for forks (forkIndex)
 *   null              for pillaged rolls (no key persists)
 *
 * Free context always rolls against the Common table; for campaign we
 * would extend this to consult the ctx tableName, but in 4.7 we only
 * persist free saves so 'common' is correct.
 */

