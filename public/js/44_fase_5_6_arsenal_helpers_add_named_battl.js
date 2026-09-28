/* ======================================================================
   FASE 5.6 — Arsenal helpers + add-named-battlekit auto-apply.

   The Arsenal is the warband-level shared equipment pool. Effects of
   kind 'add-named-battlekit' (e.g., Trench Shrine → Field Shrine /
   Troop Flag) drop a named item there. We expose pure add/remove
   helpers and a save-time application path; UI surfacing of the
   arsenal contents is left to a later subfase.
   ====================================================================== */

function addToArsenal(wb, item) {
  if (!wb) return;
  if (!Array.isArray(wb.arsenal)) wb.arsenal = [];
  if (!item || !item.name) return;
  // Dedupe by name — the table sometimes lists "Add X to Arsenal" as a
  // recurring discovery option; we don't double-stack the same kit.
  if (wb.arsenal.some(e => e && e.name === item.name)) return;
  wb.arsenal.push({
    name: item.name,
    currency: item.currency || '👑',
    cost: typeof item.cost === 'number' ? item.cost : 0,
    addedAt: new Date().toISOString(),
    source: item.source || 'manual',
  });
}

function removeFromArsenal(wb, idx) {
  if (!wb || !Array.isArray(wb.arsenal)) return;
  if (typeof idx !== 'number' || idx < 0 || idx >= wb.arsenal.length) return;
  wb.arsenal.splice(idx, 1);
}


