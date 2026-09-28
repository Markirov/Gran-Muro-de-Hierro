/* ======================================================================
   FASE 5.5 — Resolve grant-xp-to-elites pending effect.

   Effects of kind 'grant-xp-to-elites' give +xp to up to maxModels
   ELITE models in the warband, chosen by the player. We expose:

     - getEliteModels(wb): pure list of models flagged ELITE either via
       the canon unit keywords (DATA.factions[fid].units[].keywords) or
       Companion-imported keywords (companionKeywords as strings or
       {name}). Both shapes coexist in real saves.
     - resolveGrantXpToEliteTargets(disc, modelUids): stores the
       player's pick on disc.chosenOption.resolvedTargets, capped at
       effect.maxModels. No-op if the effect kind is wrong.

   Application of the XP happens inside applyWizardOutcomesToWarband
   so the bookkeeping (initialise baseProgression, +xp) stays in one
   place. cannotGainXp is honoured at the canonical write-time gate.
   ====================================================================== */

function getEliteModels(wb) {
  if (!wb || !Array.isArray(wb.models)) return [];
  const out = [];
  for (const m of wb.models) {
    if (!m) continue;
    let isElite = false;
    // Companion path: companionKeywords can be array of strings OR {name}.
    if (Array.isArray(m.companionKeywords)) {
      for (const k of m.companionKeywords) {
        const name = (typeof k === 'string' ? k : (k && k.name) || '').toUpperCase();
        if (name === 'ELITE') { isElite = true; break; }
      }
    }
    // Canon unit path: look up unit's keywords if resolvable.
    if (!isElite && wb.factionId && m.unitId && typeof getUnit === 'function') {
      const u = getUnit(wb.factionId, m.unitId);
      if (u && Array.isArray(u.keywords) && u.keywords.includes('ELITE')) isElite = true;
      // Also tier-based: some unit catalogs mark tier='elite' instead of keyword.
      if (!isElite && u && u.tier === 'elite') isElite = true;
    }
    if (isElite) out.push(m);
  }
  return out;
}


