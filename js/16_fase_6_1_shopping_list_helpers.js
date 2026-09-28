/* ======================================================================
   FASE 6.1 — Shopping list helpers.

   The list lives on wb.shoppingList. Entries are normalized as
   { modelUid, kitId, priority, addedAt } and kept ordered with
   priority 1..N matching array position; reorders and removes
   re-number the priorities so the field remains the source of truth
   for the UI's sort order.

   Helpers are pure-ish (they mutate wb) and tolerate degenerate input
   without throwing — callers from event handlers shouldn't have to
   guard for null.
   ====================================================================== */

function _renumberShoppingPriorities(wb) {
  if (!wb || !Array.isArray(wb.shoppingList)) return;
  for (let i = 0; i < wb.shoppingList.length; i++) {
    wb.shoppingList[i].priority = i + 1;
  }
}

function addToShoppingList(wb, item) {
  if (!wb) return;
  if (!Array.isArray(wb.shoppingList)) wb.shoppingList = [];
  if (!item || !item.modelUid || !item.kitId) return;
  // Dedupe on (modelUid, kitId).
  if (wb.shoppingList.some(e => e.modelUid === item.modelUid && e.kitId === item.kitId)) {
    return;
  }
  wb.shoppingList.push({
    modelUid: item.modelUid,
    kitId: item.kitId,
    priority: wb.shoppingList.length + 1,
    addedAt: new Date().toISOString(),
  });
}

function removeFromShoppingList(wb, idx) {
  if (!wb || !Array.isArray(wb.shoppingList)) return;
  if (typeof idx !== 'number' || idx < 0 || idx >= wb.shoppingList.length) return;
  wb.shoppingList.splice(idx, 1);
  _renumberShoppingPriorities(wb);
}

function reorderShoppingList(wb, fromIdx, toIdx) {
  if (!wb || !Array.isArray(wb.shoppingList)) return;
  const n = wb.shoppingList.length;
  if (typeof fromIdx !== 'number' || typeof toIdx !== 'number') return;
  if (fromIdx < 0 || fromIdx >= n || toIdx < 0 || toIdx >= n) return;
  if (fromIdx === toIdx) return;
  const [moved] = wb.shoppingList.splice(fromIdx, 1);
  wb.shoppingList.splice(toIdx, 0, moved);
  _renumberShoppingPriorities(wb);
}

function findShoppingListEntry(wb, modelUid, kitId) {
  if (!wb || !Array.isArray(wb.shoppingList)) return null;
  return wb.shoppingList.find(e => e.modelUid === modelUid && e.kitId === kitId) || null;
}

/* Fase 6.2 — Detail-panel toggle helpers.
 *
 * isInShoppingList is the cheap presence check the UI uses to render
 * "✓ En lista" vs "+ Lista de la compra" on each kit card.
 * toggleShoppingListEntry pairs add/remove so a single click flips
 * the state — common pattern for kit-level affordances embedded in
 * the upgrade list, where the player wants to "park" something
 * without leaving the model detail view.
 */
function isInShoppingList(wb, modelUid, kitId) {
  return !!findShoppingListEntry(wb, modelUid, kitId);
}

function toggleShoppingListEntry(wb, modelUid, kitId) {
  if (!wb || !modelUid || !kitId) return;
  if (!Array.isArray(wb.shoppingList)) wb.shoppingList = [];
  const idx = wb.shoppingList.findIndex(e => e.modelUid === modelUid && e.kitId === kitId);
  if (idx >= 0) {
    removeFromShoppingList(wb, idx);
  } else {
    addToShoppingList(wb, { modelUid, kitId });
  }
}

/* Fase 6.3 — Shopping rows for the QM tab.
 *
 * For each entry, resolves the model + the kit definition so the UI
 * can render a meaningful row (model name, kit name, cost, currency,
 * affordability). When the model or the kit cannot be resolved
 * (deleted model, faction migration, etc.) we still emit a row with
 * resolved=false so the player can clean up the stale entry from the
 * UI rather than getting stuck.
 */

