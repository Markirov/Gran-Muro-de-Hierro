/* ======================================================================
   FASE 8 — Convert campaign battles to free battles on deletion.

   When the player deletes a campaign, the work that went into each
   battle (XP, ducats, traumas, scenario) shouldn't vanish. We
   produce one FreeBattle entry per (battle × participant) so each
   warband keeps a coherent personal history.

   convertCampaignBattlesToFreeBattles(c) is pure: returns a map
   { [warbandId]: [FreeBattle, ...] } without touching wb storage.
   The caller (deleteCampaignWithConversion) applies the map and
   then deletes the campaign.
   ====================================================================== */

function convertCampaignBattlesToFreeBattles(c) {
  if (!c || !Array.isArray(c.battles)) return {};
  const map = {};
  for (const b of c.battles) {
    const parts = Array.isArray(b.participants) ? b.participants : [];
    for (const part of parts) {
      if (!part || !part.warbandId) continue;
      const otherWbIds = parts
        .filter(p => p && p.warbandId && p.warbandId !== part.warbandId)
        .map(p => p.warbandId);
      const fb = createFreeBattle({
        name: `Importada · ${c.name || c.id} · ${b.scenario || 'batalla'}`,
        opponent: otherWbIds.join(', '),
        scenarioId: b.scenario || null,
      });
      // Tag as legacy-from-campaign for traceability and to let the UI
      // distinguish these entries if it wants (e.g., a badge in the
      // historial). 'free' is still the high-level origin family.
      fb.origin = 'free-from-campaign';
      fb.result = part.result || null;
      const ts = b.date ? new Date(b.date).toISOString() : new Date().toISOString();
      fb.timestamp = ts;
      fb.completedAt = ts;
      fb.loot  = typeof part.ducatsEarned === 'number' ? part.ducatsEarned : 0;
      fb.glory = typeof part.gloryEarned  === 'number' ? part.gloryEarned  : 0;
      fb.notes = b.notes || '';
      fb.xpAwarded = {};
      fb.traumaResults = [];
      for (const out of (part.modelOutcomes || [])) {
        // Legacy conversion — no model arg available here (we don't
        // have the resolved warband), so the cannotGainXp gate is
        // bypassed. Acceptable for archival: XP that was already
        // applied to the warband during the live wizard stays as-is;
        // this conversion is just metadata preservation.
        const gain = computeModelXPGain(out);
        if (gain > 0) fb.xpAwarded[out.modelUid] = gain;
        if (out && out.outOfAction && out.injury) {
          fb.traumaResults.push(Object.assign({ modelUid: out.modelUid }, out.injury));
        }
      }
      // Campaign battles today don't carry discoveries — that's a
      // free-context-only field. Leave empty rather than fabricate.
      fb.discoveries = [];
      if (!map[part.warbandId]) map[part.warbandId] = [];
      map[part.warbandId].push(fb);
    }
  }
  return map;
}


