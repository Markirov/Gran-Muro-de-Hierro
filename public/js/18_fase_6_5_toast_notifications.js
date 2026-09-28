/* ======================================================================
   FASE 6.5 — Toast notifications.

   Lightweight non-blocking message at the bottom-right corner. Used by
   the save paths to surface "ganaste X 👑 · Y pendientes" without
   blocking the wizard with an alert().
   ====================================================================== */

function showToast(message, opts) {
  if (typeof document === 'undefined' || !message) return null;
  const container = document.getElementById('toast-container');
  if (!container) return null;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = message;
  container.appendChild(t);
  // Fade in next tick.
  setTimeout(() => t.classList.add('visible'), 10);
  const duration = (opts && opts.duration) || 4500;
  setTimeout(() => {
    t.classList.remove('visible');
    setTimeout(() => { if (t.parentNode) t.parentNode.removeChild(t); }, 300);
  }, duration);
  return t;
}

function postBattleToastSummary(wb, ducatsEarned) {
  const earned = typeof ducatsEarned === 'number' ? ducatsEarned : 0;
  const pending = (wb && Array.isArray(wb.shoppingList)) ? wb.shoppingList.length : 0;
  const earningsLine = `Ganaste ${earned} 👑.`;
  const listLine = pending > 0
    ? ` Tienes ${pending} item${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} en la lista de la compra.`
    : '';
  return earningsLine + listLine;
}

function qmShoppingRows(wb, balance) {
  if (!wb || !Array.isArray(wb.shoppingList)) return [];
  balance = balance || { ducados: 0, glory: 0 };
  const rows = [];
  for (let i = 0; i < wb.shoppingList.length; i++) {
    const entry = wb.shoppingList[i];
    const model = wb.models && wb.models.find(m => m.uid === entry.modelUid);
    let kit = null;
    if (model) {
      const unit = getUnit(wb.factionId, model.unitId);
      if (unit) {
        const all = allAvailableUpgrades(unit, wb);
        kit = all.find(u => u.id === entry.kitId) || null;
      }
    }
    const resolved = !!(model && kit);
    const cost = kit && typeof kit.cost === 'number' ? kit.cost : 0;
    const currency = kit ? (kit.currency || '👑') : '👑';
    let affordable = false;
    if (resolved) {
      const have = currency === '☼' ? (balance.glory || 0) : (balance.ducados || 0);
      affordable = have >= cost;
    }
    rows.push({
      idx: i,
      entry,
      model: model || null,
      kit,
      resolved,
      cost,
      currency,
      affordable,
    });
  }
  return rows;
}


