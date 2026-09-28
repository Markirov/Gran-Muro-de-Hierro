/* ======================================================================
   HEADER ACTIONS
   ====================================================================== */

document.getElementById('btn-new').addEventListener('click', () => {
  const proceed = () => {
    STATE.currentWarband = newWarband();
    STATE.selectedModelUid = null;
    persistWarband(STATE.currentWarband);
    renderAll();
  };
  // Fase 14-B PIVOT v2 — Banner explicativo modo offline. La banda
  // creada manualmente NO es oficial; TC es la autoridad.
  const offlineNotice = 'Modo offline / Nueva manual\n\n' +
    'La banda que vas a crear es LOCAL — no se sincroniza con Trench Companion.\n' +
    'La gestión oficial de bandas (composición canónica, validación, costes verificados, ' +
    'avances de campaña oficiales) se hace en https://trench-companion.com.\n\n' +
    'Usa este modo para experimentar conceptos rápidamente, jugar offline, o probar ' +
    'composiciones sin tocar tu cuenta de TC.\n\n¿Continuar creando banda local?';
  const proceedWithNotice = () => {
    if (confirm(offlineNotice)) proceed();
  };
  if (STATE.currentWarband && STATE.currentWarband.models.length > 0) {
    confirmModal({
      title: 'Nueva banda local (modo offline)',
      message: 'Tu banda actual quedará guardada. Se creará una banda local NO oficial (la gestión oficial está en Trench Companion). ¿Continuar?',
      confirmText: 'Crear banda local',
      onConfirm: proceed,
    });
  } else proceedWithNotice();
});

document.getElementById('btn-load').addEventListener('click', () => {
  const list = document.getElementById('warband-list');
  const idx = loadIndex().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  if (idx.length === 0) {
    list.innerHTML = '<div class="detail-empty">No hay bandas guardadas todavía.</div>';
  } else {
    list.innerHTML = '';
    idx.forEach(entry => {
      const f = DATA.factions[entry.factionId];
      const item = el('div', 'warband-list-item');
      item.innerHTML = `
        <div>
          <div class="name">${entry.name}</div>
          <div class="meta">${f ? f.shortName : entry.factionId} · ${entry.models} modelos · ${new Date(entry.updatedAt).toLocaleDateString()}</div>
        </div>
        <div style="display:flex;gap:0.3rem;">
          <button class="btn btn-icon" data-load>📜</button>
          <button class="btn btn-icon btn-danger" data-del>✕</button>
        </div>
      `;
      item.querySelector('[data-load]').addEventListener('click', () => {
        const wb = loadWarband(entry.id);
        if (wb) {
          STATE.currentWarband = wb;
          STATE.selectedModelUid = null;
          persistWarband(wb);
          renderAll();
          closeModal('modal-load');
        }
      });
      item.querySelector('[data-del]').addEventListener('click', (e) => {
        e.stopPropagation();
        confirmModal({
          title: 'Eliminar banda',
          message: `¿Eliminar "${entry.name}" permanentemente?`,
          confirmText: 'Eliminar',
          onConfirm: () => {
            deleteWarband(entry.id);
            // Re-render list
            document.getElementById('btn-load').click();
          }
        });
      });
      list.appendChild(item);
    });
  }
  openModal('modal-load');
});

document.getElementById('btn-save-as').addEventListener('click', () => {
  if (!STATE.currentWarband) return;
  document.getElementById('save-name-input').value = STATE.currentWarband.name || '';
  openModal('modal-save-as');
});
document.getElementById('btn-do-save').addEventListener('click', () => {
  const name = document.getElementById('save-name-input').value.trim();
  if (!name) { alert('Nombre requerido.'); return; }
  STATE.currentWarband.name = name;
  // Generate new id to save as a copy
  STATE.currentWarband.id = 'wb_' + Date.now().toString(36);
  persistWarband(STATE.currentWarband);
  closeModal('modal-save-as');
  renderRoster();
});

document.getElementById('btn-export').addEventListener('click', () => {
  if (!STATE.currentWarband) return;
  const json = JSON.stringify(STATE.currentWarband, null, 2);
  document.getElementById('export-textarea').value = json;
  openModal('modal-export');
});
document.getElementById('btn-copy-export').addEventListener('click', () => {
  const ta = document.getElementById('export-textarea');
  ta.select();
  document.execCommand('copy');
  document.getElementById('btn-copy-export').textContent = '✓ Copiado';
  setTimeout(() => document.getElementById('btn-copy-export').textContent = 'Copiar al portapapeles', 1500);
});
document.getElementById('btn-download-export').addEventListener('click', () => {
  const wb = STATE.currentWarband;
  const blob = new Blob([JSON.stringify(wb, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (wb.name || 'warband').replace(/\s+/g, '_').toLowerCase() + '.json';
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById('btn-import').addEventListener('click', () => {
  document.getElementById('import-textarea').value = '';
  openModal('modal-import');
});
document.getElementById('btn-do-import').addEventListener('click', () => {
  try {
    const txt = document.getElementById('import-textarea').value.trim();
    const obj = JSON.parse(txt);
    if (!obj.factionId || !DATA.factions[obj.factionId]) throw new Error('Facción inválida');
    if (!Array.isArray(obj.models)) throw new Error('Falta array de modelos');
    obj.id = obj.id || ('wb_' + Date.now().toString(36));
    obj.models.forEach(m => { if (!m.uid) m.uid = uid(); });
    STATE.currentWarband = obj;
    STATE.selectedModelUid = null;
    persistWarband(obj);
    closeModal('modal-import');
    renderAll();
  } catch (err) {
    alert('Error importando: ' + err.message);
  }
});

document.getElementById('btn-print').addEventListener('click', () => window.print());
document.getElementById('btn-pdf').addEventListener('click', () => generateWarbandPDF());

// Tarjetas + Battletrackers PDF — Fase 5/6 SPEC.
async function _downloadPdfBlob(blob, filename) {
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
// "🃏 Tarjetas PDF" abre un selector de formato (9 ó 4 por folio); la
// última elección queda marcada por defecto (localStorage wf-cards-layout).
document.getElementById('btn-cards-pdf')?.addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb || !Array.isArray(wb.models) || wb.models.length === 0) {
    alert('La banda no tiene modelos.');
    return;
  }
  let last = '3x3';
  try { last = localStorage.getItem('wf-cards-layout') || '3x3'; } catch (e) {}
  document.querySelectorAll('#modal-cards-layout [data-cards-layout]').forEach(b => {
    b.classList.toggle('btn-primary', b.dataset.cardsLayout === last);
  });
  openModal('modal-cards-layout');
});
document.querySelectorAll('#modal-cards-layout [data-cards-layout]').forEach(btn => {
  btn.addEventListener('click', async () => {
    const layout = btn.dataset.cardsLayout;
    try { localStorage.setItem('wf-cards-layout', layout); } catch (e) {}
    closeModal('modal-cards-layout');
    await exportCardsPdf(layout);
  });
});
async function exportCardsPdf(layout) {
  const wb = STATE.currentWarband;
  if (!wb || !Array.isArray(wb.models) || wb.models.length === 0) return;
  try {
    const blob = await generateCardsPdf(wb, { layout });
    const safeName = (wb.name || 'banda').replace(/[^\w\d -]/g, '').trim() || 'banda';
    await _downloadPdfBlob(blob, 'tarjetas-' + safeName + (layout === '2x2' ? '-4xfolio' : '') + '.pdf');
  } catch (e) {
    alert('Error generando PDF de tarjetas: ' + e.message);
  }
}
document.getElementById('btn-trackers-pdf')?.addEventListener('click', async () => {
  const wb = STATE.currentWarband;
  if (!wb || !Array.isArray(wb.models) || wb.models.length === 0) {
    alert('La banda no tiene modelos.');
    return;
  }
  try {
    const blob = await generateTrackersPdf(wb);
    const safeName = (wb.name || 'banda').replace(/[^\w\d -]/g, '').trim() || 'banda';
    await _downloadPdfBlob(blob, 'battletrackers-' + safeName + '.pdf');
  } catch (e) {
    alert('Error generando PDF de battletrackers: ' + e.message);
  }
});
document.getElementById('btn-glossary-pdf')?.addEventListener('click', async () => {
  const wb = STATE.currentWarband;
  if (!wb) { alert('No hay banda activa.'); return; }
  try {
    const blob = await generateGlossaryPdf(wb);
    const safeName = (wb.name || 'banda').replace(/[^\w\d -]/g, '').trim() || 'banda';
    await _downloadPdfBlob(blob, 'glosario-' + safeName + '.pdf');
  } catch (e) {
    alert('Error generando Glosario PDF: ' + e.message);
  }
});

/* =================================================================
 * COMPANION IMPORT / EXPORT HANDLERS
 * ================================================================= */

document.getElementById('btn-import-companion').addEventListener('click', () => {
  document.getElementById('companion-import-textarea').value = '';
  document.getElementById('companion-import-feedback').textContent = '';
  openModal('modal-import-companion');
});

// Live validation as user types/pastes
document.getElementById('companion-import-textarea').addEventListener('input', (e) => {
  const fb = document.getElementById('companion-import-feedback');
  const txt = e.target.value.trim();
  if (!txt) { fb.textContent = ''; return; }
  const result = parseCompanionJson(txt);
  if (!result.ok) {
    fb.textContent = '✗ ' + result.error;
    fb.style.color = 'var(--blood-bright, #c92424)';
  } else {
    const data = result.data;
    fb.textContent = `✓ "${data['warband-name']}" — ${data.models.length} modelos · ${data['ducat-rating'] || 0} ducados`;
    fb.style.color = 'var(--gold)';
  }
});

document.getElementById('btn-do-import-companion').addEventListener('click', () => {
  const txt = document.getElementById('companion-import-textarea').value.trim();
  const result = parseCompanionJson(txt);
  if (!result.ok) {
    alert('Error: ' + result.error);
    return;
  }
  const proceed = () => {
    const wb = importCompanionWarband(result.data);
    STATE.currentWarband = wb;
    STATE.selectedModelUid = null;
    persistWarband(wb);
    closeModal('modal-import-companion');
    renderAll();
  };
  if (STATE.currentWarband && STATE.currentWarband.models && STATE.currentWarband.models.length > 0) {
    confirmModal({
      title: 'Importar como banda nueva',
      message: 'La banda actual quedará guardada. Se creará una banda nueva desde el JSON de Companion. ¿Continuar?',
      confirmText: 'Importar',
      onConfirm: proceed,
    });
  } else {
    proceed();
  }
});

document.getElementById('btn-do-merge-companion').addEventListener('click', () => {
  const txt = document.getElementById('companion-import-textarea').value.trim();
  const result = parseCompanionJson(txt);
  if (!result.ok) {
    alert('Error: ' + result.error);
    return;
  }
  if (!STATE.currentWarband || !STATE.currentWarband.models) {
    alert('No hay banda cargada para fusionar. Usa "Importar como banda nueva".');
    return;
  }
  const merge = mergeCompanionImport(STATE.currentWarband, result.data);
  const r = merge.report;
  const summary = `Fusión completada:\n  · ${r.matched} modelos conservaron su progresión\n  · ${r.added} modelos nuevos importados\n  · ${r.archived} modelos archivados\n\n¿Aplicar cambios?`;
  if (confirm(summary)) {
    STATE.currentWarband = merge.merged;
    STATE.selectedModelUid = null;
    persistWarband(merge.merged);
    closeModal('modal-import-companion');
    renderAll();
  }
});

document.getElementById('btn-export-companion').addEventListener('click', () => {
  if (!STATE.currentWarband) {
    alert('No hay banda cargada.');
    return;
  }
  const json = exportCompanionJson(STATE.currentWarband);
  document.getElementById('companion-export-textarea').value = JSON.stringify(json, null, 2);
  openModal('modal-export-companion');
});

document.getElementById('btn-copy-companion-export').addEventListener('click', () => {
  const ta = document.getElementById('companion-export-textarea');
  ta.select();
  document.execCommand('copy');
  const btn = document.getElementById('btn-copy-companion-export');
  btn.textContent = '✓ Copiado';
  setTimeout(() => btn.textContent = 'Copiar al portapapeles', 1500);
});

document.getElementById('btn-download-companion-export').addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb) return;
  const json = exportCompanionJson(wb);
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (wb.name || 'warband').replace(/\s+/g, '_').toLowerCase() + '_companion.json';
  a.click();
  URL.revokeObjectURL(url);
});

/* Fase 9-B — Drag & drop archivo JSON sobre la ventana.
 * Detecta drop de .json en cualquier punto, abre modal import + autocarga
 * el contenido en la textarea para que el live-validator dispare. */
(function setupGlobalJsonDrop() {
  let dragDepth = 0;
  function onDragEnter(e) {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    dragDepth++;
    document.body.classList.add('json-drop-active');
  }
  function onDragLeave() {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) document.body.classList.remove('json-drop-active');
  }
  function onDragOver(e) {
    if (!e.dataTransfer || !Array.from(e.dataTransfer.types || []).includes('Files')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }
  function onDrop(e) {
    e.preventDefault();
    dragDepth = 0;
    document.body.classList.remove('json-drop-active');
    const files = (e.dataTransfer && e.dataTransfer.files) || [];
    if (!files.length) return;
    const file = files[0];
    if (!/\.json$/i.test(file.name) && file.type !== 'application/json') {
      alert('Solo archivos .json de Trench Companion.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = String(ev.target.result || '');
      const result = parseCompanionJson(text);
      if (!result.ok) {
        alert('JSON inválido: ' + result.error);
        return;
      }
      // Abre modal + precarga textarea — dispara validator + permite confirmar.
      const ta = document.getElementById('companion-import-textarea');
      const fb = document.getElementById('companion-import-feedback');
      if (ta) ta.value = text;
      if (fb) fb.textContent = '';
      openModal('modal-import-companion');
      if (ta) ta.dispatchEvent(new Event('input', { bubbles: true }));
    };
    reader.readAsText(file);
  }
  window.addEventListener('dragenter', onDragEnter);
  window.addEventListener('dragleave', onDragLeave);
  window.addEventListener('dragover', onDragOver);
  window.addEventListener('drop', onDrop);
})();

/* Fase 9-B — Refrescar banda actual desde Companion preservando estado local.
 * Activado por btn-refresh-companion si existe en la vista de detalle.
 * El botón se inserta en renderQM/renderDetail cuando wb.companionSource. */
function handleRefreshCompanionClick() {
  const wb = STATE.currentWarband;
  if (!wb) { alert('No hay banda cargada.'); return; }
  // Abre modal precargando JSON antiguo si no hay nuevo paste — Marcos
  // pega el JSON nuevo encima y pulsa Refrescar.
  const ta = document.getElementById('companion-import-textarea');
  const fb = document.getElementById('companion-import-feedback');
  if (ta) ta.value = wb.companionSource ? JSON.stringify(wb.companionSource, null, 2) : '';
  if (fb) fb.textContent = 'Pega el JSON nuevo de Companion encima y pulsa "Refrescar (preservar local)".';
  openModal('modal-import-companion');
  if (ta) ta.dispatchEvent(new Event('input', { bubbles: true }));
}

// Hook delegation — botón se inserta dinámicamente.
document.addEventListener('click', (e) => {
  const t = e.target && e.target.closest && e.target.closest('#btn-refresh-companion, [data-refresh-companion]');
  if (!t) return;
  handleRefreshCompanionClick();
});

/* SPEC-rediseno-ui Sub-B — Sidebar facción plegable handlers. */
const FACTION_SIDEBAR_KEY = 'wf.ui.factionSidebarOpen';

function setFactionSidebarOpen(open) {
  if (typeof document === 'undefined' || !document.body) return;
  document.body.classList.toggle('faction-sidebar-collapsed', !open);
  try { localStorage.setItem(FACTION_SIDEBAR_KEY, open ? '1' : '0'); } catch (e) {}
}

function isFactionSidebarOpen() {
  try {
    const v = localStorage.getItem(FACTION_SIDEBAR_KEY);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch (e) {}
  return false;  // Default plegada primera vez (SPEC decisión 2).
}

// Handler toggle via delegation (botón puede insertarse dinámicamente).
document.addEventListener('click', (e) => {
  const t = e.target && e.target.closest && e.target.closest('#btn-toggle-faction-sidebar');
  if (!t) return;
  e.preventDefault();
  setFactionSidebarOpen(!isFactionSidebarOpen());
});

/* SPEC-rediseno-ui Sub-I — Drag & drop reorden roster.
 *
 * Mecánica HTML5 draggable nativa. Reordena wb.models[] in place, persiste,
 * re-render. Solo desktop (touch no soportado en esta fase).
 */
function reorderWarbandModelByUid(wb, draggedUid, targetUid, position) {
  if (!wb || !Array.isArray(wb.models)) return false;
  if (!draggedUid || draggedUid === targetUid) return false;
  const fromIdx = wb.models.findIndex(m => m.uid === draggedUid);
  const toIdx = wb.models.findIndex(m => m.uid === targetUid);
  if (fromIdx < 0 || toIdx < 0) return false;
  const [moved] = wb.models.splice(fromIdx, 1);
  // Recompute toIdx tras remove (si fromIdx < toIdx baja 1).
  let insertAt = wb.models.findIndex(m => m.uid === targetUid);
  if (position === 'after') insertAt = insertAt + 1;
  wb.models.splice(insertAt, 0, moved);
  return true;
}

(function setupRosterDragDrop() {
  let draggedUid = null;
  let lastTarget = null;

  function clearTargets() {
    document.querySelectorAll('.roster-card.drop-target-before, .roster-card.drop-target-after')
      .forEach(el => el.classList.remove('drop-target-before', 'drop-target-after'));
  }

  document.addEventListener('dragstart', (e) => {
    const card = e.target.closest && e.target.closest('.roster-card');
    if (!card || !card.dataset.uid) return;
    draggedUid = card.dataset.uid;
    card.classList.add('dragging');
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', draggedUid); } catch (err) {}
    }
  });

  document.addEventListener('dragover', (e) => {
    const card = e.target.closest && e.target.closest('.roster-card');
    if (!card || !draggedUid || card.dataset.uid === draggedUid) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = (e.clientY < midY) ? 'before' : 'after';
    if (lastTarget !== card) {
      clearTargets();
      lastTarget = card;
    }
    card.classList.remove('drop-target-before', 'drop-target-after');
    card.classList.add(position === 'before' ? 'drop-target-before' : 'drop-target-after');
    card._dropPosition = position;
  });

  document.addEventListener('drop', (e) => {
    const card = e.target.closest && e.target.closest('.roster-card');
    if (!card || !draggedUid || card.dataset.uid === draggedUid) {
      clearTargets();
      draggedUid = null;
      lastTarget = null;
      return;
    }
    e.preventDefault();
    const wb = STATE.currentWarband;
    const position = card._dropPosition || 'after';
    if (wb && reorderWarbandModelByUid(wb, draggedUid, card.dataset.uid, position)) {
      persistWarband(wb);
      if (typeof renderAll === 'function') renderAll();
    }
    clearTargets();
    draggedUid = null;
    lastTarget = null;
  });

  document.addEventListener('dragend', () => {
    document.querySelectorAll('.roster-card.dragging').forEach(c => c.classList.remove('dragging'));
    clearTargets();
    draggedUid = null;
    lastTarget = null;
  });

  /* Touch drag&drop (mobile). Mirror la lógica de HTML5 drag&drop pero
   * usando touchstart/touchmove/touchend + elementFromPoint para hit-test.
   *
   * Mecánica:
   *  - touchstart en roster-card: marca draggedUid + clase dragging. NO
   *    preventDefault para permitir el scroll por defecto SI el usuario
   *    no acaba arrastrando — solo bloqueamos scroll en touchmove cuando
   *    el touch realmente cambia de card.
   *  - touchmove: usa elementFromPoint para detectar la card bajo el dedo.
   *    Calcula posición before/after por midpoint Y. Aplica clase
   *    drop-target-before/after. preventDefault() para evitar scroll
   *    accidental mientras se reordena.
   *  - touchend: invoca reorderWarbandModelByUid (reuso desktop) y limpia.
   */
  let touchActive = false;
  document.addEventListener('touchstart', (e) => {
    if (!e.target.closest) return;
    const card = e.target.closest('.roster-card');
    if (!card || !card.dataset.uid) return;
    draggedUid = card.dataset.uid;
    card.classList.add('dragging');
    touchActive = true;
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!touchActive || !draggedUid) return;
    const t = e.touches && e.touches[0];
    if (!t) return;
    const elUnder = document.elementFromPoint(t.clientX, t.clientY);
    if (!elUnder || !elUnder.closest) return;
    const card = elUnder.closest('.roster-card');
    if (!card || card.dataset.uid === draggedUid) return;
    e.preventDefault();
    const rect = card.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = (t.clientY < midY) ? 'before' : 'after';
    if (lastTarget !== card) {
      clearTargets();
      lastTarget = card;
    }
    card.classList.remove('drop-target-before', 'drop-target-after');
    card.classList.add(position === 'before' ? 'drop-target-before' : 'drop-target-after');
    card._dropPosition = position;
  }, { passive: false });

  document.addEventListener('touchend', (e) => {
    if (!touchActive) return;
    touchActive = false;
    if (!draggedUid) return;
    if (lastTarget && lastTarget.dataset.uid && lastTarget.dataset.uid !== draggedUid) {
      const wb = STATE.currentWarband;
      const position = lastTarget._dropPosition || 'after';
      if (wb && reorderWarbandModelByUid(wb, draggedUid, lastTarget.dataset.uid, position)) {
        persistWarband(wb);
        if (typeof renderAll === 'function') renderAll();
      }
    }
    document.querySelectorAll('.roster-card.dragging').forEach(c => c.classList.remove('dragging'));
    clearTargets();
    draggedUid = null;
    lastTarget = null;
  }, { passive: true });

  document.addEventListener('touchcancel', () => {
    touchActive = false;
    document.querySelectorAll('.roster-card.dragging').forEach(c => c.classList.remove('dragging'));
    clearTargets();
    draggedUid = null;
    lastTarget = null;
  }, { passive: true });
})();

/* SPEC-rediseno-ui Sub-E — Modal "Añadir a wishlist" con categorías.
 *
 * Reusa f.armoury (catálogo manual) + classifyBattlekitItem para
 * filtrado en modo 'unit'. En modo 'pool' muestra TODO sin filtrar.
 */
const SHOPPING_CAT_LABELS = [
  ['ranged',    '🏹 Ranged'],
  ['melee',     '⚔ Melee'],
  ['grenades',  '💣 Grenades'],
  ['shields',   '🛡 Shields'],
  ['armour',    '🦺 Armour'],
  ['equipment', '🎒 Equipment'],
];

let _SHOPPING_MODAL_CTX = null;  // {mode, targetModelUid, activeCat}

function openAddShoppingModal(wb, mode, targetModelUid) {
  if (!wb) { alert('Carga una banda primero.'); return; }
  if (mode !== 'pool' && mode !== 'unit') mode = 'pool';
  _SHOPPING_MODAL_CTX = { mode, targetModelUid: targetModelUid || null, activeCat: null };
  // Title contextual.
  const title = document.getElementById('add-shopping-title');
  const sub = document.getElementById('add-shopping-subtitle');
  if (mode === 'pool') {
    title.textContent = '🛒 Añadir a lista de la compra · Pool de banda';
    sub.textContent = 'Items disponibles en el catálogo de la facción. Sin filtrar por unidad.';
  } else {
    const m = (wb.models || []).find(x => x.uid === targetModelUid);
    const mname = m ? (m.customName || m.name || m.unitId) : 'modelo';
    title.textContent = '🛒 Añadir equipo a wishlist · ' + mname;
    sub.textContent = 'Solo equipo válido para esta unidad (catálogo filtrado).';
  }
  renderAddShoppingTabs();
  openModal('modal-add-shopping-cat');
}

function _getShoppingCategoryItems(wb, ctx, catKey) {
  if (!wb || !ctx) return [];
  const f = DATA.factions[wb.factionId];
  if (!f || !f.armoury) return [];
  const raw = armouryItemsForWarband(wb, catKey);
  if (ctx.mode === 'pool') return raw.slice();
  // Modo unit: filtrar por classifyBattlekitItem.
  const m = (wb.models || []).find(x => x.uid === ctx.targetModelUid);
  if (!m) return [];
  const unit = (typeof getUnit === 'function') ? getUnit(wb.factionId, m.unitId) : null;
  if (!unit) return raw.slice();  // Sin unidad canónica, no filtra (mejor mostrar que esconder).
  if (typeof classifyBattlekitItem !== 'function') return raw.slice();
  return raw.filter(item => {
    const cls = classifyBattlekitItem(item, m, unit, wb);
    return cls && cls.state !== 'hidden';
  });
}

function renderAddShoppingTabs() {
  const wb = STATE.currentWarband;
  const ctx = _SHOPPING_MODAL_CTX;
  if (!wb || !ctx) return;
  const tabsEl = document.getElementById('add-shopping-cat-tabs');
  tabsEl.innerHTML = '';
  let firstActive = null;
  for (const [key, label] of SHOPPING_CAT_LABELS) {
    const items = _getShoppingCategoryItems(wb, ctx, key);
    if (items.length === 0) continue;
    const btn = document.createElement('button');
    btn.className = 'cat-tab';
    btn.style.cssText = 'padding:0.4rem 0.8rem;background:transparent;border:1px solid rgba(127,107,67,0.4);border-radius:3px;color:var(--parchment);cursor:pointer;font-size:0.82rem;';
    btn.textContent = label + ' (' + items.length + ')';
    btn.setAttribute('data-cat-key', key);
    btn.addEventListener('click', () => { ctx.activeCat = key; renderAddShoppingTabs(); });
    if (ctx.activeCat === key || (!ctx.activeCat && !firstActive)) {
      btn.style.background = 'rgba(95,25,25,0.5)';
      btn.style.color = 'var(--gold)';
      btn.style.fontWeight = 'bold';
      if (!firstActive) firstActive = key;
    }
    tabsEl.appendChild(btn);
  }
  if (!ctx.activeCat && firstActive) ctx.activeCat = firstActive;
  renderAddShoppingItems();
}

function renderAddShoppingItems() {
  const wb = STATE.currentWarband;
  const ctx = _SHOPPING_MODAL_CTX;
  const cont = document.getElementById('add-shopping-items');
  if (!wb || !ctx || !cont) return;
  cont.innerHTML = '';
  if (!ctx.activeCat) {
    cont.innerHTML = '<p style="color:var(--parchment);"><em>No hay categorías con items disponibles.</em></p>';
    return;
  }
  const items = _getShoppingCategoryItems(wb, ctx, ctx.activeCat);
  if (items.length === 0) {
    cont.innerHTML = '<p style="color:var(--parchment);"><em>Sin items en esta categoría.</em></p>';
    return;
  }
  for (const item of items) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.5rem;border-bottom:1px solid rgba(127,107,67,0.18);';
    const costStr = (item.cost != null) ? (item.cost + ' ' + (item.currency || '👑')) : '';
    row.innerHTML = `
      <div style="flex:1;">
        <div><strong>${escapeHtml(item.name)}</strong>
          ${item.restriction ? '<span style="font-size:0.7rem;color:var(--parchment);opacity:0.6;"> (' + escapeHtml(item.restriction) + ')</span>' : ''}
        </div>
        <div style="font-size:0.72rem;color:var(--parchment);opacity:0.7;">${costStr}</div>
      </div>
      <button class="btn btn-sm" data-add-shopping-from-cat="${escapeHtml(item.id || item.name)}" data-name="${escapeHtml(item.name)}" data-cost="${item.cost || 0}" data-cat="${ctx.activeCat}">Añadir →</button>
    `;
    cont.appendChild(row);
  }
}

// Delegation: añadir item desde modal categorías.
document.getElementById('add-shopping-items').addEventListener('click', (e) => {
  const t = e.target && e.target.closest && e.target.closest('[data-add-shopping-from-cat]');
  if (!t) return;
  const wb = STATE.currentWarband;
  const ctx = _SHOPPING_MODAL_CTX;
  if (!wb || !ctx) return;
  const name = t.getAttribute('data-name');
  const cost = parseInt(t.getAttribute('data-cost'), 10) || 0;
  const cat = t.getAttribute('data-cat');
  addShoppingItem(wb, {
    type:'equipment',
    name: name,
    cost: cost,
    category: cat,
    scope: ctx.mode,
    forModel: (ctx.mode === 'unit') ? ctx.targetModelUid : null,
    source:'manual',
  });
  persistWarband(wb);
  // Feedback visual breve sin cerrar modal.
  t.textContent = '✓ Añadido';
  t.disabled = true;
  setTimeout(() => { t.textContent = 'Añadir →'; t.disabled = false; }, 1200);
  if (typeof renderShoppingSubtab === 'function') renderShoppingSubtab();
});

/* SPEC-rediseno-ui Sub-F — botón "🛒 + Equipo a wishlist" en panel Detalle.
 * Delegation porque el botón se inserta dinámicamente en renderDetailCompanion.
 * Abre modal Sub-E modo 'unit' con categorías filtradas por la unidad. */
document.addEventListener('click', (e) => {
  const t = e.target && e.target.closest && e.target.closest('[data-add-equip-wishlist]');
  if (!t) return;
  e.preventDefault();
  const modelUid = t.getAttribute('data-add-equip-wishlist');
  openAddShoppingModal(STATE.currentWarband, 'unit', modelUid);
});

/* SPEC-rediseno-ui Sub-D — Botón "🛒 + Lista pool" abre modal categorías Sub-E. */
const _btnAddPool = document.getElementById('btn-add-pool-shopping');
if (_btnAddPool) {
  _btnAddPool.addEventListener('click', () => {
    openAddShoppingModal(STATE.currentWarband, 'pool', null);
  });
}

/* SPEC-rediseno-ui Sub-C — Sub-tabs handler. */
const BANDA_SUBTAB_KEY = 'wf.ui.bandaSubtab';

function setBandaSubtab(name) {
  if (!['roster','variantes','shopping'].includes(name)) name = 'roster';
  // Tabs visual.
  document.querySelectorAll('.banda-subtab').forEach(btn => {
    const active = btn.getAttribute('data-subtab') === name;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  // Paneles via body class (CSS gobierna visibility con !important).
  // Limpia data-subtab-panel style inline residual de versiones previas.
  document.querySelectorAll('[data-subtab-panel]').forEach(p => {
    p.style.display = '';
  });
  ['roster','variantes','shopping'].forEach(s => {
    document.body.classList.toggle('subtab-' + s, s === name);
  });
  try { localStorage.setItem(BANDA_SUBTAB_KEY, name); } catch (e) {}
  // Render content on-demand.
  if (name === 'shopping') renderShoppingSubtab();
}

function getActiveBandaSubtab() {
  try {
    const v = localStorage.getItem(BANDA_SUBTAB_KEY);
    if (['roster','variantes','shopping'].includes(v)) return v;
  } catch (e) {}
  return 'roster';
}

function renderShoppingSubtab() {
  const wb = STATE.currentWarband;
  const cont = document.getElementById('shopping-subtab-content');
  if (!cont) return;
  cont.innerHTML = '';
  if (!wb) {
    cont.innerHTML = '<p style="color:var(--parchment);"><em>Carga una banda primero.</em></p>';
    return;
  }
  const items = Array.isArray(wb.shoppingList) ? wb.shoppingList : [];
  if (items.length === 0) {
    cont.innerHTML = '<p style="color:var(--parchment);"><em>Lista vacía. Pulsa "+ Añadir item" para empezar.</em></p>';
    return;
  }
  // Agrupar por scope. Pool primero, luego por modelo.
  const poolActive = [], poolChecked = [];
  const byModel = {}; // modelUid → {active:[], checked:[]}
  for (const it of items) {
    const isPool = it.scope === 'pool' || !it.forModel;
    if (isPool) {
      (it.checked ? poolChecked : poolActive).push(it);
    } else {
      if (!byModel[it.forModel]) byModel[it.forModel] = { active: [], checked: [] };
      (it.checked ? byModel[it.forModel].checked : byModel[it.forModel].active).push(it);
    }
  }
  const variants = Array.isArray(wb.experimentalVariants) ? wb.experimentalVariants : [];
  const variantName = (vid) => {
    const v = variants.find(x => x.id === vid);
    return v ? v.name : 'Variante eliminada';
  };
  const modelName = (uid) => {
    const m = (wb.models || []).find(x => x.uid === uid);
    return m ? (m.customName || m.name || m.unitId || uid) : uid;
  };

  function itemRow(it) {
    const date = new Date(it.createdAt || 0).toLocaleDateString();
    const sourceLabel = it.source === 'variant'
      ? '<span style="color:var(--gold);">desde variante: ' + escapeHtml(variantName(it.variantId)) + '</span>'
      : 'manual';
    const qty = (it.quantity && it.quantity > 1) ? (it.quantity + '× ') : '';
    return `
      <div class="shopping-row" style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.5rem;border-bottom:1px solid rgba(127,107,67,0.18);${it.checked ? 'opacity:0.55;' : ''}">
        <input type="checkbox" data-shopping-toggle="${it.id}" ${it.checked ? 'checked' : ''} />
        <span style="flex:1;${it.checked ? 'text-decoration:line-through;' : ''}">${qty}${escapeHtml(it.name)}</span>
        <span style="font-size:0.72rem;color:var(--parchment);opacity:0.7;">${sourceLabel} · ${date}</span>
        <button class="btn btn-sm" data-shopping-remove="${it.id}" title="Eliminar definitivamente">🗑</button>
      </div>
    `;
  }

  function section(title, active, checked) {
    if (active.length === 0 && checked.length === 0) return '';
    let html = '<div style="margin-bottom:1rem;">';
    html += '<div style="font-weight:bold;color:var(--gold);padding:0.4rem 0;border-bottom:2px solid rgba(127,107,67,0.4);">' + escapeHtml(title) + ' (' + (active.length + checked.length) + ')</div>';
    for (const it of active) html += itemRow(it);
    if (checked.length > 0) {
      html += '<details style="margin-top:0.3rem;"><summary style="cursor:pointer;font-size:0.78rem;color:var(--parchment);opacity:0.7;">Histórico (' + checked.length + ' tachado' + (checked.length > 1 ? 's' : '') + ')</summary>';
      for (const it of checked) html += itemRow(it);
      html += '</details>';
    }
    html += '</div>';
    return html;
  }

  let html = '';
  html += section('POOL DE BANDA', poolActive, poolChecked);
  for (const uid of Object.keys(byModel)) {
    html += section(modelName(uid).toUpperCase(), byModel[uid].active, byModel[uid].checked);
  }
  cont.innerHTML = html;
}

// Listeners sub-tabs.
document.querySelectorAll('.banda-subtab').forEach(btn => {
  btn.addEventListener('click', () => setBandaSubtab(btn.getAttribute('data-subtab')));
});

// Sub-tab Variantes: botón abre modal sandbox existente.
const _btnSubtabSandbox = document.getElementById('btn-subtab-open-sandbox');
if (_btnSubtabSandbox) {
  _btnSubtabSandbox.addEventListener('click', () => {
    document.getElementById('btn-open-sandbox').click();
  });
}

// Sub-tab Lista compra: delegation toggle/remove + botones acciones.
const _shoppingSubtabContent = document.getElementById('shopping-subtab-content');
if (_shoppingSubtabContent) {
  _shoppingSubtabContent.addEventListener('click', (e) => {
    const wb = STATE.currentWarband;
    if (!wb) return;
    const toggle = e.target.closest('[data-shopping-toggle]');
    const remove = e.target.closest('[data-shopping-remove]');
    if (toggle) {
      toggleShoppingItemChecked(wb, toggle.getAttribute('data-shopping-toggle'));
      persistWarband(wb);
      renderShoppingSubtab();
      return;
    }
    if (remove) {
      if (!confirm('¿Eliminar este item definitivamente?')) return;
      removeShoppingItem(wb, remove.getAttribute('data-shopping-remove'));
      persistWarband(wb);
      renderShoppingSubtab();
    }
  });
}
const _btnSubtabAdd = document.getElementById('btn-shopping-subtab-add');
if (_btnSubtabAdd) {
  _btnSubtabAdd.addEventListener('click', () => {
    // SPEC-rediseno-ui Sub-G — usa modal Sub-E modo pool.
    openAddShoppingModal(STATE.currentWarband, 'pool', null);
  });
}
const _btnSubtabPdf = document.getElementById('btn-shopping-subtab-pdf');
if (_btnSubtabPdf) {
  _btnSubtabPdf.addEventListener('click', async () => {
    const wb = STATE.currentWarband;
    if (!wb) return;
    try {
      const blob = await generateShoppingListPdf(wb);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lista-compra-' + (wb.name || 'banda').replace(/\s+/g, '_').toLowerCase() + '.pdf';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) { alert('Error: ' + e.message); }
  });
}
const _btnSubtabClear = document.getElementById('btn-shopping-subtab-clear');
if (_btnSubtabClear) {
  _btnSubtabClear.addEventListener('click', () => {
    const wb = STATE.currentWarband;
    if (!wb) return;
    const n = (wb.shoppingList || []).filter(it => it.checked).length;
    if (n === 0) { alert('No hay items tachados.'); return; }
    if (!confirm('¿Borrar ' + n + ' item(s) tachado(s)?')) return;
    clearCheckedShoppingItems(wb);
    persistWarband(wb);
    renderShoppingSubtab();
  });
}

/* Sub-GH-C — GitHub Gist backup/restore UI handlers. */
const GH_TOKEN_KEY = 'wf.gh.token';
const GH_GIST_KEY = 'wf.gh.gistId';
const GH_LAST_SYNC_KEY = 'wf.gh.lastSync';

function _ghLoadFields() {
  const t = localStorage.getItem(GH_TOKEN_KEY) || '';
  const g = localStorage.getItem(GH_GIST_KEY) || '';
  const tEl = document.getElementById('gh-token');
  const gEl = document.getElementById('gh-gist-id');
  if (tEl) tEl.value = t;
  if (gEl) gEl.value = g;
}

function _ghRenderStatus(msg, kind) {
  const el = document.getElementById('gh-sync-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = (kind === 'error') ? '#c92424'
                 : (kind === 'ok')    ? '#7fb069'
                                       : 'var(--parchment)';
  // Última sincro persistida.
  const last = localStorage.getItem(GH_LAST_SYNC_KEY);
  if (last && kind !== 'error') {
    el.textContent += '  ·  Última sync: ' + new Date(last).toLocaleString();
  }
}

/* Sub-FB-D — Firebase modal handlers + auto-sync. */
function _fbShowSection(id) {
  for (const x of ['not-configured','signed-out','signed-in']) {
    const el = document.getElementById('fb-login-' + x);
    if (el) el.style.display = (x === id) ? '' : 'none';
  }
}

function openAccountModal() {
  if (!isFirebaseConfigured()) {
    _fbShowSection('not-configured');
    openModal('modal-firebase-login');
    return;
  }
  firebaseInit().then(r => {
    if (!r.ok) {
      _fbShowSection('not-configured');
      const el = document.getElementById('fb-login-not-configured');
      if (el) el.innerHTML = '<p style="color:#c92424;">Error inicializando Firebase: ' + (r.error||'') + '</p>';
    } else {
      const u = firebaseCurrentUser();
      if (u) _fbRenderSignedIn(u); else _fbShowSection('signed-out');
    }
    openModal('modal-firebase-login');
  });
}

function _fbRenderSignedIn(u) {
  _fbShowSection('signed-in');
  document.getElementById('fb-user-name').textContent = u.displayName || '(sin nombre)';
  document.getElementById('fb-user-email').textContent = u.email || '';
  const av = document.getElementById('fb-user-avatar');
  if (u.photoURL) { av.src = u.photoURL; av.style.display = 'block'; }
  else av.style.display = 'none';
}

// Hook expuesto a firebaseInit listener.
function onFirebaseAuthChanged(user) {
  if (user) {
    const u = firebaseCurrentUser();
    if (document.getElementById('modal-firebase-login').classList.contains('show')) {
      _fbRenderSignedIn(u);
    }
    // Tras login fresco, pull de Firestore.
    _fbAutoPullOnLogin();
  } else {
    if (document.getElementById('modal-firebase-login').classList.contains('show')) {
      _fbShowSection('signed-out');
    }
  }
}

let _fbInitialSyncDone = false;
// Tras fusionar, la banda abierta se relee del navegador (puede venir de otro dispositivo).
function reloadAfterCloudSync() {
  const cur = (typeof STATE !== 'undefined') ? STATE.currentWarband : null;
  if (cur && cur.id) {
    const fresh = loadWarband(cur.id);
    if (fresh) STATE.currentWarband = fresh;
  }
  if (typeof renderAll === 'function') renderAll();
}
async function _fbAutoPullOnLogin() {
  // Fusiona las bandas del dispositivo con las de la cuenta y sube el resultado.
  const r = await firebaseSaveState();
  _fbInitialSyncDone = r.ok;
  if (r.ok) {
    console.log('[wf-fb] sync al iniciar sesión OK');
    if (typeof reloadAfterCloudSync === 'function') reloadAfterCloudSync();
    else if (typeof renderAll === 'function') renderAll();
  } else {
    console.warn('[wf-fb] sync al iniciar sesión falló:', r.error);
  }
}

const _btnOpenAccount = document.getElementById('btn-open-account');
if (_btnOpenAccount) _btnOpenAccount.addEventListener('click', openAccountModal);

const _btnFbLoginGoogle = document.getElementById('btn-fb-login-google');
if (_btnFbLoginGoogle) {
  _btnFbLoginGoogle.addEventListener('click', async () => {
    _btnFbLoginGoogle.disabled = true;
    const r = await firebaseLoginGoogle();
    _btnFbLoginGoogle.disabled = false;
    if (!r.ok) alert('Error: ' + r.error);
  });
}

const _btnFbLogout = document.getElementById('btn-fb-logout');
if (_btnFbLogout) {
  _btnFbLogout.addEventListener('click', async () => {
    if (!confirm('Cerrar sesión. Las modificaciones futuras NO se sincronizarán hasta que vuelvas a iniciar sesión. ¿Continuar?')) return;
    await firebaseLogout();
    _fbShowSection('signed-out');
  });
}

const _btnFbForceSync = document.getElementById('btn-fb-force-sync');
if (_btnFbForceSync) {
  _btnFbForceSync.addEventListener('click', async () => {
    const status = document.getElementById('fb-user-sync-status');
    if (status) status.textContent = 'Sincronizando...';
    const r = await firebaseSaveState();
    if (status) status.textContent = r.ok ? '✓ Sincronizado · ' + new Date().toLocaleTimeString() : '✗ Error: ' + r.error;
  });
}
const _btnFbPullNow = document.getElementById('btn-fb-pull-now');
if (_btnFbPullNow) {
  _btnFbPullNow.addEventListener('click', async () => {
    if (!confirm('Restaurar SOBREESCRIBE el estado local con lo que haya en tu cuenta. ¿Continuar?')) return;
    const status = document.getElementById('fb-user-sync-status');
    if (status) status.textContent = 'Descargando...';
    const r = await firebaseLoadState();
    if (status) status.textContent = r.ok ? '✓ Restaurado' : '✗ Error: ' + r.error;
    if (r.ok && !r.empty) setTimeout(() => window.location.reload(), 1000);
  });
}

/* Sub-FB-E — Auto-save debounced tras cada persistWarband. */
let _fbAutoSaveTimer = null;
function _fbScheduleAutoSave() {
  if (!_fbReady || !_fbUser || !_fbInitialSyncDone) return;
  if (_fbAutoSaveTimer) clearTimeout(_fbAutoSaveTimer);
  _fbAutoSaveTimer = setTimeout(async () => {
    _fbAutoSaveTimer = null;
    const r = await firebaseSaveState();
    if (r.ok) {
      console.log('[wf-fb] auto-save OK ·', new Date().toLocaleTimeString());
      const status = document.getElementById('fb-user-sync-status');
      if (status) status.textContent = '✓ Sincronizado · ' + new Date().toLocaleTimeString();
    } else {
      console.warn('[wf-fb] auto-save falló:', r.error);
    }
  }, 5000);  // 5s debounce.
}

// Wrap persistWarband por segunda vez para hook Firebase.
if (typeof persistWarband === 'function') {
  const _origPersistWarbandFb = persistWarband;
  persistWarband = function(wb) {
    const r = _origPersistWarbandFb.apply(this, arguments);
    _fbScheduleAutoSave();
    return r;
  };
}

// Init Firebase al cargar — auto-login si sesión persistente.
if (isFirebaseConfigured()) {
  firebaseInit().then(r => {
    if (r.ok) {
      // onAuthStateChanged dispara _fbAutoPullOnLogin si hay usuario.
      console.log('[wf-fb] Firebase init OK');
    } else {
      console.warn('[wf-fb] Firebase init falló:', r.error);
    }
  });
}

/* Sub-OA-B + C — OAuth Device Flow UI + auto-sync. */
const GH_CLIENT_ID_KEY = 'wf.gh.clientId';
const GH_AUTO_SYNC_KEY = 'wf.gh.autoSync';

function _ghShowPhase(phase) {
  for (const p of ['setup','login','code','done']) {
    const el = document.getElementById('gh-oauth-phase-' + p);
    if (el) el.style.display = (p === phase) ? '' : 'none';
  }
}

function _openGithubLoginModal() {
  const clientId = localStorage.getItem(GH_CLIENT_ID_KEY) || '';
  if (!clientId) {
    _ghShowPhase('setup');
  } else {
    _ghShowPhase('login');
  }
  openModal('modal-github-login');
}

let _ghOAuthAbort = false;

async function _ghStartLogin() {
  _ghOAuthAbort = false;
  const clientId = localStorage.getItem(GH_CLIENT_ID_KEY);
  if (!clientId) { _ghShowPhase('setup'); return; }
  _ghShowPhase('code');
  document.getElementById('gh-oauth-user-code').textContent = '...';
  document.getElementById('gh-oauth-polling-status').textContent = 'Solicitando código a GitHub...';

  const codeRes = await requestDeviceCode(clientId, 'gist');
  if (!codeRes.ok) {
    document.getElementById('gh-oauth-polling-status').textContent =
      '✗ Error: ' + codeRes.error + ' (¿CORS bloqueado? Usa fallback PAT.)';
    return;
  }
  document.getElementById('gh-oauth-user-code').textContent = codeRes.user_code;
  const link = document.getElementById('gh-oauth-verify-link');
  link.href = codeRes.verification_uri;
  // Auto-abre tab.
  try { window.open(codeRes.verification_uri, '_blank', 'noopener'); } catch (e) {}
  document.getElementById('gh-oauth-polling-status').textContent =
    'Esperando autorización... (intervalo ' + codeRes.interval + 's)';

  // Polling con check de cancelación.
  const maxAttempts = Math.ceil((codeRes.expires_in || 900) / (codeRes.interval || 5));
  let token = null;
  for (let i = 0; i < maxAttempts; i++) {
    if (_ghOAuthAbort) return;
    const oneRes = await pollForAccessToken(clientId, codeRes.device_code, codeRes.interval, 1);
    if (oneRes.ok) { token = oneRes.access_token; break; }
    if (/denied|expir|denegad/i.test(oneRes.error || '')) {
      document.getElementById('gh-oauth-polling-status').textContent = '✗ ' + oneRes.error;
      return;
    }
    // authorization_pending / slow_down → sigue.
  }
  if (!token) {
    document.getElementById('gh-oauth-polling-status').textContent = '✗ Timeout. Reintenta.';
    return;
  }
  // Token recibido — guarda + activa auto-sync.
  localStorage.setItem(GH_TOKEN_KEY, token);
  localStorage.setItem(GH_AUTO_SYNC_KEY, '1');
  _ghShowPhase('done');
  document.getElementById('gh-oauth-done-detail').textContent =
    'Token guardado localmente. Auto-sync activado. Las próximas modificaciones se subirán a tu Gist automáticamente.';
  // Si no hay gistId, hace primer backup que crea uno.
  const gistId = localStorage.getItem(GH_GIST_KEY) || null;
  if (!gistId) {
    githubBackup(token, null).then(r => {
      if (r.ok) {
        localStorage.setItem(GH_GIST_KEY, r.gistId);
        localStorage.setItem(GH_LAST_SYNC_KEY, new Date().toISOString());
      }
    });
  }
}

// Handlers fases modal OAuth.
const _btnSaveClientId = document.getElementById('btn-gh-oauth-save-clientid');
if (_btnSaveClientId) {
  _btnSaveClientId.addEventListener('click', () => {
    const cid = (document.getElementById('gh-oauth-clientid').value || '').trim();
    if (!cid) { alert('Client ID requerido.'); return; }
    localStorage.setItem(GH_CLIENT_ID_KEY, cid);
    _ghShowPhase('login');
  });
}
const _btnStartLogin = document.getElementById('btn-gh-oauth-start-login');
if (_btnStartLogin) _btnStartLogin.addEventListener('click', _ghStartLogin);
const _btnResetClientId = document.getElementById('btn-gh-oauth-reset-clientid');
if (_btnResetClientId) {
  _btnResetClientId.addEventListener('click', () => {
    document.getElementById('gh-oauth-clientid').value = localStorage.getItem(GH_CLIENT_ID_KEY) || '';
    _ghShowPhase('setup');
  });
}
const _btnCancelPolling = document.getElementById('btn-gh-oauth-cancel-polling');
if (_btnCancelPolling) {
  _btnCancelPolling.addEventListener('click', () => {
    _ghOAuthAbort = true;
    closeModal('modal-github-login');
  });
}

/* Sub-OA-C — Auto-sync hooks. */
let _ghAutoSyncTimer = null;
function _ghScheduleAutoSync() {
  if (localStorage.getItem(GH_AUTO_SYNC_KEY) !== '1') return;
  const token = localStorage.getItem(GH_TOKEN_KEY);
  const gistId = localStorage.getItem(GH_GIST_KEY);
  if (!token || !gistId) return;
  if (_ghAutoSyncTimer) clearTimeout(_ghAutoSyncTimer);
  _ghAutoSyncTimer = setTimeout(async () => {
    _ghAutoSyncTimer = null;
    const r = await githubBackup(token, gistId);
    if (r.ok) {
      localStorage.setItem(GH_LAST_SYNC_KEY, new Date().toISOString());
      // Discreto: indicador en consola.
      console.log('[wf-sync] auto-backup OK · ' + new Date().toLocaleTimeString());
    } else {
      console.warn('[wf-sync] auto-backup falló: ' + r.error);
    }
  }, 8000);  // Debounce 8s tras última modificación.
}

// Wrap persistWarband para hook auto-sync.
if (typeof persistWarband === 'function') {
  const _origPersistWarband = persistWarband;
  persistWarband = function(wb) {
    const r = _origPersistWarband.apply(this, arguments);
    _ghScheduleAutoSync();
    return r;
  };
}

async function _ghAutoRestoreOnBoot() {
  if (localStorage.getItem(GH_AUTO_SYNC_KEY) !== '1') return;
  const token = localStorage.getItem(GH_TOKEN_KEY);
  const gistId = localStorage.getItem(GH_GIST_KEY);
  if (!token || !gistId) return;
  // Solo si hay un gist remoto MÁS reciente que la última sincro local.
  // Implementación simple: descarga + diff de exportedAt vs local.
  try {
    const f = (typeof window !== 'undefined' && window.fetch) ? window.fetch : fetch;
    const res = await f('https://api.github.com/gists/' + encodeURIComponent(gistId), {
      headers: { 'Authorization': 'Bearer ' + token,
                 'Accept': 'application/vnd.github+json' },
    });
    if (!res.ok) { console.warn('[wf-sync] no se pudo verificar gist: HTTP ' + res.status); return; }
    const data = await res.json();
    const file = data.files && data.files['wf-state.json'];
    if (!file) return;
    const remoteState = JSON.parse(file.content);
    const localLast = localStorage.getItem(GH_LAST_SYNC_KEY);
    const remoteAt = remoteState.exportedAt;
    if (localLast && remoteAt && new Date(remoteAt) <= new Date(localLast)) {
      // Local ya sincronizado o más reciente.
      return;
    }
    // Remote más reciente → restaura silenciosamente.
    const r = deserializeAppState(remoteState);
    if (r.ok) {
      localStorage.setItem(GH_LAST_SYNC_KEY, new Date().toISOString());
      console.log('[wf-sync] auto-restore desde gist · estado remoto era más reciente');
      // Recarga UI para reflejar cambios.
      if (typeof renderAll === 'function') renderAll();
    }
  } catch (e) {
    console.warn('[wf-sync] auto-restore falló: ' + e.message);
  }
}

function _openGithubSyncModal() {
  // Si hay sesión OAuth activa → muestra modal sync clásico con campos
  // pre-rellenados. Si no, abre flujo login OAuth.
  if (localStorage.getItem(GH_AUTO_SYNC_KEY) === '1' &&
      localStorage.getItem(GH_TOKEN_KEY)) {
    _ghLoadFields();
    _ghRenderStatus('Sesión OAuth activa · auto-sync ON', 'ok');
    openModal('modal-github-sync');
  } else {
    _openGithubLoginModal();
  }
}
const _btnOpenGhSync = document.getElementById('btn-open-github-sync');
if (_btnOpenGhSync) _btnOpenGhSync.addEventListener('click', _openGithubSyncModal);
const _btnOpenGhSyncGlobal = document.getElementById('btn-open-github-sync-global');
if (_btnOpenGhSyncGlobal) _btnOpenGhSyncGlobal.addEventListener('click', _openGithubSyncModal);

// Keyboard shortcut Ctrl+Alt+G abre modal desde cualquier modo.
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.altKey && (e.key === 'g' || e.key === 'G')) {
    e.preventDefault();
    _openGithubSyncModal();
  }
});

const _btnGhBackup = document.getElementById('btn-gh-backup');
if (_btnGhBackup) {
  _btnGhBackup.addEventListener('click', async () => {
    const token = (document.getElementById('gh-token').value || '').trim();
    const gistId = (document.getElementById('gh-gist-id').value || '').trim();
    if (!token) { _ghRenderStatus('Falta token GitHub.', 'error'); return; }
    // Persiste token + gistId localmente para próximas veces.
    localStorage.setItem(GH_TOKEN_KEY, token);
    if (gistId) localStorage.setItem(GH_GIST_KEY, gistId);
    _ghRenderStatus('Subiendo...', '');
    _btnGhBackup.disabled = true;
    try {
      const r = await githubBackup(token, gistId || null);
      if (!r.ok) { _ghRenderStatus('Error: ' + r.error, 'error'); return; }
      // Guarda gistId devuelto (útil cuando se creó nuevo).
      localStorage.setItem(GH_GIST_KEY, r.gistId);
      localStorage.setItem(GH_LAST_SYNC_KEY, new Date().toISOString());
      document.getElementById('gh-gist-id').value = r.gistId;
      _ghRenderStatus('✓ Backup OK · gist ' + r.gistId, 'ok');
    } finally {
      _btnGhBackup.disabled = false;
    }
  });
}

const _btnGhRestore = document.getElementById('btn-gh-restore');
if (_btnGhRestore) {
  _btnGhRestore.addEventListener('click', async () => {
    const token = (document.getElementById('gh-token').value || '').trim();
    const gistId = (document.getElementById('gh-gist-id').value || '').trim();
    if (!token || !gistId) {
      _ghRenderStatus('Falta token o Gist ID.', 'error'); return;
    }
    if (!confirm('Restaurar desde GitHub SOBREESCRIBE todas tus bandas, campañas y settings locales. ¿Continuar?')) return;
    localStorage.setItem(GH_TOKEN_KEY, token);
    localStorage.setItem(GH_GIST_KEY, gistId);
    _ghRenderStatus('Descargando...', '');
    _btnGhRestore.disabled = true;
    try {
      const r = await githubRestore(token, gistId);
      if (!r.ok) { _ghRenderStatus('Error: ' + r.error, 'error'); return; }
      localStorage.setItem(GH_LAST_SYNC_KEY, new Date().toISOString());
      _ghRenderStatus('✓ Restaurado · recarga la app para ver los cambios', 'ok');
      // Recarga tras pequeño delay para que vea el mensaje.
      setTimeout(() => window.location.reload(), 1500);
    } finally {
      _btnGhRestore.disabled = false;
    }
  });
}

/* Fase 15 PIVOT v2 — Onboarding tour de bienvenida. */
const WELCOME_FLAG_KEY = 'wf-tour-seen';

document.getElementById('btn-show-welcome').addEventListener('click', () => {
  openModal('modal-welcome');
});

document.getElementById('btn-welcome-dismiss').addEventListener('click', () => {
  try { localStorage.setItem(WELCOME_FLAG_KEY, '1'); } catch (e) {}
  closeModal('modal-welcome');
});

/* Panel izquierdo — vista "Tus bandas" vs "Catálogo facción". */
const LEFT_PANEL_VIEW_KEY = 'wf.ui.leftPanelView';

function setLeftPanelView(view) {
  const bands = document.getElementById('panel-bands-list');
  const cat = document.getElementById('panel-faction-catalogue');
  if (!bands || !cat) return;
  const showBands = view !== 'catalogue';
  bands.style.display = showBands ? '' : 'none';
  cat.style.display = showBands ? 'none' : '';
  try { localStorage.setItem(LEFT_PANEL_VIEW_KEY, showBands ? 'bands' : 'catalogue'); } catch (e) {}
  if (showBands) renderLoadedBandsList();
}

function renderLoadedBandsList() {
  const cont = document.getElementById('loaded-bands-list');
  if (!cont) return;
  cont.innerHTML = '';
  const idx = (typeof loadIndex === 'function') ? loadIndex() : [];
  if (idx.length === 0) {
    cont.innerHTML = '<p style="color:var(--parchment);opacity:0.7;font-size:0.85rem;font-style:italic;">No hay bandas guardadas. Importa una de Companion o crea Nueva Manual.</p>';
    return;
  }
  const currentId = STATE.currentWarband && STATE.currentWarband.id;
  idx.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  for (const entry of idx) {
    const row = document.createElement('button');
    row.className = 'loaded-band-row';
    row.setAttribute('data-wb-id', entry.id);
    if (entry.id === currentId) row.classList.add('active');
    row.style.cssText = 'text-align:left;padding:0.6rem 0.7rem;border:1px solid rgba(127,107,67,0.3);border-radius:4px;background:rgba(20,12,8,0.4);color:var(--parchment);cursor:pointer;font-family:inherit;';
    if (entry.id === currentId) {
      row.style.borderColor = 'var(--gold)';
      row.style.background = 'rgba(95,25,25,0.35)';
    }
    const fac = entry.factionId ? entry.factionId.replace(/-/g, ' ') : '—';
    row.innerHTML =
      '<div style="font-weight:bold;color:' + (entry.id === currentId ? 'var(--gold)' : 'var(--parchment)') + ';">' +
        escapeHtml(entry.name || '(Sin nombre)') + '</div>' +
      '<div style="font-size:0.72rem;opacity:0.7;margin-top:0.2rem;">' +
        escapeHtml(fac) + ' · ' + (entry.models || 0) + ' modelos</div>';
    row.addEventListener('click', () => {
      if (typeof loadWarband === 'function') {
        const wb = loadWarband(entry.id);
        if (wb) {
          STATE.currentWarband = wb;
          STATE.selectedModelUid = null;
          localStorage.setItem('warband-forge-v1:current', wb.id);
          if (typeof renderAll === 'function') renderAll();
          renderLoadedBandsList();
        }
      }
    });
    cont.appendChild(row);
  }
}

(function setupLeftPanelToggle() {
  const btnCat = document.getElementById('btn-show-faction-catalogue');
  const btnBack = document.getElementById('btn-show-bands-list');
  if (btnCat) btnCat.addEventListener('click', () => setLeftPanelView('catalogue'));
  if (btnBack) btnBack.addEventListener('click', () => setLeftPanelView('bands'));
})();

// Hook renderLoadedBandsList tras persistWarband para auto-refresh.
if (typeof persistWarband === 'function') {
  const _origPersistWb = persistWarband;
  persistWarband = function(wb) {
    const r = _origPersistWb.apply(this, arguments);
    if (typeof renderLoadedBandsList === 'function') {
      try { renderLoadedBandsList(); } catch (e) {}
    }
    return r;
  };
}

/* Menú config dropdown (rueda ⚙) — toggle + acciones. */
(function setupConfigMenu() {
  const btn = document.getElementById('btn-config-menu');
  const dd = document.getElementById('config-menu-dropdown');
  if (!btn || !dd) return;
  function close() { dd.classList.remove('show'); btn.setAttribute('aria-expanded','false'); }
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = dd.classList.toggle('show');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (!dd.contains(e.target) && e.target !== btn) close();
  });
  dd.addEventListener('click', (e) => {
    const item = e.target.closest('[data-config-action]');
    if (!item) return;
    close();
    const action = item.getAttribute('data-config-action');
    if (action === 'account') openAccountModal();
    else if (action === 'github') _openGithubSyncModal();
    else if (action === 'welcome') openModal('modal-welcome');
    else if (action === 'disclaimer') openModal('modal-disclaimer');
  });
})();

// Disclaimer fan-made primera visita: aparece 2s y se cierra solo.
// Accesible siempre desde el menú de configuración (rueda ⚙).
const DISCLAIMER_FLAG_KEY = 'wf-disclaimer-seen';
function showFanMadeDisclaimer(autoCloseMs) {
  const el = document.getElementById('disclaimer-toast');
  if (!el) return;
  el.classList.add('show');
  if (typeof autoCloseMs === 'number' && autoCloseMs > 0) {
    setTimeout(() => el.classList.remove('show'), autoCloseMs);
  }
}
(function autoShowDisclaimerFirstVisit() {
  try {
    if (!localStorage.getItem(DISCLAIMER_FLAG_KEY)) {
      setTimeout(() => {
        showFanMadeDisclaimer(2000);
        localStorage.setItem(DISCLAIMER_FLAG_KEY, '1');
      }, 400);
    }
  } catch (e) {}
})();

/* Fase 13 PIVOT v2 — Shopping list modal handlers. */
function renderShoppingList() {
  const wb = STATE.currentWarband;
  const cont = document.getElementById('shopping-list-content');
  if (!cont) return;
  cont.innerHTML = '';
  if (!wb) {
    cont.innerHTML = '<p style="color:var(--parchment);"><em>Carga una banda primero.</em></p>';
    return;
  }
  const groups = groupShoppingItems(wb);
  const variants = Array.isArray(wb.experimentalVariants) ? wb.experimentalVariants : [];
  const variantName = (vid) => {
    const v = variants.find(x => x.id === vid);
    return v ? v.name : 'Variante eliminada';
  };

  function renderItem(it) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:0.5rem;padding:0.4rem 0.5rem;border-bottom:1px solid rgba(127,107,67,0.18);';
    if (it.checked) row.style.opacity = '0.55';
    const typeIcon = it.type === 'model' ? '👤' : '⚙';
    row.innerHTML = `
      <input type="checkbox" data-shopping-toggle="${it.id}" ${it.checked ? 'checked' : ''} />
      <span style="font-size:1.1rem;">${typeIcon}</span>
      <span style="flex:1;${it.checked ? 'text-decoration:line-through;' : ''}">${escapeHtml(it.name || '(sin nombre)')}</span>
      ${it.forModel ? `<span style="font-size:0.7rem;color:var(--parchment);opacity:0.7;">para ${escapeHtml(it.forModel)}</span>` : ''}
      <button class="btn btn-sm" data-shopping-remove="${it.id}" title="Eliminar definitivamente">🗑</button>
    `;
    return row;
  }

  function renderSection(title, items, options) {
    options = options || {};
    if (!items || items.length === 0) return;
    const sec = document.createElement('div');
    sec.style.cssText = 'margin-bottom:1rem;';
    const head = document.createElement('div');
    head.style.cssText = 'font-weight:bold;color:var(--gold);padding:0.3rem 0;border-bottom:2px solid rgba(127,107,67,0.4);';
    head.textContent = title + ' (' + items.length + ')';
    sec.appendChild(head);
    if (options.collapsed) {
      const det = document.createElement('details');
      det.appendChild(document.createElement('summary')).textContent = 'Mostrar';
      for (const it of items) det.appendChild(renderItem(it));
      sec.appendChild(det);
    } else {
      for (const it of items) sec.appendChild(renderItem(it));
    }
    cont.appendChild(sec);
  }

  // Manuales.
  renderSection('Manuales', groups.manual);
  // Por variante.
  for (const vid of Object.keys(groups.byVariant)) {
    renderSection('Desde variante: ' + variantName(vid), groups.byVariant[vid]);
  }
  // Histórico (plegable por decisión 1 doc).
  renderSection('Histórico (tachados)', groups.historico, { collapsed: true });

  if (groups.manual.length === 0 &&
      Object.keys(groups.byVariant).length === 0 &&
      groups.historico.length === 0) {
    cont.innerHTML = '<p style="color:var(--parchment);"><em>Lista vacía. Añade items arriba o promueve desde una variante.</em></p>';
  }
}

document.getElementById('btn-open-shopping').addEventListener('click', () => {
  if (!STATE.currentWarband) { alert('Carga una banda primero.'); return; }
  renderShoppingList();
  openModal('modal-shopping');
});

document.getElementById('btn-shopping-add').addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb) return;
  const nameEl = document.getElementById('shopping-new-name');
  const typeEl = document.getElementById('shopping-new-type');
  const name = (nameEl.value || '').trim();
  if (!name) { alert('Indica un nombre.'); return; }
  addShoppingItem(wb, { type: typeEl.value, name, source: 'manual' });
  nameEl.value = '';
  persistWarband(wb);
  renderShoppingList();
});

document.getElementById('btn-shopping-clear-checked').addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb) return;
  const checkedCount = (wb.shoppingList || []).filter(it => it.checked).length;
  if (checkedCount === 0) { alert('No hay items en el histórico.'); return; }
  if (!confirm('¿Borrar ' + checkedCount + ' item(s) tachado(s) definitivamente?')) return;
  clearCheckedShoppingItems(wb);
  persistWarband(wb);
  renderShoppingList();
});

document.getElementById('btn-shopping-pdf').addEventListener('click', async () => {
  const wb = STATE.currentWarband;
  if (!wb) { alert('Carga una banda primero.'); return; }
  const items = (wb.shoppingList || []).filter(it => !it.checked);
  if (items.length === 0) { alert('La lista activa está vacía (sin items para imprimir).'); return; }
  try {
    const blob = await generateShoppingListPdf(wb);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lista-compra-' + (wb.name || 'banda').replace(/\s+/g, '_').toLowerCase() + '.pdf';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Error generando PDF: ' + e.message);
  }
});

document.getElementById('shopping-list-content').addEventListener('click', (e) => {
  const wb = STATE.currentWarband;
  if (!wb) return;
  const toggle = e.target.closest('[data-shopping-toggle]');
  const remove = e.target.closest('[data-shopping-remove]');
  if (toggle) {
    toggleShoppingItemChecked(wb, toggle.getAttribute('data-shopping-toggle'));
    persistWarband(wb);
    renderShoppingList();
    return;
  }
  if (remove) {
    if (!confirm('¿Eliminar este item definitivamente?')) return;
    removeShoppingItem(wb, remove.getAttribute('data-shopping-remove'));
    persistWarband(wb);
    renderShoppingList();
  }
});

/* Fase 12-B PIVOT v2 — Sandbox modal handlers. */
function _formatVariantOverridesSummary(v) {
  if (!v.overrides || v.overrides.length === 0) return '<em>Sin cambios todavía</em>';
  const counts = { add:0, remove:0, replace:0 };
  for (const o of v.overrides) {
    if (/^add-/.test(o.type)) counts.add++;
    else if (/^remove-/.test(o.type)) counts.remove++;
    else if (/^replace-/.test(o.type)) counts.replace++;
  }
  const parts = [];
  if (counts.add) parts.push('+' + counts.add + ' añadido' + (counts.add > 1 ? 's' : ''));
  if (counts.remove) parts.push('−' + counts.remove + ' quitado' + (counts.remove > 1 ? 's' : ''));
  if (counts.replace) parts.push('↔ ' + counts.replace + ' reemplazado' + (counts.replace > 1 ? 's' : ''));
  return parts.join(' · ');
}

function renderSandboxList() {
  const list = document.getElementById('sandbox-variants-list');
  if (!list) return;
  const wb = STATE.currentWarband;
  list.innerHTML = '';
  if (!wb) {
    list.innerHTML = '<p style="color:var(--parchment);"><em>Carga una banda primero.</em></p>';
    return;
  }
  const variants = Array.isArray(wb.experimentalVariants) ? wb.experimentalVariants : [];
  if (variants.length === 0) {
    list.innerHTML = '<p style="color:var(--parchment);"><em>No hay variantes todavía. Crea la primera arriba ⬆</em></p>';
    return;
  }
  for (const v of variants) {
    const card = document.createElement('div');
    card.style.cssText = 'padding:0.75rem;border:1px solid rgba(127,107,67,0.4);border-radius:4px;background:rgba(127,107,67,0.08);';
    const created = new Date(v.createdAt || 0).toLocaleString();
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:start;margin-bottom:0.4rem;">
        <div>
          <strong style="font-size:1rem;color:var(--gold);">${escapeHtml(v.name || 'Variante')}</strong>
          <div style="font-size:0.75rem;color:var(--parchment);opacity:0.7;">${created}</div>
        </div>
        <div style="display:flex;gap:0.3rem;flex-wrap:wrap;">
          <button class="btn btn-sm" data-sandbox-edit="${v.id}" title="Edita overrides (formato JSON)">✎ Editar</button>
          <button class="btn btn-sm" data-sandbox-compare="${v.id}" title="Compara esta variante vs banda canon en el Lab (6 arquetipos enemigos)">⚔ Comparar Lab</button>
          <button class="btn btn-sm" data-sandbox-promote="${v.id}" title="Añade items nuevos a la lista de la compra">🛒 Promover</button>
          <button class="btn btn-sm" data-sandbox-duplicate="${v.id}" title="Duplicar variante">⎘ Duplicar</button>
          <button class="btn btn-sm" data-sandbox-delete="${v.id}" title="Eliminar esta variante">🗑</button>
        </div>
      </div>
      <div style="font-size:0.85rem;color:var(--parchment);">${_formatVariantOverridesSummary(v)}</div>
      ${v.description ? `<div style="font-size:0.78rem;color:var(--parchment);opacity:0.75;margin-top:0.4rem;font-style:italic;">${escapeHtml(v.description)}</div>` : ''}
      <details data-sandbox-editor="${v.id}" style="margin-top:0.5rem;">
        <summary style="cursor:pointer;font-size:0.78rem;color:var(--gold);">Ver/editar overrides (JSON)</summary>
        <textarea data-sandbox-overrides-json="${v.id}" style="width:100%;min-height:120px;margin-top:0.4rem;font-family:var(--font-mono);font-size:0.75rem;">${escapeHtml(JSON.stringify(v.overrides || [], null, 2))}</textarea>
        <div style="display:flex;gap:0.4rem;margin-top:0.3rem;">
          <button class="btn btn-sm" data-sandbox-save-overrides="${v.id}">Guardar overrides</button>
          <span style="font-size:0.72rem;color:var(--parchment);opacity:0.7;">Schema: [{type:'add-equipment'|'remove-equipment'|'replace-equipment'|'add-model'|'remove-model', modelUid?, kitId?, oldKitId?, newKitId?, model?}]</span>
        </div>
      </details>
    `;
    list.appendChild(card);
  }
}

document.getElementById('btn-open-sandbox').addEventListener('click', () => {
  if (!STATE.currentWarband) { alert('Carga una banda primero.'); return; }
  renderSandboxList();
  openModal('modal-sandbox');
});

document.getElementById('btn-sandbox-create').addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb) { alert('Carga una banda primero.'); return; }
  const input = document.getElementById('sandbox-new-variant-name');
  const name = (input.value || '').trim();
  createVariant(wb, name || ('Variante ' + (wb.experimentalVariants.length + 1)));
  input.value = '';
  persistWarband(wb);
  renderSandboxList();
});

// Event delegation para acciones por variante.
document.getElementById('sandbox-variants-list').addEventListener('click', (e) => {
  const wb = STATE.currentWarband;
  if (!wb) return;
  const promoteBtn = e.target.closest('[data-sandbox-promote]');
  const deleteBtn = e.target.closest('[data-sandbox-delete]');
  const editBtn = e.target.closest('[data-sandbox-edit]');
  const dupBtn = e.target.closest('[data-sandbox-duplicate]');
  const saveBtn = e.target.closest('[data-sandbox-save-overrides]');
  if (promoteBtn) {
    const vid = promoteBtn.getAttribute('data-sandbox-promote');
    const items = promoteVariantToShoppingList(wb, vid);
    persistWarband(wb);
    alert(items.length + ' item(s) añadido(s) a la lista de la compra.');
    return;
  }
  if (deleteBtn) {
    const vid = deleteBtn.getAttribute('data-sandbox-delete');
    const v = getVariant(wb, vid);
    if (!v) return;
    if (!confirm('¿Eliminar variante "' + v.name + '"? Los items promovidos a la lista de la compra NO se borran.')) return;
    removeVariant(wb, vid);
    persistWarband(wb);
    renderSandboxList();
    return;
  }
  if (editBtn) {
    // Abre el <details> con editor JSON.
    const vid = editBtn.getAttribute('data-sandbox-edit');
    const det = document.querySelector('[data-sandbox-editor="' + vid + '"]');
    if (det) det.open = true;
    return;
  }
  if (dupBtn) {
    const vid = dupBtn.getAttribute('data-sandbox-duplicate');
    const v = getVariant(wb, vid);
    if (!v) return;
    const copy = createVariant(wb, v.name + ' (copia)');
    copy.description = v.description;
    copy.overrides = JSON.parse(JSON.stringify(v.overrides || []));
    persistWarband(wb);
    renderSandboxList();
    return;
  }
  if (saveBtn) {
    const vid = saveBtn.getAttribute('data-sandbox-save-overrides');
    const v = getVariant(wb, vid);
    if (!v) return;
    const ta = document.querySelector('[data-sandbox-overrides-json="' + vid + '"]');
    if (!ta) return;
    let parsed;
    try { parsed = JSON.parse(ta.value); }
    catch (err) { alert('JSON inválido: ' + err.message); return; }
    if (!Array.isArray(parsed)) { alert('Schema: el JSON debe ser un array de overrides.'); return; }
    v.overrides = parsed;
    persistWarband(wb);
    renderSandboxList();
    return;
  }
  // Sub-Fase 12-D — Comparar variante vs canon en Lab.
  const compareBtn = e.target.closest('[data-sandbox-compare]');
  if (compareBtn) {
    const vid = compareBtn.getAttribute('data-sandbox-compare');
    const v = getVariant(wb, vid);
    if (!v) return;
    if (!v.overrides || v.overrides.length === 0) {
      alert('La variante "' + v.name + '" no tiene overrides — añade cambios antes de comparar.');
      return;
    }
    // Feedback inmediato (simulación 100 batallas × 6 enemigos = ~600).
    compareBtn.textContent = '⏳ Simulando...';
    compareBtn.disabled = true;
    // setTimeout para que el DOM repinte antes de bloquear.
    setTimeout(() => {
      const r = compareVariantVsCanon(wb, vid, null, { nBattles: 100 });
      compareBtn.textContent = '⚔ Comparar Lab';
      compareBtn.disabled = false;
      if (!r.ok) { alert('Error: ' + r.error); return; }
      // Render resultado en alert formateado.
      const lines = ['Comparación: Canon vs Variante "' + v.name + '"',
                     '100 batallas por enemigo · 6 arquetipos enemigos', ''];
      let canonWins = 0, variantWins = 0, ties = 0;
      for (const c of r.result.comparison) {
        const wa = (c.winA * 100).toFixed(0);
        const wb_ = (c.winB * 100).toFixed(0);
        const diff = (c.diff * 100).toFixed(1);
        let marker = '';
        if (c.betterBand === 'A') { canonWins++; marker = '← canon mejor'; }
        else if (c.betterBand === 'B') { variantWins++; marker = '→ variante mejor'; }
        else { ties++; marker = '= empate'; }
        lines.push(c.enemyLabel + ': canon ' + wa + '% / variante ' + wb_ + '% (Δ' + diff + '%) ' + marker);
      }
      lines.push('');
      lines.push('Resumen: ' + variantWins + ' a favor de variante · ' +
                 canonWins + ' a favor de canon · ' + ties + ' empate(s)');
      alert(lines.join('\n'));
    }, 50);
    return;
  }
});

// Nuevo botón en modal: "Refrescar (preservar local)".
const _refreshBtn = document.getElementById('btn-do-refresh-companion');
if (_refreshBtn) {
  _refreshBtn.addEventListener('click', () => {
    const txt = document.getElementById('companion-import-textarea').value.trim();
    const result = parseCompanionJson(txt);
    if (!result.ok) { alert('Error: ' + result.error); return; }
    if (!STATE.currentWarband) { alert('No hay banda cargada.'); return; }
    // Lee checkboxes de preservación selectiva (Sub-Fase 11.5 PIVOT v2).
    const opts = {};
    document.querySelectorAll('[data-refresh-preserve]').forEach(cb => {
      opts[cb.getAttribute('data-refresh-preserve')] = !!cb.checked;
    });
    const r = refreshCompanionWarband(STATE.currentWarband, result.data, opts);
    if (!r.ok) { alert('Error: ' + r.error); return; }
    persistWarband(STATE.currentWarband);
    closeModal('modal-import-companion');
    renderAll();
  });
}

/* =================================================================
 * BATTLE LAB UI HANDLERS
 * ================================================================= */

const LAB_ENEMY_OPTIONS = [
  { id: 'newAntioch',     label: '⚔ New Antioch (Forces of Light)' },
  { id: 'trenchPilgrims', label: '✠ Trench Pilgrims (Forces of Light)' },
  { id: 'ironSultanate',  label: '☾ Iron Sultanate (Forces of Light)' },
  { id: 'hereticLegions', label: '☩ Heretic Legions (Forces of Heresy)' },
  { id: 'blackGrail',     label: '☠ Black Grail (Forces of Heresy)' },
  { id: 'courtSerpent',   label: '🐍 Court of the Serpent (Forces of Heresy)' },
];

function renderLab() {
  const noWb = document.getElementById('lab-no-warband');
  const content = document.getElementById('lab-content');
  if (!noWb || !content) return;

  const wb = STATE.currentWarband;
  if (!wb || !wb.models || wb.models.length === 0) {
    noWb.style.display = '';
    content.style.display = 'none';
    return;
  }
  noWb.style.display = 'none';
  content.style.display = '';

  document.getElementById('lab-band-name').textContent = wb.name || '(Sin nombre)';
  const totalCost = wb.budgetTotal || (wb.models.reduce((s, m) => s + (m.companionCost || 0), 0));
  document.getElementById('lab-band-info').textContent =
    `${wb.models.length} modelos · ${totalCost} 👑${wb.companionSource ? ' · importada de Companion' : ''}`;

  // Render enemy checkboxes
  const enemyBox = document.getElementById('lab-enemy-checkboxes');
  if (enemyBox && enemyBox.children.length === 0) {
    LAB_ENEMY_OPTIONS.forEach(opt => {
      const lbl = document.createElement('label');
      lbl.style.display = 'flex';
      lbl.style.alignItems = 'center';
      lbl.style.gap = '0.4rem';
      lbl.style.cursor = 'pointer';
      lbl.innerHTML = `<input type="checkbox" data-enemy="${opt.id}" checked /> <span>${opt.label}</span>`;
      enemyBox.appendChild(lbl);
    });
  }
}

document.getElementById('lab-enemy-cost')?.addEventListener('change', (e) => {
  const customInput = document.getElementById('lab-enemy-cost-custom');
  customInput.style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
});

// ─────────────────────────────────────────────────────────────────────
// BATTLE TRACKING UI

// In-memory state for the active battle session. When null, lobby is shown.
let BATTLE_ACTIVE_SESSION = null;

function renderBattle() {
  const noWb = document.getElementById('battle-no-warband');
  const content = document.getElementById('battle-content');
  const lobby = document.getElementById('battle-lobby');
  const game = document.getElementById('battle-game');
  if (!noWb || !content || !lobby || !game) return;

  // Two views: lobby (default) and game (when a session is active)
  if (BATTLE_ACTIVE_SESSION) {
    lobby.style.display = 'none';
    game.style.display = '';
    _renderBattleGame();
    document.getElementById('btn-battle-back').style.display = '';
    document.getElementById('btn-battle-new').style.display = 'none';
    return;
  }

  // Lobby view
  lobby.style.display = '';
  game.style.display = 'none';
  document.getElementById('btn-battle-back').style.display = 'none';
  document.getElementById('btn-battle-new').style.display = '';

  const wb = STATE.currentWarband;
  if (!wb || !wb.models || wb.models.length === 0) {
    noWb.style.display = '';
    content.style.display = 'none';
    return;
  }
  noWb.style.display = 'none';
  content.style.display = '';

  document.getElementById('battle-band-name').textContent = wb.name || '(Sin nombre)';
  const totalCost = wb.budgetTotal || (wb.models.reduce((s, m) => s + (m.companionCost || 0), 0));
  document.getElementById('battle-band-info').textContent =
    `${wb.models.length} modelos · ${totalCost} 👑${wb.companionSource ? ' · importada de Companion' : ''}`;

  // Render saved sessions list (filter to current warband if available)
  _renderBattleSessionsList();
}

function _renderBattleSessionsList() {
  const list = document.getElementById('battle-sessions-list');
  if (!list) return;
  const wb = STATE.currentWarband;
  const allSessions = listBattleSessions();
  // Filter: show sessions for current warband (by id or name) OR all if no current
  const sessions = wb
    ? allSessions.filter(s => s && (s.warbandId === wb.id || s.warbandName === wb.name))
    : allSessions;

  if (sessions.length === 0) {
    list.innerHTML = `
      <p style="color:var(--parchment-dim);text-align:center;padding:1rem 0;">
        No hay partidas guardadas para esta banda. Pulsa <strong>+ Nueva partida</strong> para crear la primera.
      </p>
    `;
    return;
  }

  // Sort: in-progress first, then by startedAt desc
  sessions.sort((a, b) => {
    if (a.finished !== b.finished) return a.finished ? 1 : -1;
    return (b.startedAt || 0) - (a.startedAt || 0);
  });

  let html = '';
  for (const s of sessions) {
    const dt = new Date(s.startedAt);
    const dateStr = dt.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const isFinished = !!s.finished;
    const stateLabel = isFinished
      ? `<span style="color:var(--parchment-dim);">${s.outcome === 'win' ? '🏆 Victoria' : s.outcome === 'loss' ? '☠ Derrota' : '⚖ Empate/Final'}</span>`
      : `<span style="color:#7fb069;">▶ En curso · turno ${s.turn}/${s.numTurns}</span>`;
    const modelsAlive = Object.values(s.modelStates || {}).filter(m => m.status === 'alive').length;
    const totalModels = Object.keys(s.modelStates || {}).length;
    const bgColor = isFinished ? 'rgba(127,107,67,0.05)' : 'rgba(127,176,105,0.08)';
    html += `
      <div style="padding:0.7rem 0.9rem;background:${bgColor};border-left:3px solid ${isFinished ? 'var(--parchment-dim)' : '#7fb069'};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
        <div style="flex:1;min-width:240px;">
          <div style="display:flex;gap:0.5rem;align-items:center;flex-wrap:wrap;">
            <strong style="font-size:0.95rem;">${s.scenarioName}</strong>
            ${stateLabel}
          </div>
          <div style="font-size:0.78rem;color:var(--parchment-dim);font-family:var(--font-mono);margin-top:0.2em;">
            ${dateStr} · ${modelsAlive}/${totalModels} en pie
          </div>
        </div>
        <div style="display:flex;gap:0.4rem;">
          <button class="btn" data-battle-id="${s.id}" data-battle-action="resume" style="padding:0.3rem 0.7rem;font-size:0.85rem;">${isFinished ? 'Ver' : '▶ Continuar'}</button>
          <button class="btn" data-battle-id="${s.id}" data-battle-action="delete" style="padding:0.3rem 0.7rem;font-size:0.85rem;opacity:0.7;">✕</button>
        </div>
      </div>
    `;
  }
  list.innerHTML = html;

  // Hook resume/delete buttons
  list.querySelectorAll('button[data-battle-action]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = btn.dataset.battleId;
      const action = btn.dataset.battleAction;
      if (action === 'resume') {
        const s = loadBattleSession(id);
        if (s) {
          BATTLE_ACTIVE_SESSION = s;
          renderBattle();
        }
      } else if (action === 'delete') {
        if (!confirm('¿Borrar esta partida? No se puede deshacer.')) return;
        deleteBattleSession(id);
        _renderBattleSessionsList();
      }
    });
  });
}

// "Nueva partida" button: opens scenario picker
document.getElementById('btn-battle-new')?.addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb || !wb.models || wb.models.length === 0) {
    alert('Carga una banda primero (modo Banda).');
    return;
  }
  _renderBattleScenarioPicker();
});

function _renderBattleScenarioPicker() {
  const lobby = document.getElementById('battle-lobby');
  const game = document.getElementById('battle-game');
  lobby.style.display = 'none';
  game.style.display = '';
  document.getElementById('btn-battle-back').style.display = '';
  document.getElementById('btn-battle-new').style.display = 'none';

  let html = `
    <div style="margin-bottom:1.5rem;">
      <h2 class="panel-title" style="margin-bottom:0.3rem;">Selecciona un Scenario</h2>
      <p class="panel-subtitle" style="margin-bottom:1rem;">
        Cada scenario tiene sus propios objetivos y Glorious Deeds canon. Elige el que vas a jugar.
      </p>
    </div>
    <div style="display:flex;flex-direction:column;gap:0.6rem;">
  `;
  for (const [id, scn] of Object.entries(SCENARIOS_CATALOG)) {
    html += `
      <div style="padding:0.8rem 1rem;background:rgba(127,107,67,0.05);border:1px solid rgba(127,107,67,0.2);cursor:pointer;" data-scenario-id="${id}">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
          <strong style="font-size:1rem;color:var(--gold);">${scn.name}</strong>
          <span style="font-size:0.78rem;color:var(--parchment-dim);font-family:var(--font-mono);">${scn.numTurns} turnos · ${scn.deeds.length} Deeds</span>
        </div>
        <div style="font-size:0.85em;color:var(--parchment);margin-top:0.3em;">${scn.summary}</div>
        <div style="font-size:0.78em;color:var(--parchment-dim);margin-top:0.3em;">${scn.vpHints}</div>
      </div>
    `;
  }
  html += '</div>';

  const game2 = document.getElementById('battle-game');
  game2.innerHTML = html;

  // Hook scenario click
  game2.querySelectorAll('[data-scenario-id]').forEach(card => {
    card.addEventListener('click', () => {
      const scnId = card.dataset.scenarioId;
      const wb = STATE.currentWarband;
      _renderBattleScenarioBriefing(wb, scnId);
    });
    card.addEventListener('mouseenter', () => {
      card.style.background = 'rgba(176,141,87,0.10)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.background = 'rgba(127,107,67,0.05)';
    });
  });
}

/**
 * Renders the scenario briefing screen: shows scenario-specific analysis
 * (fit tier, strategy, deeds), and if the warband exceeds the deploy limit,
 * shows the model selector with reasoning per model.
 */
function _renderBattleScenarioBriefing(wb, scnId) {
  const game = document.getElementById('battle-game');
  const scn = SCENARIOS_CATALOG[scnId];
  if (!game || !scn) return;

  // Compute scenario fit (uses coverage matrix)
  let fit = null;
  try {
    const cov = computeCoverageMatrix(wb);
    const allFits = analyzeScenarioFit_lab(wb, cov);
    fit = allFits.find(f => f.scenarioId === scn.archetype);
  } catch (e) { console.warn('Fit failed:', e); }

  // Compute deployment recommendation (defaults to 'normal' role)
  // For assault-defense scenarios, default to attacker (user can switch)
  const initialRole = scn.hasRoles ? 'attacker' : 'normal';
  let recommendation = null;
  try {
    recommendation = recommendDeploymentForScenario(wb, scnId, initialRole);
  } catch (e) { console.warn('Deploy rec failed:', e); }

  let html = `
    <div style="margin-bottom:1rem;">
      <button class="btn" id="btn-briefing-back" style="padding:0.3rem 0.7rem;font-size:0.85em;">← Otro scenario</button>
    </div>
    <div style="margin-bottom:1.5rem;padding:1rem;background:rgba(176,141,87,0.08);border:1px solid var(--gold);">
      <div style="font-size:1.2rem;color:var(--gold);font-weight:600;margin-bottom:0.3rem;">${scn.name}</div>
      <div style="font-size:0.9em;margin-bottom:0.5rem;">${scn.summary}</div>
      <div style="font-size:0.82em;color:var(--parchment-dim);">${scn.vpHints}</div>
    </div>
  `;

  // Scenario fit section
  if (fit) {
    const tierColor = fit.fit === 'S' || fit.fit === 'A' ? '#7fb069'
      : fit.fit === 'B' ? '#d4a017' : '#c92424';
    html += `
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:1rem;color:var(--gold);margin-bottom:0.5rem;">📊 Fit de tu banda en este scenario</h3>
        <div style="padding:0.7rem 0.9rem;background:rgba(127,107,67,0.05);border-left:3px solid ${tierColor};font-size:0.9em;line-height:1.5;">
          ${fit.text}
        </div>
      </div>
    `;
  }

  // Role selector (for assault-defense scenarios)
  if (scn.hasRoles) {
    html += `
      <div style="margin-bottom:1rem;padding:0.7rem 0.9rem;background:rgba(127,107,67,0.05);">
        <strong>Rol en esta partida:</strong>
        <label style="margin-left:1rem;cursor:pointer;"><input type="radio" name="briefing-role" value="attacker" ${initialRole === 'attacker' ? 'checked' : ''}> Attacker</label>
        <label style="margin-left:0.7rem;cursor:pointer;"><input type="radio" name="briefing-role" value="defender" ${initialRole === 'defender' ? 'checked' : ''}> Defender</label>
      </div>
    `;
  }

  // Deployment recommendation section
  html += `<div id="briefing-deploy-section">`;
  html += _renderDeploymentSection(recommendation);
  html += '</div>';

  // Glorious Deeds preview
  if (scn.deeds.length) {
    html += `
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:1rem;color:var(--gold);margin-bottom:0.5rem;">🏆 Glorious Deeds disponibles (${scn.deeds.length})</h3>
        <div style="padding:0.7rem 0.9rem;background:rgba(127,107,67,0.05);font-size:0.85em;line-height:1.45;">
          <ul style="margin:0;padding-left:1.2em;">
            ${scn.deeds.map(d => `<li><strong>${d.name}</strong>${d.awardsLeaderXP ? ' <span style="color:var(--gold);" title="Otorga XP al LEADER">★</span>' : ''}: ${d.desc}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  // Start button
  html += `
    <div style="display:flex;gap:0.5rem;justify-content:flex-end;margin-top:1rem;">
      <button class="btn btn-primary" id="btn-briefing-start" style="padding:0.5rem 1rem;">▶ Empezar partida</button>
    </div>
  `;

  game.innerHTML = html;

  // Wire role selector (if any)
  game.querySelectorAll('input[name="briefing-role"]').forEach(rb => {
    rb.addEventListener('change', () => {
      const newRole = rb.value;
      let newRec = null;
      try { newRec = recommendDeploymentForScenario(wb, scnId, newRole); }
      catch (e) {}
      const section = document.getElementById('briefing-deploy-section');
      if (section) section.innerHTML = _renderDeploymentSection(newRec);
      // Re-wire after replace
      _wireDeployToggle(wb, scnId, newRole);
    });
  });

  // Initial wiring
  _wireDeployToggle(wb, scnId, initialRole);

  // Back button
  document.getElementById('btn-briefing-back').addEventListener('click', () => {
    _renderBattleScenarioPicker();
  });

  // Start button
  document.getElementById('btn-briefing-start').addEventListener('click', () => {
    // Re-read selected models from current state
    const role = scn.hasRoles
      ? (document.querySelector('input[name="briefing-role"]:checked')?.value || initialRole)
      : initialRole;
    let rec = null;
    try { rec = recommendDeploymentForScenario(wb, scnId, role); }
    catch (e) {}
    // Read user-overridden choices
    const chosenUids = [...document.querySelectorAll('input[name="briefing-deploy"]:checked')].map(cb => cb.value);
    let deployedModels;
    if (rec && rec.exceeds && chosenUids.length > 0) {
      // Use only chosen models, in their original wb order
      deployedModels = wb.models.filter(m => chosenUids.includes(m.uid));
    } else {
      deployedModels = wb.models;
    }
    if (rec && rec.exceeds && chosenUids.length > rec.limit.max) {
      alert(`Has seleccionado ${chosenUids.length} modelos pero el límite del scenario es ${rec.limit.max}. Desmarca algunos.`);
      return;
    }
    // Build a "filtered warband" to pass to createBattleSession
    const filteredWb = { ...wb, models: deployedModels };
    try {
      const session = createBattleSession({ scenarioId: scnId, warband: filteredWb });
      // Annotate session with role + bench info for resume
      session.role = role;
      if (rec && rec.exceeds) {
        const benchUids = rec.bench.map(m => m.uid).filter(uid => !chosenUids.includes(uid));
        session.benchModelUids = benchUids;
        // Store full source model data so deployReinforcement() can build
        // the modelState entry mid-game without needing the full warband.
        session.benchSourceModels = wb.models.filter(m => benchUids.includes(m.uid));
        // Detect canon reinforcements support
        const limit = getScenarioDeployLimit(scnId, role);
        session.hasReinforcements = !!limit.hasReinforcements;
      }
      saveBattleSession(session);
      BATTLE_ACTIVE_SESSION = session;
      renderBattle();
    } catch (e) {
      alert('Error creando partida: ' + e.message);
    }
  });
}

/**
 * Helper to render the deployment section (model picker if exceeds limit,
 * otherwise just a confirmation).
 */
function _renderDeploymentSection(rec) {
  if (!rec) return '';
  if (!rec.exceeds) {
    return `
      <div style="margin-bottom:1.5rem;">
        <h3 style="font-size:1rem;color:var(--gold);margin-bottom:0.5rem;">⚔ Despliegue</h3>
        <div style="padding:0.7rem 0.9rem;background:rgba(127,176,105,0.08);border-left:3px solid #7fb069;font-size:0.88em;">
          ✓ Toda tu banda (${rec.deploy.length} modelos) puede desplegarse en este scenario.
        </div>
      </div>
    `;
  }
  // Excess: show selector
  let html = `
    <div style="margin-bottom:1.5rem;">
      <h3 style="font-size:1rem;color:var(--gold);margin-bottom:0.5rem;">⚔ Selecciona qué modelos desplegar (max ${rec.limit.max})</h3>
      <p style="font-size:0.82em;color:var(--parchment-dim);margin-bottom:0.6rem;">
        Tu banda tiene <strong>${rec.deploy.length + rec.bench.length} modelos</strong> pero el límite del scenario es <strong>${rec.limit.max}</strong>${rec.limit.hasReinforcements ? ' (con reinforcements turno a turno)' : ''}. Recomendaciones marcadas según el archetype del scenario.
      </p>
      <div style="display:flex;flex-direction:column;gap:0.4rem;">
  `;
  // Recommended deploys
  for (const m of rec.deploy) {
    html += `
      <label style="display:flex;align-items:flex-start;gap:0.6rem;padding:0.5rem 0.7rem;background:rgba(127,176,105,0.05);border-left:3px solid #7fb069;cursor:pointer;line-height:1.4;">
        <input type="checkbox" name="briefing-deploy" value="${m.uid}" checked style="margin-top:0.2em;">
        <div style="flex:1;">
          <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
            <strong>${m.name}</strong>
            <span style="font-family:var(--font-mono);font-size:0.78em;color:var(--parchment-dim);">${m.companionCost || 0} 👑</span>
          </div>
          <div style="font-size:0.8em;color:var(--parchment-dim);">→ ${m.reason || 'recomendado'}</div>
        </div>
      </label>
    `;
  }
  // Benched (initially unchecked)
  if (rec.bench.length) {
    html += `<div style="margin-top:0.6rem;font-size:0.82em;color:var(--parchment-dim);">Reservas (puedes intercambiar manualmente):</div>`;
    for (const m of rec.bench) {
      html += `
        <label style="display:flex;align-items:flex-start;gap:0.6rem;padding:0.5rem 0.7rem;background:rgba(176,141,87,0.04);border-left:3px solid var(--parchment-dim);cursor:pointer;opacity:0.7;line-height:1.4;">
          <input type="checkbox" name="briefing-deploy" value="${m.uid}" style="margin-top:0.2em;">
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;font-size:0.9rem;">
              <span>${m.name}</span>
              <span style="font-family:var(--font-mono);font-size:0.78em;">${m.companionCost || 0} 👑</span>
            </div>
            <div style="font-size:0.8em;">${m.reason || ''}</div>
          </div>
        </label>
      `;
    }
  }
  html += '</div></div>';
  return html;
}

/**
 * Wires the deploy checkboxes to enforce max limit dynamically.
 */
function _wireDeployToggle(wb, scnId, role) {
  const checkboxes = document.querySelectorAll('input[name="briefing-deploy"]');
  if (!checkboxes.length) return;
  let rec = null;
  try { rec = recommendDeploymentForScenario(wb, scnId, role); }
  catch (e) {}
  if (!rec || !rec.exceeds) return;
  const limitMax = rec.limit.max;
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      const checked = [...checkboxes].filter(c => c.checked);
      if (checked.length > limitMax) {
        cb.checked = false;
        alert(`Límite del scenario: ${limitMax} modelos. Desmarca otro primero.`);
      }
    });
  });
}

// "Volver" button: returns to lobby
document.getElementById('btn-battle-back')?.addEventListener('click', () => {
  // Save current session before leaving
  if (BATTLE_ACTIVE_SESSION) saveBattleSession(BATTLE_ACTIVE_SESSION);
  BATTLE_ACTIVE_SESSION = null;
  renderBattle();
});

// Render the active battle game view
function _renderBattleGame() {
  const game = document.getElementById('battle-game');
  if (!game || !BATTLE_ACTIVE_SESSION) return;
  const s = BATTLE_ACTIVE_SESSION;
  const scenario = SCENARIOS_CATALOG[s.scenarioId];

  // Header: scenario + turn + status + VPs + finish indicator
  let html = `
    <div style="margin-bottom:1.5rem;padding:1rem;background:rgba(176,141,87,0.08);border:1px solid var(--gold);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
        <div>
          <div style="font-size:1.1rem;color:var(--gold);font-weight:600;">${s.scenarioName}</div>
          <div style="font-size:0.85em;color:var(--parchment-dim);">Banda: ${s.warbandName} · ${s.finished ? '<strong style="color:var(--gold);">Partida finalizada</strong>' : `Turno <strong>${s.turn}</strong> de ${s.numTurns}`}</div>
        </div>
        <div style="display:flex;gap:0.6rem;align-items:center;flex-wrap:wrap;">
          <label style="font-size:0.85em;">VPs tú: <input type="number" data-battle-input="vp-you" value="${s.vps.you || 0}" min="0" style="width:3em;padding:0.2em;text-align:center;"></label>
          <label style="font-size:0.85em;">VPs rival: <input type="number" data-battle-input="vp-them" value="${s.vps.them || 0}" min="0" style="width:3em;padding:0.2em;text-align:center;"></label>
          ${!s.finished ? `<button class="btn" data-battle-action="next-turn" ${s.turn >= s.numTurns ? 'disabled' : ''} style="padding:0.3rem 0.7rem;font-size:0.85em;">⏭ Siguiente turno</button>
          <button class="btn btn-primary" data-battle-action="finish" style="padding:0.3rem 0.7rem;font-size:0.85em;">🏁 Finalizar partida</button>` : ''}
        </div>
      </div>
      <div style="font-size:0.78em;color:var(--parchment-dim);margin-top:0.5em;border-top:1px dashed rgba(127,107,67,0.2);padding-top:0.5em;">
        ${scenario.vpHints}
      </div>
    </div>
  `;

  // Roster: grid of model cards
  html += `
    <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">⚔ Tu Banda — Roster</h3>
    <p style="font-size:0.78em;color:var(--parchment-dim);margin-bottom:0.6rem;">
      Toca el status (alive/down/out) para cambiarlo. Cada Glorious Deed completado por un ELITE le suma +1 XP (si ya tenía survival, queda en 2 XP máximo por canon).
    </p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:0.6rem;margin-bottom:1.5rem;">
  `;

  for (const [uid, ms] of Object.entries(s.modelStates)) {
    const statusColor = ms.status === 'alive' ? '#7fb069'
      : ms.status === 'down' ? '#d4a017' : '#c92424';
    const eliteIcon = ms.isElite ? ' <span title="ELITE" style="color:var(--gold);">★</span>' : '';
    const leaderIcon = ms.isLeader ? ' <span title="LEADER" style="color:var(--gold);">♛</span>' : '';
    html += `
      <div style="padding:0.7rem 0.8rem;background:rgba(127,107,67,0.05);border-left:3px solid ${statusColor};">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.3em;">
          <strong style="font-size:0.92rem;">${ms.name}${eliteIcon}${leaderIcon}</strong>
          <span style="font-size:0.78em;color:var(--parchment-dim);font-family:var(--font-mono);">${ms.cost} 👑</span>
        </div>
        <div style="display:flex;gap:0.3em;margin-top:0.4em;flex-wrap:wrap;">
          ${['alive','down','out'].map(st => {
            const active = ms.status === st;
            const stColor = st === 'alive' ? '#7fb069' : st === 'down' ? '#d4a017' : '#c92424';
            const stLabel = st === 'alive' ? 'En pie' : st === 'down' ? 'Down' : 'OoA';
            return `<button class="btn" data-battle-action="set-status" data-uid="${uid}" data-status="${st}" style="padding:0.2em 0.5em;font-size:0.78em;${active ? `background:${stColor};color:var(--ink-black);` : 'opacity:0.6;'}">${stLabel}</button>`;
          }).join('')}
        </div>
        <div style="display:flex;gap:0.4em;margin-top:0.4em;font-size:0.82em;align-items:center;flex-wrap:wrap;">
          <label>BLOOD:
            <input type="number" min="0" max="6" value="${ms.bloodMarkers}" data-battle-input="blood" data-uid="${uid}" style="width:3em;padding:0.1em 0.3em;text-align:center;">
          </label>
          <label>Kills:
            <input type="number" min="0" value="${ms.kills}" data-battle-input="kills" data-uid="${uid}" style="width:3em;padding:0.1em 0.3em;text-align:center;">
          </label>
        </div>
        ${scenario.deeds.length ? `
          <details style="margin-top:0.4em;font-size:0.82em;">
            <summary style="cursor:pointer;color:var(--gold);">Glorious Deeds (${ms.deedsCompleted.length})</summary>
            <div style="display:flex;flex-direction:column;gap:0.2em;margin-top:0.3em;">
              ${scenario.deeds.map(d => `
                <label style="display:flex;align-items:flex-start;gap:0.3em;cursor:pointer;line-height:1.3;">
                  <input type="checkbox" ${ms.deedsCompleted.includes(d.name) ? 'checked' : ''} data-battle-input="deed" data-uid="${uid}" data-deed="${d.name}" style="margin-top:0.2em;flex-shrink:0;">
                  <span><strong>${d.name}</strong>${d.awardsLeaderXP ? ' <span style="color:var(--gold);" title="Otorga XP al LEADER si lo completa él">★</span>' : ''}: ${d.desc}</span>
                </label>
              `).join('')}
            </div>
          </details>
        ` : ''}
      </div>
    `;
  }

  html += '</div>';

  // Reinforcements section: only if session has bench models AND scenario
  // supports reinforcements AND game is not finished.
  if (!s.finished && Array.isArray(s.benchModelUids) && s.benchModelUids.length > 0) {
    const sourceModels = s.benchSourceModels || [];
    html += `
      <h3 style="font-size:1rem;margin-bottom:0.4rem;color:var(--gold);">🪖 Reinforcements disponibles (${s.benchModelUids.length})</h3>
      <p style="font-size:0.78em;color:var(--parchment-dim);margin-bottom:0.5rem;">
        ${s.hasReinforcements
          ? 'Modelos en bench pendientes de despliegue. Canon: roll-off + 1D3 al inicio de cada turno indica cuántos puede entrar cada lado, en el borde de su Deployment Zone, &gt;8" del enemigo más cercano.'
          : 'Modelos no desplegados (este scenario no tiene reinforcements canónicos — solo informativo).'}
      </p>
      <div style="display:flex;flex-direction:column;gap:0.4rem;margin-bottom:1.5rem;">
    `;
    for (const uid of s.benchModelUids) {
      const sm = sourceModels.find(m => m.uid === uid);
      if (!sm) continue;
      const isElite = (sm.companionKeywords || []).some(kw => /elite/i.test(kw.name || kw));
      const isLeader = (sm.companionKeywords || []).some(kw => /leader/i.test(kw.name || kw));
      const eliteIcon = isElite ? ' <span style="color:var(--gold);">★</span>' : '';
      const leaderIcon = isLeader ? ' <span style="color:var(--gold);">♛</span>' : '';
      html += `
        <div style="padding:0.5rem 0.7rem;background:rgba(176,141,87,0.04);border-left:3px solid var(--parchment-dim);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.5rem;">
          <div>
            <strong>${sm.name}</strong>${eliteIcon}${leaderIcon}
            <span style="font-size:0.78em;color:var(--parchment-dim);font-family:var(--font-mono);margin-left:0.5em;">${sm.companionCost || 0} 👑</span>
          </div>
          <button class="btn" data-battle-action="deploy-reinf" data-uid="${uid}" style="padding:0.25rem 0.7rem;font-size:0.85em;">Desplegar (T${s.turn})</button>
        </div>
      `;
    }
    html += '</div>';
  }

  // Notes section
  html += `
    <h3 style="font-size:1rem;margin-bottom:0.4rem;color:var(--gold);">📝 Notas de la partida</h3>
    <textarea data-battle-input="notes" rows="3" style="width:100%;font-family:var(--font-mono);font-size:0.85rem;padding:0.5rem;background:var(--ink-black);border:1px solid var(--rust);color:var(--parchment);" placeholder="Eventos memorables, decisiones tácticas, cambios de plan…">${s.notes || ''}</textarea>
  `;

  // Summary if finished
  if (s.finished) {
    const xp = computeBattleXP(s);
    const totalXP = Object.values(xp).reduce((a, b) => a + b, 0);
    const totalDeeds = Object.values(s.modelStates).reduce((sum, ms) => sum + (ms.deedsCompleted ? ms.deedsCompleted.length : 0), 0);
    const xpAlreadyApplied = !!s.xpApplied;
    html += `
      <div style="margin-top:1.5rem;padding:1rem;background:rgba(176,141,87,0.08);border:1px solid var(--gold);">
        <h3 style="font-size:1rem;margin:0 0 0.5em;color:var(--gold);">🏁 Resumen final</h3>
        <div style="display:flex;flex-wrap:wrap;gap:1rem;font-size:0.88em;">
          <div><strong>Resultado:</strong> ${s.outcome === 'win' ? '🏆 Victoria' : s.outcome === 'loss' ? '☠ Derrota' : '⚖ Empate'}</div>
          <div><strong>VPs:</strong> ${s.vps.you} - ${s.vps.them}</div>
          <div><strong>XP otorgada total:</strong> ${totalXP} (a ${Object.keys(xp).length} ELITE${Object.keys(xp).length === 1 ? '' : 's'})</div>
          <div><strong>Glorious Deeds completadas:</strong> ${totalDeeds}</div>
          <div><strong>Promotion Pool:</strong> ${1 + totalDeeds}D6 (canon: 1D6 base + 1D6 por Deed)</div>
        </div>
        ${Object.keys(xp).length ? `
          <div style="margin-top:0.7em;font-size:0.85em;">
            <strong>XP por modelo ELITE:</strong>
            <ul style="margin:0.3em 0 0;padding-left:1.5em;">
              ${Object.entries(xp).map(([uid, x]) => `<li>${s.modelStates[uid].name}: <strong>+${x} XP</strong>${s.modelStates[uid].deedsCompleted.length ? ` (${s.modelStates[uid].deedsCompleted.length} Deed${s.modelStates[uid].deedsCompleted.length > 1 ? 's' : ''})` : ''}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${totalXP > 0 ? `
          <div style="margin-top:1rem;padding-top:0.7em;border-top:1px dashed rgba(127,107,67,0.3);">
            ${xpAlreadyApplied
              ? `<span style="color:#7fb069;">✓ XP aplicada a la banda</span> · La progresión de tus ELITEs se actualizó. Puedes ver el detalle en el modo Banda → Detalle del modelo.`
              : `<button class="btn btn-primary" data-battle-action="apply-xp" style="padding:0.5rem 1rem;font-size:0.9em;">📈 Aplicar XP a la banda</button>
                 <span style="font-size:0.82em;color:var(--parchment-dim);margin-left:0.7em;">Suma la XP a la progresión campaña de tus ELITEs (modo Banda).</span>`
            }
          </div>
        ` : ''}
        <div style="margin-top:0.8rem;padding-top:0.6em;border-top:1px dashed rgba(127,107,67,0.3);">
          <button class="btn" data-battle-action="open-promotion" style="padding:0.5rem 1rem;font-size:0.9em;">🎲 Abrir Promotion Pool (${1 + totalDeeds}D6)</button>
          <span style="font-size:0.82em;color:var(--parchment-dim);margin-left:0.7em;">Asigna dados a Troops para promociones (canon p.104).</span>
        </div>
        ${(() => {
          // ── Trauma Step ──────────────────────────────────────────────
          // Lists OoA models grouped by Troop / ELITE, with roll buttons.
          // Troops: 1D6 inline (1-2 dead, 3+ survive)
          // ELITEs: D66 → opens trauma modal, mutates baseProgression
          const ooa = getOoaModelsByType(s);
          const totalOoA = ooa.troops.length + ooa.elites.length;
          if (totalOoA === 0) {
            return `
              <div style="margin-top:1rem;padding-top:0.7em;border-top:1px dashed rgba(127,107,67,0.3);font-size:0.85em;color:var(--parchment-dim);">
                🩹 <strong>Trauma Step:</strong> Sin modelos OoA en esta partida — no hay rolls de trauma que resolver.
              </div>
            `;
          }
          let traumaHtml = `
            <div style="margin-top:1rem;padding-top:0.7em;border-top:1px dashed rgba(127,107,67,0.3);">
              <h4 style="font-size:0.95rem;margin:0 0 0.4em;color:var(--gold);">🩹 Trauma Step (${totalOoA} OoA)</h4>
              <p style="font-size:0.78em;color:var(--parchment-dim);margin:0 0 0.6em;">
                Canon (Digital Rulebook p.101-103): los Troops OoA tiran 1D6 (1-2 muere, 3+ sobrevive). Los ELITE tiran D66 en la Trauma Table. Cada ELITE OoA recibe 1 Battle Scar (salvo Recovery / Hardened / Bitter Lessons / Prominent Scar).
              </p>
          `;
          // Troops
          if (ooa.troops.length) {
            traumaHtml += `<div style="margin-bottom:0.7em;">`;
            traumaHtml += `<strong style="font-size:0.85em;">Troops (${ooa.troops.length}) — Bloodbath Roll 1D6:</strong>`;
            traumaHtml += `<div style="display:flex;flex-direction:column;gap:0.3em;margin-top:0.3em;">`;
            for (const { uid, modelState } of ooa.troops) {
              const tr = modelState.traumaResolved;
              if (tr) {
                const color = tr.kind === 'death' ? '#c92424' : '#7fb069';
                const icon = tr.kind === 'death' ? '☠' : '✓';
                traumaHtml += `
                  <div style="padding:0.35em 0.6em;background:rgba(176,141,87,0.04);border-left:3px solid ${color};display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4em;">
                    <span><strong>${escapeHtml(modelState.name)}</strong></span>
                    <span style="color:${color};font-family:var(--font-mono);font-size:0.85em;">${icon} ${escapeHtml(tr.name)}</span>
                  </div>
                `;
              } else {
                traumaHtml += `
                  <div style="padding:0.35em 0.6em;background:rgba(176,141,87,0.04);border-left:3px solid var(--parchment-dim);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4em;">
                    <span><strong>${escapeHtml(modelState.name)}</strong></span>
                    <button class="btn" data-battle-action="trauma-troop" data-uid="${uid}" style="padding:0.2rem 0.6rem;font-size:0.8em;">🎲 Tirar 1D6</button>
                  </div>
                `;
              }
            }
            traumaHtml += `</div></div>`;
          }
          // ELITEs
          if (ooa.elites.length) {
            traumaHtml += `<div style="margin-bottom:0.4em;">`;
            traumaHtml += `<strong style="font-size:0.85em;">ELITEs (${ooa.elites.length}) — Trauma Table D66:</strong>`;
            traumaHtml += `<div style="display:flex;flex-direction:column;gap:0.3em;margin-top:0.3em;">`;
            for (const { uid, modelState } of ooa.elites) {
              const tr = modelState.traumaResolved;
              if (tr) {
                const color = tr.kind === 'death' ? '#c92424'
                            : tr.kind === 'capture' ? '#c92424'
                            : tr.kind === 'recovery' ? '#7fb069'
                            : tr.kind === 'positive' ? '#7fb069'
                            : '#d4a017';
                const icon = tr.kind === 'death' ? '☠'
                           : tr.kind === 'capture' ? '🔗'
                           : tr.kind === 'recovery' ? '✓'
                           : tr.kind === 'positive' ? '★'
                           : '⚠';
                traumaHtml += `
                  <div style="padding:0.35em 0.6em;background:rgba(176,141,87,0.04);border-left:3px solid ${color};">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4em;">
                      <span><strong>${escapeHtml(modelState.name)}</strong> <span style="color:var(--gold);">★</span></span>
                      <span style="color:${color};font-family:var(--font-mono);font-size:0.85em;">${icon} D66 ${tr.value} — ${escapeHtml(tr.name)}</span>
                    </div>
                    ${tr.detail ? `<div style="font-size:0.75em;color:var(--parchment-dim);margin-top:0.2em;line-height:1.4;">${escapeHtml(tr.detail)}</div>` : ''}
                  </div>
                `;
              } else {
                traumaHtml += `
                  <div style="padding:0.35em 0.6em;background:rgba(176,141,87,0.04);border-left:3px solid var(--parchment-dim);display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4em;">
                    <span><strong>${escapeHtml(modelState.name)}</strong> <span style="color:var(--gold);">★</span></span>
                    <button class="btn" data-battle-action="trauma-elite" data-uid="${uid}" style="padding:0.2rem 0.6rem;font-size:0.8em;">🎲 Tirar D66</button>
                  </div>
                `;
              }
            }
            traumaHtml += `</div></div>`;
          }
          traumaHtml += `</div>`;
          return traumaHtml;
        })()}
      </div>
    `;
  }

  game.innerHTML = html;

  // Wire interactivity
  _wireBattleGameHandlers();
}

function _wireBattleGameHandlers() {
  const game = document.getElementById('battle-game');
  if (!game || !BATTLE_ACTIVE_SESSION) return;
  const s = BATTLE_ACTIVE_SESSION;

  // Status buttons
  game.querySelectorAll('button[data-battle-action="set-status"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const newStatus = btn.dataset.status;
      if (s.modelStates[uid]) {
        s.modelStates[uid].status = newStatus;
        saveBattleSession(s);
        _renderBattleGame();
      }
    });
  });

  // BLOOD / Kills inputs
  game.querySelectorAll('input[data-battle-input="blood"]').forEach(inp => {
    inp.addEventListener('change', () => {
      const uid = inp.dataset.uid;
      if (s.modelStates[uid]) {
        s.modelStates[uid].bloodMarkers = Math.max(0, parseInt(inp.value, 10) || 0);
        saveBattleSession(s);
      }
    });
  });
  game.querySelectorAll('input[data-battle-input="kills"]').forEach(inp => {
    inp.addEventListener('change', () => {
      const uid = inp.dataset.uid;
      if (s.modelStates[uid]) {
        s.modelStates[uid].kills = Math.max(0, parseInt(inp.value, 10) || 0);
        saveBattleSession(s);
      }
    });
  });

  // VP inputs
  game.querySelectorAll('input[data-battle-input="vp-you"]').forEach(inp => {
    inp.addEventListener('change', () => {
      s.vps.you = Math.max(0, parseInt(inp.value, 10) || 0);
      saveBattleSession(s);
    });
  });
  game.querySelectorAll('input[data-battle-input="vp-them"]').forEach(inp => {
    inp.addEventListener('change', () => {
      s.vps.them = Math.max(0, parseInt(inp.value, 10) || 0);
      saveBattleSession(s);
    });
  });

  // Deed checkboxes
  game.querySelectorAll('input[data-battle-input="deed"]').forEach(inp => {
    inp.addEventListener('change', () => {
      const uid = inp.dataset.uid;
      const deedName = inp.dataset.deed;
      if (!s.modelStates[uid]) return;
      const arr = s.modelStates[uid].deedsCompleted;
      const idx = arr.indexOf(deedName);
      if (inp.checked && idx < 0) arr.push(deedName);
      else if (!inp.checked && idx >= 0) arr.splice(idx, 1);
      saveBattleSession(s);
      // Re-render to update the count badge
      _renderBattleGame();
    });
  });

  // Notes
  game.querySelectorAll('textarea[data-battle-input="notes"]').forEach(ta => {
    ta.addEventListener('input', () => {
      s.notes = ta.value;
      // Throttled save: save on blur instead of every keystroke
    });
    ta.addEventListener('blur', () => {
      saveBattleSession(s);
    });
  });

  // Next turn
  game.querySelectorAll('button[data-battle-action="next-turn"]').forEach(btn => {
    btn.addEventListener('click', () => {
      if (s.turn < s.numTurns) {
        s.turn += 1;
        saveBattleSession(s);
        _renderBattleGame();
      }
    });
  });

  // Finish game
  game.querySelectorAll('button[data-battle-action="finish"]').forEach(btn => {
    btn.addEventListener('click', () => {
      // Determine outcome by VPs
      const outcome = s.vps.you > s.vps.them ? 'win'
        : s.vps.you < s.vps.them ? 'loss' : 'draw';
      const conf = confirm(`¿Finalizar partida? Resultado: ${outcome === 'win' ? 'Victoria' : outcome === 'loss' ? 'Derrota' : 'Empate'} (${s.vps.you}-${s.vps.them}). Esta acción no se puede deshacer.`);
      if (!conf) return;
      s.finished = true;
      s.finishedAt = Date.now();
      s.outcome = outcome;
      saveBattleSession(s);
      _renderBattleGame();
    });
  });

  // Deploy reinforcement from bench
  game.querySelectorAll('button[data-battle-action="deploy-reinf"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const r = deployReinforcement(s, uid);
      if (!r.success) {
        alert('No se pudo desplegar: ' + (r.error || 'error desconocido'));
        return;
      }
      saveBattleSession(s);
      _renderBattleGame();
    });
  });

  // Apply XP to warband (campaign integration)
  game.querySelectorAll('button[data-battle-action="apply-xp"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wb = STATE.currentWarband;
      if (!wb) {
        alert('No hay banda cargada. Carga la banda en modo Banda primero.');
        return;
      }
      // Verify warband matches the session (by id or name)
      if (s.warbandId && wb.id !== s.warbandId) {
        if (!confirm(`La banda actual no coincide con la de esta partida (${s.warbandName}). ¿Aplicar XP igualmente a la banda actual?`)) return;
      }
      const result = applyBattleXPToWarband(s, wb);
      if (result.alreadyApplied) {
        alert('La XP ya fue aplicada anteriormente.');
        return;
      }
      // Persist warband
      try {
        if (typeof persistWarband === 'function') persistWarband(wb);
      } catch (e) {
        console.warn('persistWarband failed:', e);
      }
      saveBattleSession(s);
      const lines = Object.values(result.perModel).map(p =>
        `· ${p.name}: +${p.xpGained} XP (total ${p.xpTotal})`
      ).join('\n');
      alert(`XP aplicada a ${result.applied} ELITE${result.applied !== 1 ? 's' : ''} (total +${result.totalXP} XP):\n\n${lines}`);
      _renderBattleGame();
    });
  });

  // Trauma roll for Troops — inline 1D6 (no modal)
  game.querySelectorAll('button[data-battle-action="trauma-troop"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const wb = STATE.currentWarband;
      const roll = rollTroopBloodbath();
      const r = applyTraumaResolution(s, uid, 'troop', roll, wb);
      if (!r.success && !r.alreadyResolved) {
        alert('Error: ' + (r.error || 'unknown'));
        return;
      }
      try {
        if (wb && typeof persistWarband === 'function') persistWarband(wb);
      } catch (e) {}
      saveBattleSession(s);
      const ms = s.modelStates[uid];
      const verb = roll.survived ? 'sobrevivió' : 'murió';
      alert(`${ms.name}: 1D6 = ${roll.value} → ${verb}.${roll.survived ? '' : ' (Battlekit perdido per canon.)'}`);
      _renderBattleGame();
    });
  });

  // Open Promotion Pool modal
  game.querySelectorAll('button[data-battle-action="open-promotion"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wb = STATE.currentWarband;
      if (!wb) {
        alert('No hay banda cargada. Carga la banda en modo Banda primero.');
        return;
      }
      // Pre-load deeds from this session into wb.gameNumber if applicable
      // (the modal will read them from CAMPAIGN_TABLES.countGloriousDeeds).
      // Simplest: pass directly via a temp deedsTotal; or just open and let
      // the user adjust the count manually if they're not in campaign mode.
      try {
        if (typeof openPromotionModal === 'function') {
          openPromotionModal(wb, (promotedList) => {
            try { persistWarband(wb); } catch (e) {}
            const names = (promotedList || []).map(p => p.name || p).join(', ');
            if (names) alert(`Promociones aplicadas: ${names}`);
            _renderBattleGame();
          });
        } else {
          alert('Promotion Pool widget no disponible en este build.');
        }
      } catch (e) {
        alert('Error abriendo Promotion Pool: ' + e.message);
      }
    });
  });

  // Trauma roll for ELITEs — uses existing openTraumaRollModal
  game.querySelectorAll('button[data-battle-action="trauma-elite"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const wb = STATE.currentWarband;
      if (!wb) {
        alert('No hay banda cargada para aplicar el trauma. Carga la banda en modo Banda primero.');
        return;
      }
      const model = wb.models.find(m => m.uid === uid);
      if (!model) {
        // Just roll D66 inline without warband mutation
        const tens = 1 + Math.floor(Math.random() * 6);
        const units = 1 + Math.floor(Math.random() * 6);
        const roll = { tens, units, value: tens * 10 + units };
        const r = applyTraumaResolution(s, uid, 'elite', roll, null);
        saveBattleSession(s);
        _renderBattleGame();
        return;
      }
      // Open the existing trauma modal — its onApply callback gets (entry, roll)
      // We use it to update both the session AND the warband baseProgression
      openTraumaRollModal(model, wb, (entry, roll) => {
        const r = applyTraumaResolution(s, uid, 'elite', roll, wb);
        if (!r.success && !r.alreadyResolved) {
          alert('Error: ' + (r.error || 'unknown'));
          return;
        }
        try { persistWarband(wb); } catch (e) {}
        saveBattleSession(s);
        _renderBattleGame();
      });
    });
  });
}

// ─────────────────────────────────────────────────────────────────────

document.getElementById('btn-lab-clear')?.addEventListener('click', () => {
  const r = document.getElementById('lab-results');
  if (r) r.innerHTML = '';
  const status = document.getElementById('lab-status');
  if (status) status.textContent = 'Listo';
});

// Lab Historial modal: opens a list of saved simulations
function _renderLabHistoryList() {
  const list = document.getElementById('lab-history-list');
  if (!list) return;
  const onlyCurrent = document.getElementById('lab-history-current-only')?.checked ?? true;
  const wb = STATE.currentWarband;
  const filter = (onlyCurrent && wb) ? wb.name : null;
  const entries = loadSimHistory(filter);
  if (!entries.length) {
    list.innerHTML = `<p style="color:var(--parchment-dim);text-align:center;padding:2rem 0;">${
      filter
        ? `No hay simulaciones guardadas para la banda "${filter}". Ejecuta una simulación en el Lab para empezar a registrar histórico.`
        : 'No hay simulaciones guardadas. Ejecuta una en el Lab para empezar a registrar histórico.'
    }</p>`;
    return;
  }
  // Sort by timestamp DESC (most recent first)
  entries.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  const modeLabel = { analyze: '📊 Analizar', duel: '⚔ Duelo', compare: '🔬 Comparar' };
  const terrainLabel = { open: 'Campo abierto', mixed: 'Mixto', urban: 'Urbano' };
  let html = '';
  for (const e of entries) {
    const dt = new Date(e.timestamp);
    const dateStr = dt.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
    const avgWin = e.summary?.avgWinRate || 0;
    const winColor = avgWin >= 0.5 ? '#7fb069' : avgWin >= 0.3 ? '#d4a017' : '#c92424';
    html += `
      <div style="margin-bottom:0.7rem;padding:0.7rem 0.9rem;background:rgba(127,107,67,0.05);border-left:3px solid var(--gold);">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:0.4rem;margin-bottom:0.3rem;">
          <strong style="font-size:0.95rem;">${e.bandName || '—'}</strong>
          <span style="font-size:0.78rem;color:var(--parchment-dim);font-family:var(--font-mono);">${dateStr}</span>
        </div>
        <div style="font-size:0.82rem;color:var(--parchment-dim);margin-bottom:0.3rem;">
          ${modeLabel[e.mode] || e.mode} · ${e.nBattles} batallas · terreno ${terrainLabel[e.terrain] || e.terrain} · ${e.bandModelCount} modelos · ${e.bandCost} 👑
        </div>
        <div style="font-size:0.85rem;">
          <span style="color:${winColor};font-weight:600;">Win promedio: ${(avgWin * 100).toFixed(0)}%</span>
    `;
    if (e.summary?.matchups?.length) {
      const sorted = [...e.summary.matchups].sort((a, b) => b.winRate - a.winRate);
      const best = sorted[0];
      const worst = sorted[sorted.length - 1];
      if (best && worst && sorted.length > 1) {
        html += `<span style="color:var(--parchment-dim);"> · mejor vs ${best.enemyLabel} (${(best.winRate * 100).toFixed(0)}%) · peor vs ${worst.enemyLabel} (${(worst.winRate * 100).toFixed(0)}%)</span>`;
      } else if (best) {
        html += `<span style="color:var(--parchment-dim);"> · vs ${best.enemyLabel}</span>`;
      }
    }
    html += '</div></div>';
  }
  list.innerHTML = html;
}

document.getElementById('btn-lab-history')?.addEventListener('click', () => {
  _renderLabHistoryList();
  openModal('modal-lab-history');
});

document.getElementById('lab-history-current-only')?.addEventListener('change', _renderLabHistoryList);

document.getElementById('btn-lab-history-clear')?.addEventListener('click', () => {
  if (!confirm('¿Vaciar todo el histórico de simulaciones? Esta acción no se puede deshacer.')) return;
  clearSimHistory();
  _renderLabHistoryList();
});

// Lab Terrain analysis: runs simulations across all 3 terrains and renders
// the variance results inline. Useful to detect terrain-dependent bands.
document.getElementById('btn-lab-terrain')?.addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb || !wb.models || wb.models.length === 0) {
    alert('Carga una banda primero (modo Banda).');
    return;
  }
  const selectedEnemies = [...document.querySelectorAll('#lab-enemy-checkboxes input[type=checkbox]:checked')]
    .map(c => c.dataset.enemy);
  if (selectedEnemies.length === 0) {
    alert('Selecciona al menos un enemigo en la pestaña Analizar.');
    return;
  }
  const userCost = wb.budgetTotal || (wb.models.reduce((s, m) => s + (m.companionCost || 0), 0));
  const costMode = document.getElementById('lab-enemy-cost').value;
  const customCost = parseInt(document.getElementById('lab-enemy-cost-custom').value, 10) || 700;
  let enemyCost = userCost;
  if (costMode === 'custom') enemyCost = Math.max(100, customCost);
  else if (costMode === '110') enemyCost = Math.round(userCost * 1.10);
  else if (costMode === '120') enemyCost = Math.round(userCost * 1.20);
  // Use a smaller batch per terrain (3× nBattles total). For 5000 batallas
  // → 2500/terrain × 3 terrenos × N enemigos puede ser muy pesado.
  const requestedBattles = parseInt(document.getElementById('lab-n-battles').value, 10) || 100;
  const nBattles = Math.max(50, Math.round(requestedBattles / 2));
  const totalTerrainBattles = nBattles * 3 * selectedEnemies.length;
  if (totalTerrainBattles >= 25000) {
    const warn = `Vas a simular ${totalTerrainBattles.toLocaleString('es-ES')} batallas (${nBattles.toLocaleString('es-ES')}/terreno × 3 terrenos × ${selectedEnemies.length} enemigos). Puede tardar 1-2 minutos. ¿Continuar?`;
    if (!confirm(warn)) {
      const st = document.getElementById('lab-status');
      if (st) st.textContent = 'Cancelado';
      return;
    }
  }
  const status = document.getElementById('lab-status');
  if (status) status.textContent = totalTerrainBattles >= 10000
    ? `⏳ Analizando ${totalTerrainBattles.toLocaleString('es-ES')} batallas en 3 terrenos…`
    : '⏳ Analizando terrenos…';

  setTimeout(() => {
    let variance;
    try {
      variance = analyzeTerrainVariance_lab(wb, selectedEnemies, { nBattles, enemyCost });
    } catch (e) {
      console.error('Terrain analysis failed:', e);
      if (status) status.textContent = '✗ Error';
      return;
    }
    _renderTerrainAnalysis(variance, userCost, nBattles);
    if (status) status.textContent = '✓ Terrenos analizados';
  }, 30);
});

// Render terrain variance analysis inline above the standard results
function _renderTerrainAnalysis(variance, userCost, nBattles) {
  const out = document.getElementById('lab-results');
  if (!out) return;
  const terrainLabels = { open: 'Campo abierto', mixed: 'Mixto', urban: 'Urbano denso' };
  let html = `
    <div style="margin-bottom:1rem;padding:1rem;background:rgba(176,141,87,0.08);border:1px solid var(--gold);">
      <div style="font-size:1.1rem;color:var(--gold);font-weight:600;margin-bottom:0.3rem;">
        🌍 Análisis Terreno-Aware
      </div>
      <div style="font-size:0.85em;color:var(--parchment-dim);">
        Tu banda enfrentada a los enemigos seleccionados en los 3 terrenos · ${nBattles} batallas/terreno · banda usuario ${userCost} 👑
      </div>
    </div>
  `;

  // Render per-terrain summary table
  html += `
    <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:1.5rem;">
      <thead>
        <tr style="border-bottom:2px solid var(--gold);">
          <th style="text-align:left;padding:0.5rem;">Enemigo</th>
          <th style="text-align:right;padding:0.5rem;">Open Win%</th>
          <th style="text-align:right;padding:0.5rem;">Mixto Win%</th>
          <th style="text-align:right;padding:0.5rem;">Urbano Win%</th>
          <th style="text-align:right;padding:0.5rem;">Δ (open-urban)</th>
        </tr>
      </thead>
      <tbody>
  `;
  const allOpen = variance.results.open;
  const allMixed = variance.results.mixed;
  const allUrban = variance.results.urban;
  for (let i = 0; i < allOpen.length; i++) {
    const wO = allOpen[i].winRateA;
    const wM = allMixed[i].winRateA;
    const wU = allUrban[i].winRateA;
    const diff = wO - wU;
    const diffColor = Math.abs(diff) < 0.1 ? 'var(--parchment-dim)'
      : diff > 0 ? '#7fb069' : '#c92424';
    const colorOf = (w) => w >= 0.6 ? '#7fb069' : w >= 0.4 ? '#d4a017' : '#c92424';
    html += `
      <tr style="border-bottom:1px solid rgba(127,107,67,0.2);">
        <td style="padding:0.5rem;">${allOpen[i].enemyLabel}</td>
        <td style="padding:0.5rem;text-align:right;color:${colorOf(wO)};font-weight:600;">${(wO*100).toFixed(0)}%</td>
        <td style="padding:0.5rem;text-align:right;color:${colorOf(wM)};font-weight:600;">${(wM*100).toFixed(0)}%</td>
        <td style="padding:0.5rem;text-align:right;color:${colorOf(wU)};font-weight:600;">${(wU*100).toFixed(0)}%</td>
        <td style="padding:0.5rem;text-align:right;color:${diffColor};font-family:var(--font-mono);">${diff > 0 ? '+' : ''}${(diff*100).toFixed(0)}pp</td>
      </tr>
    `;
  }
  // Footer averages
  html += `
        <tr style="border-top:2px solid var(--gold);background:rgba(176,141,87,0.05);font-weight:600;">
          <td style="padding:0.5rem;color:var(--gold);">Promedio</td>
          <td style="padding:0.5rem;text-align:right;">${(variance.avgWin.open*100).toFixed(0)}%</td>
          <td style="padding:0.5rem;text-align:right;">${(variance.avgWin.mixed*100).toFixed(0)}%</td>
          <td style="padding:0.5rem;text-align:right;">${(variance.avgWin.urban*100).toFixed(0)}%</td>
          <td style="padding:0.5rem;text-align:right;color:var(--gold);">Mejor: ${terrainLabels[variance.bestTerrain]}</td>
        </tr>
      </tbody>
    </table>
  `;

  // Render insights
  if (variance.insights && variance.insights.length) {
    html += `
      <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">Insights</h3>
      <div style="display:flex;flex-direction:column;gap:0.5rem;">
    `;
    for (const i of variance.insights) {
      const colors = {
        good: { bg: 'rgba(127,176,105,0.08)', border: '#7fb069', icon: '✓' },
        crit: { bg: 'rgba(201,36,36,0.08)',  border: '#c92424', icon: '⚠' },
        warn: { bg: 'rgba(212,160,23,0.08)', border: '#d4a017', icon: '◆' },
        info: { bg: 'rgba(176,141,87,0.05)',  border: 'var(--parchment-dim)', icon: '·' },
      };
      const c = colors[i.severity] || colors.info;
      html += `
        <div style="padding:0.6rem 0.8rem;background:${c.bg};border-left:3px solid ${c.border};font-size:0.88em;line-height:1.45;">
          <span style="color:${c.border};font-weight:600;margin-right:0.4em;">${c.icon}</span>${i.text}
        </div>
      `;
    }
    html += '</div>';
  }
  out.innerHTML = html;
}

// Lab Mode toggle: switching between "analyze" and "duel" shows/hides
// the corresponding configuration panels.
document.getElementById('lab-mode')?.addEventListener('change', (e) => {
  const mode = e.target.value;
  const duelPanel = document.getElementById('lab-duel-panel');
  const comparePanel = document.getElementById('lab-compare-panel');
  const loadoutPanel = document.getElementById('lab-loadout-panel');
  const spatialPanel = document.getElementById('lab-spatial-panel');
  const analyzeConfig = document.getElementById('lab-analyze-config');
  if (duelPanel)    duelPanel.style.display    = (mode === 'duel')    ? 'block' : 'none';
  if (comparePanel) comparePanel.style.display = (mode === 'compare') ? 'block' : 'none';
  if (loadoutPanel) loadoutPanel.style.display = (mode === 'loadout') ? 'block' : 'none';
  if (spatialPanel) {
    spatialPanel.style.display = (mode === 'spatial') ? 'block' : 'none';
    // Sprint 31: populate loadout dropdown con variantes del wb actual.
    if (mode === 'spatial') {
      const loadoutSel = document.getElementById('lab-spatial-loadout');
      if (loadoutSel && STATE.currentWarband) {
        const wb = STATE.currentWarband;
        const variants = Array.isArray(wb.experimentalVariants) ? wb.experimentalVariants : [];
        // Reset opciones manteniendo canon como primera.
        loadoutSel.innerHTML = '<option value="canon">Canon (banda original)</option>';
        for (const v of variants) {
          const opt = document.createElement('option');
          opt.value = v.id;
          opt.textContent = '🧪 ' + (v.name || 'Variante');
          loadoutSel.appendChild(opt);
        }
      }
    }
  }
  // Analyze config (enemy checkboxes + cost) shown for analyze + compare;
  // ocultado para duel / loadout / spatial (cada uno usa su propio panel).
  if (analyzeConfig) analyzeConfig.style.display = (mode === 'duel' || mode === 'loadout' || mode === 'spatial') ? 'none' : 'grid';
  // If switching to loadout, populate the model selector
  if (mode === 'loadout' && typeof _populateLoadoutModelSelector === 'function') {
    _populateLoadoutModelSelector();
  }
  // Sync tab visual state
  for (const tab of document.querySelectorAll('.lab-mode-tab')) {
    const isActive = tab.dataset.mode === mode;
    tab.classList.toggle('active', isActive);
    tab.style.color = isActive ? 'var(--gold)' : 'var(--parchment-dim)';
    tab.style.borderBottomColor = isActive ? 'var(--gold)' : 'transparent';
  }
  // Sync hint visibility
  for (const hint of document.querySelectorAll('.lab-mode-hint')) {
    hint.style.display = hint.dataset.for === mode ? 'block' : 'none';
  }
});

// Tab buttons → update the hidden <select> and dispatch change
for (const tab of document.querySelectorAll('.lab-mode-tab')) {
  tab.addEventListener('click', () => {
    const select = document.getElementById('lab-mode');
    if (select && select.value !== tab.dataset.mode) {
      select.value = tab.dataset.mode;
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
}

// In-memory storage for the rival warband (Duel mode). Not persisted to
// localStorage — the user pastes JSON each session.
let LAB_DUEL_RIVAL = null;

document.getElementById('btn-lab-duel-load')?.addEventListener('click', () => {
  const ta = document.getElementById('lab-duel-json');
  const status = document.getElementById('lab-duel-status');
  const txt = (ta?.value || '').trim();
  if (!txt) {
    if (status) { status.textContent = 'Pega un JSON primero.'; status.style.color = '#c92424'; }
    return;
  }
  try {
    const parsed = JSON.parse(txt);
    LAB_DUEL_RIVAL = importCompanionWarband(parsed);
    const cost = LAB_DUEL_RIVAL.models.reduce((s, m) => s + (m.companionCost || 0), 0);
    if (status) {
      status.textContent = `✓ ${LAB_DUEL_RIVAL.name || 'Banda rival'} (${LAB_DUEL_RIVAL.models.length} modelos, ${cost} 👑)`;
      status.style.color = '#7fb069';
    }
  } catch (e) {
    LAB_DUEL_RIVAL = null;
    if (status) { status.textContent = '✗ JSON inválido: ' + e.message; status.style.color = '#c92424'; }
  }
});

document.getElementById('btn-lab-duel-clear')?.addEventListener('click', () => {
  LAB_DUEL_RIVAL = null;
  const ta = document.getElementById('lab-duel-json');
  const status = document.getElementById('lab-duel-status');
  if (ta) ta.value = '';
  if (status) { status.textContent = 'Sin banda rival.'; status.style.color = 'var(--parchment-dim)'; }
});

// In-memory storage for "Banda B" used in Compare mode. Same lifecycle as
// LAB_DUEL_RIVAL — pasted in each session, not persisted.
let LAB_COMPARE_B = null;

document.getElementById('btn-lab-compare-load')?.addEventListener('click', () => {
  const ta = document.getElementById('lab-compare-json');
  const status = document.getElementById('lab-compare-status');
  const txt = (ta?.value || '').trim();
  if (!txt) {
    if (status) { status.textContent = 'Pega un JSON primero.'; status.style.color = '#c92424'; }
    return;
  }
  try {
    const parsed = JSON.parse(txt);
    LAB_COMPARE_B = importCompanionWarband(parsed);
    const cost = LAB_COMPARE_B.models.reduce((s, m) => s + (m.companionCost || 0), 0);
    if (status) {
      status.textContent = `✓ ${LAB_COMPARE_B.name || 'Banda B'} (${LAB_COMPARE_B.models.length} modelos, ${cost} 👑)`;
      status.style.color = '#7fb069';
    }
  } catch (e) {
    LAB_COMPARE_B = null;
    if (status) { status.textContent = '✗ JSON inválido: ' + e.message; status.style.color = '#c92424'; }
  }
});

document.getElementById('btn-lab-compare-clear')?.addEventListener('click', () => {
  LAB_COMPARE_B = null;
  const ta = document.getElementById('lab-compare-json');
  const status = document.getElementById('lab-compare-status');
  if (ta) ta.value = '';
  if (status) { status.textContent = 'Sin banda B.'; status.style.color = 'var(--parchment-dim)'; }
});

// Optional Band C for 3-way comparison
let LAB_COMPARE_C = null;

document.getElementById('btn-lab-compare-c-load')?.addEventListener('click', () => {
  const ta = document.getElementById('lab-compare-c-json');
  const status = document.getElementById('lab-compare-c-status');
  const txt = (ta?.value || '').trim();
  if (!txt) {
    if (status) { status.textContent = 'Pega un JSON primero.'; status.style.color = '#c92424'; }
    return;
  }
  try {
    const parsed = JSON.parse(txt);
    LAB_COMPARE_C = importCompanionWarband(parsed);
    const cost = LAB_COMPARE_C.models.reduce((s, m) => s + (m.companionCost || 0), 0);
    if (status) {
      status.textContent = `✓ ${LAB_COMPARE_C.name || 'Banda C'} (${LAB_COMPARE_C.models.length} modelos, ${cost} 👑)`;
      status.style.color = '#7fb069';
    }
  } catch (e) {
    LAB_COMPARE_C = null;
    if (status) { status.textContent = '✗ JSON inválido: ' + e.message; status.style.color = '#c92424'; }
  }
});

document.getElementById('btn-lab-compare-c-clear')?.addEventListener('click', () => {
  LAB_COMPARE_C = null;
  const ta = document.getElementById('lab-compare-c-json');
  const status = document.getElementById('lab-compare-c-status');
  if (ta) ta.value = '';
  if (status) { status.textContent = 'Sin banda C.'; status.style.color = 'var(--parchment-dim)'; }
});

// ─────────────────────────────────────────────────────────────────────
// LOADOUT LAB UI
// ─────────────────────────────────────────────────────────────────────

// In-memory state for the Loadout Lab tab. Variants are tied to the
// currently-selected model. Switching model resets variants.
let LAB_LOADOUT_STATE = {
  modelUid: null,
  variants: [],  // [{ label, items: [armouryItem,...] }]
};

/**
 * Populate the model selector with the current warband's models.
 * Each option shows the model name + cost + ELITE badge.
 */
function _populateLoadoutModelSelector() {
  const select = document.getElementById('lab-loadout-model');
  const info   = document.getElementById('lab-loadout-model-info');
  if (!select) return;
  const wb = STATE.currentWarband;
  select.innerHTML = '<option value="">— Selecciona un modelo —</option>';
  if (!wb || !wb.models || wb.models.length === 0) {
    if (info) info.textContent = 'Carga una banda primero (modo Banda).';
    return;
  }
  for (const m of wb.models) {
    const isElite = (m.companionKeywords || []).some(kw =>
      /elite/i.test(kw.name || kw));
    const eliteBadge = isElite ? ' ★' : '';
    const opt = document.createElement('option');
    opt.value = m.uid;
    opt.textContent = `${m.name}${eliteBadge} (${m.companionCost || 0}👑)`;
    select.appendChild(opt);
  }
  if (info) info.textContent = `${wb.models.length} modelos disponibles.`;
}

/**
 * Build the armoury options for a given unit (filtered to weapons only,
 * grouped by category). Returns { ranged, melee, grenades }.
 */
function _getArmouryWeaponsForUnit(unit, factionId) {
  const fac = DATA.factions[factionId];
  if (!fac || !fac.armoury) return { ranged: [], melee: [], grenades: [] };
  return {
    ranged:   fac.armoury.ranged   || [],
    melee:    fac.armoury.melee    || [],
    grenades: fac.armoury.grenades || [],
  };
}

/**
 * Render the variants list for the current selected model.
 * Each variant has: label input, item picker (multi-select), remove button.
 */
function _renderLoadoutVariants() {
  const container = document.getElementById('lab-loadout-variant-list');
  const wrapper   = document.getElementById('lab-loadout-variants');
  if (!container || !wrapper) return;
  const wb = STATE.currentWarband;
  if (!wb || !LAB_LOADOUT_STATE.modelUid) {
    wrapper.style.display = 'none';
    return;
  }
  const targetModel = wb.models.find(m => m.uid === LAB_LOADOUT_STATE.modelUid);
  if (!targetModel) {
    wrapper.style.display = 'none';
    return;
  }
  wrapper.style.display = 'block';

  const armoury = _getArmouryWeaponsForUnit({ id: targetModel.unitId }, wb.factionId);
  const allWeapons = [
    ...armoury.ranged.map(w => ({ ...w, category: 'ranged' })),
    ...armoury.melee.map(w => ({ ...w, category: 'melee' })),
    ...armoury.grenades.map(w => ({ ...w, category: 'grenade' })),
  ];

  let html = '';
  LAB_LOADOUT_STATE.variants.forEach((v, idx) => {
    const itemsCost = (v.items || []).reduce((s, i) => s + (i.cost || 0), 0);
    html += `
      <div style="padding:0.5rem 0.7rem;background:rgba(176,141,87,0.04);border-left:3px solid var(--gold);">
        <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.3rem;">
          <input type="text" data-loadout-variant-label="${idx}" value="${escapeHtml(v.label || '')}"
            placeholder="Nombre (ej: Heavy Shotgun)" style="flex:1;background:var(--ink-black);border:1px solid var(--rust);color:var(--parchment);padding:0.25rem 0.5rem;font-family:var(--font-mono);font-size:0.85rem;" />
          <span style="font-size:0.78em;color:var(--parchment-dim);font-family:var(--font-mono);">+${itemsCost}👑</span>
          <button class="btn" data-loadout-remove-variant="${idx}" style="padding:0.2rem 0.5rem;font-size:0.78em;opacity:0.7;">Quitar</button>
        </div>
        <div style="font-size:0.78em;color:var(--parchment-dim);margin-bottom:0.25rem;">Items equipados:</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-bottom:0.3rem;">
    `;
    if ((v.items || []).length === 0) {
      html += `<span style="font-size:0.78em;color:var(--parchment-dim);font-style:italic;">(ninguno)</span>`;
    } else {
      v.items.forEach((item, itemIdx) => {
        html += `
          <span style="background:rgba(127,107,67,0.2);padding:0.15rem 0.4rem;font-size:0.78em;border:1px solid var(--rust);">
            ${escapeHtml(item.name)} <button data-loadout-remove-item="${idx}-${itemIdx}" style="background:none;border:none;color:var(--parchment-dim);cursor:pointer;padding:0;margin-left:0.2rem;">×</button>
          </span>
        `;
      });
    }
    html += `</div>
        <select data-loadout-add-item="${idx}" style="background:var(--ink-black);border:1px solid var(--rust);color:var(--parchment);padding:0.25rem 0.5rem;font-family:var(--font-mono);font-size:0.78rem;width:100%;">
          <option value="">+ Añadir arma del armoury…</option>
    `;
    // Group options by category
    const groupLabels = { ranged: '🔫 Ranged', melee: '⚔ Melee', grenade: '💣 Grenades' };
    const grouped = { ranged: [], melee: [], grenade: [] };
    for (const w of allWeapons) grouped[w.category].push(w);
    for (const cat of ['ranged','melee','grenade']) {
      if (!grouped[cat].length) continue;
      html += `<optgroup label="${groupLabels[cat]}">`;
      for (const w of grouped[cat]) {
        const limit = w.restriction ? ` · ${w.restriction.slice(0, 30)}` : '';
        html += `<option value="${escapeHtml(w.id)}|${cat}">${escapeHtml(w.name)} (${w.cost}👑)${escapeHtml(limit)}</option>`;
      }
      html += `</optgroup>`;
    }
    html += `</select>
      </div>
    `;
  });

  // Add-variant button limit
  const limitReached = LAB_LOADOUT_STATE.variants.length >= 4;
  const addBtn = document.getElementById('btn-loadout-add-variant');
  if (addBtn) {
    addBtn.style.display = limitReached ? 'none' : 'inline-block';
  }

  // Render run button if at least 1 variant has at least 1 item
  const ready = LAB_LOADOUT_STATE.variants.some(v => (v.items || []).length > 0);
  html += `<div style="margin-top:0.8rem;padding-top:0.8rem;border-top:1px dashed rgba(127,107,67,0.3);text-align:center;">`;
  if (ready) {
    html += `<button class="btn btn-primary" id="btn-loadout-run" style="padding:0.5rem 1.2rem;">▶ Analizar variantes (~50 batallas/variante × 6 facciones)</button>`;
  } else {
    html += `<span style="font-size:0.85em;color:var(--parchment-dim);font-style:italic;">Añade al menos 1 item a una variante para analizar.</span>`;
  }
  html += `</div>`;

  container.innerHTML = html;

  // Wire variant inputs
  for (const input of container.querySelectorAll('[data-loadout-variant-label]')) {
    input.addEventListener('input', (e) => {
      const idx = parseInt(input.dataset.loadoutVariantLabel, 10);
      if (LAB_LOADOUT_STATE.variants[idx]) {
        LAB_LOADOUT_STATE.variants[idx].label = e.target.value;
      }
    });
  }
  for (const btn of container.querySelectorAll('[data-loadout-remove-variant]')) {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.loadoutRemoveVariant, 10);
      LAB_LOADOUT_STATE.variants.splice(idx, 1);
      _renderLoadoutVariants();
    });
  }
  for (const btn of container.querySelectorAll('[data-loadout-remove-item]')) {
    btn.addEventListener('click', () => {
      const [vIdx, iIdx] = btn.dataset.loadoutRemoveItem.split('-').map(Number);
      const v = LAB_LOADOUT_STATE.variants[vIdx];
      if (v && v.items) {
        v.items.splice(iIdx, 1);
        _renderLoadoutVariants();
      }
    });
  }
  for (const sel of container.querySelectorAll('[data-loadout-add-item]')) {
    sel.addEventListener('change', () => {
      const vIdx = parseInt(sel.dataset.loadoutAddItem, 10);
      const v = LAB_LOADOUT_STATE.variants[vIdx];
      if (!v) return;
      const [itemId, cat] = sel.value.split('|');
      if (!itemId) return;
      const armoury = _getArmouryWeaponsForUnit({ id: 'x' }, wb.factionId);
      const allWeapons = [...armoury.ranged, ...armoury.melee, ...armoury.grenades];
      const item = allWeapons.find(w => w.id === itemId);
      if (item) {
        if (!v.items) v.items = [];
        v.items.push(item);
        _renderLoadoutVariants();
      }
      sel.value = '';
    });
  }
  // Wire run button
  const runBtn = document.getElementById('btn-loadout-run');
  if (runBtn) {
    runBtn.addEventListener('click', _runLoadoutAnalysis);
  }
}

/**
 * Run the loadout analysis on the user's current warband + selected model
 * + variants. Renders the results table.
 */
function _runLoadoutAnalysis() {
  const wb = STATE.currentWarband;
  if (!wb || !LAB_LOADOUT_STATE.modelUid) return;
  const variantsWithItems = LAB_LOADOUT_STATE.variants.filter(v => (v.items || []).length > 0);
  if (variantsWithItems.length === 0) {
    alert('Añade al menos 1 item a una variante.');
    return;
  }

  // Collect selected scenarios
  const scenarioMap = {
    'default':         { id: 'default',         label: 'Genérico',          archetype: null, role: null },
    'hold-the-line':   { id: 'hold-the-line',   label: 'Hold the Line',     archetype: 'hold-the-line', role: null },
    'assault-attacker':{ id: 'assault-attacker',label: 'Assault Attacker',  archetype: 'assault-defense', role: 'attacker' },
    'capture-hold':    { id: 'capture-hold',    label: 'Capture / Relic',   archetype: 'capture-hold', role: null },
    'great-war':       { id: 'great-war',       label: 'Great War',         archetype: 'great-war', role: null },
  };
  const selectedScenarios = [];
  for (const cb of document.querySelectorAll('[data-loadout-scenario]')) {
    if (cb.checked) {
      const id = cb.dataset.loadoutScenario;
      if (scenarioMap[id]) selectedScenarios.push(scenarioMap[id]);
    }
  }
  if (selectedScenarios.length === 0) {
    alert('Selecciona al menos 1 escenario.');
    return;
  }

  const status = document.getElementById('lab-status');
  const totalRuns = variantsWithItems.length * 6 * selectedScenarios.length * 50;
  if (status) {
    status.textContent = `Analizando ${variantsWithItems.length} variante(s) × 6 facciones × ${selectedScenarios.length} escenario(s) × 50 batallas = ${totalRuns} batallas… (puede tardar 10-60s)`;
    status.style.color = 'var(--parchment)';
  }
  // Yield to browser so the status renders before the heavy computation starts
  setTimeout(() => {
    try {
      const result = runLoadoutAnalysisInBand(wb, LAB_LOADOUT_STATE.modelUid, variantsWithItems, {
        nBattles: 50,
        terrain: document.getElementById('lab-terrain')?.value || 'mixed',
        scenarios: selectedScenarios,
      });
      _renderLoadoutResults(result);
      if (status) {
        status.textContent = `✓ Análisis completo: ${result.variants.length} variantes vs ${result.factions.length} facciones × ${result.scenarios.length} escenario(s)`;
        status.style.color = '#7fb069';
      }
    } catch (e) {
      console.error(e);
      if (status) {
        status.textContent = '❌ Error: ' + e.message;
        status.style.color = '#c92424';
      }
    }
  }, 50);
}

/**
 * Render the results of a loadout analysis as a comparison table.
 * Highlights best/worst per metric and shows top threats per matchup.
 */
function _renderLoadoutResults(result) {
  const out = document.getElementById('lab-results');
  if (!out) return;
  if (!result || !result.variants || result.variants.length === 0) {
    out.innerHTML = '<p>Sin resultados.</p>';
    return;
  }

  const wb = STATE.currentWarband;
  const targetModel = wb?.models?.find(m => m.uid === LAB_LOADOUT_STATE.modelUid);
  const modelName = targetModel?.name || 'Modelo';

  // Find best variant per metric
  const byWinRate    = [...result.variants].sort((a, b) => b.metrics.winRate - a.metrics.winRate)[0];
  const byEfficiency = [...result.variants].sort((a, b) => b.metrics.efficiency - a.metrics.efficiency)[0];
  const byVersatility = [...result.variants].sort((a, b) => b.metrics.versatility - a.metrics.versatility)[0];

  const heatColor = (rate) => {
    if (rate >= 0.55) return '#7fb069';
    if (rate >= 0.40) return '#a8b466';
    if (rate >= 0.25) return '#d4a017';
    if (rate >= 0.15) return '#a8721d';
    return '#c92424';
  };
  const heatBg = (rate) => {
    const alpha = Math.max(0.15, Math.min(0.7, rate));
    if (rate >= 0.55) return `rgba(127,176,105,${alpha})`;
    if (rate >= 0.40) return `rgba(168,180,102,${alpha})`;
    if (rate >= 0.25) return `rgba(212,160,23,${alpha * 0.8})`;
    if (rate >= 0.15) return `rgba(168,114,29,${alpha * 0.7})`;
    return `rgba(201,36,36,${alpha * 0.6})`;
  };

  // Variant detection: if the warband has a variantId, identify which
  // variant rules are active for transparency. This explains why the
  // same model can perform very differently between bands.
  const variantLabels = {
    'iron-wall-def':     '🏰 Defenders of the Iron Wall',
    'alba':              '🏔 Kingdom of Alba',
    'prussia':           '⚙ Stosstruppen of Prussia',
    'eire-rangers':      '🍀 Éire Rangers',
    'papal-states':      '⛪ Papal States',
    'house-wisdom':      '📜 House of Wisdom',
    'fidai-alamut':      '🗡 Fida\'i of Alamut',
    'abyssinia':         '🦁 Expeditionary Forces of Abyssinia',
    'red-brigade':       '☭ The Red Brigade',
    'trench-ghosts':     '👻 Trench Ghosts',
    'avarice-knights':   '💰 Knights of Avarice',
    'naval-raiders':     '⚓ Heretic Naval Raiders',
    'sacred-affliction': '⛓ Procession of the Sacred Affliction',
    'st-methodius':      '🪦 War Pilgrimage of Saint Methodius',
    'tenth-plague':      '🐑 Cavalcade of the Tenth Plague',
  };
  const variantNotes = {
    'iron-wall-def':     'En escenarios defensivos (hold-the-line, assault-defense defender), todos los ranged ganan +1 DICE (Marksmanship of the Iron Wall). Los Siege Jezzails ganan otro +1 DICE (Siege Jezzail Teams).',
    'alba':              'Todos los modelos ganan IGNORE DEFENDED OBSTACLE (Rampant Charge). El Lieutenant y los Shocktroopers ganan STRONG (Highland Strength) — pueden disparar HEAVY moviéndose. Mejor en escenarios de objetivos.',
    'prussia':           'Las granadas ganan +4" de range (Masters of the Grenade). Lt y Shock Troopers ganan flag rapidAssault para Dash. Mejor como atacante rápido.',
    'eire-rangers':      'Todos los modelos ganan flag hitAndRun (-1 DICE a melee contra ellos cuando se retiran). El Lieutenant gana SKIRMISHER (en vez de Hold Your Fire!). Mejor en hit-and-run / objective rush con tropa ligera.',
    'red-brigade':       'Wear and Tear: empieza con 1 BLOOD MARKER por cada 200 ducados de coste total. No Retreat: no puede retirarse. Las penalties iniciales se notan en el rendimiento de los modelos (a más BLOOD MARKERS, peor en ataques).',
    'trench-ghosts':     'Undead Horror: FEAR + NEGATE DIFFICULT TERRAIN + NEGATE GAS para todos. Semi-corporeal: -1 INJURY DICE en disparos. Slow and Creeping: Movement 3" en Dash. Sobreviven mejor pero son lentos.',
    'avarice-knights':   'Heretic Priest gana Price of Greed (en vez de Puppet Master). Sin armas FIRE/SHRAPNEL. Acceso a Coin Hammer (BLESSING en hit) y Goetic Warlocks como mercenarios.',
    'naval-raiders':     'Todos los modelos ganan flag rapidAssault: +1 DICE en Risky Success Roll de Dash ACTION. Mejor para asaltos rápidos.',
    'sacred-affliction': 'Punishing Millstones: +1 INJURY DICE en melee contra objetivos Down (excepto Ecclesiastic Prisoners). El Castigator gana Wrath of God: NEGATE FEAR y los BLOOD MARKERS nunca se le colocan, mantiene su rendimiento al 100% toda la batalla.',
    'st-methodius':      'Variante Ortodoxa especializada en Anchorites. Sus reglas son de composición de banda (hasta 2 Anchorite Shrines, +0 DICE Ranged) — no afectan al motor de combate, pero la banda específica tiene un perfil único.',
    'tenth-plague':      'Día de Su Ira: el War Prophet sustituye Laying on of Hands por una acción ofensiva (Injury Roll IGNORE ARMOUR a 3"). El Castigator gana TOUGH gratis. Favour of the Lord coloca un BLESSING MARKER en la banda al inicio de cada turno. Combinación devastadora.',
  };
  const wbVariantId = wb?.variantId || null;
  const variantBadge = wbVariantId && variantLabels[wbVariantId];
  const variantNote = wbVariantId && variantNotes[wbVariantId];

  let html = `
    <h3 style="font-size:1.1rem;margin-bottom:0.5rem;color:var(--gold);">⚒ Loadout Analysis — ${escapeHtml(modelName)}</h3>
    ${variantBadge ? `
    <div style="display:inline-block;padding:0.3rem 0.6rem;margin-bottom:0.6rem;background:rgba(176,141,87,0.12);border:1px solid var(--gold);font-size:0.85em;">
      <strong style="color:var(--gold);">${escapeHtml(variantBadge)}</strong>
      ${variantNote ? `<div style="font-size:0.78em;color:var(--parchment-dim);margin-top:0.2em;font-weight:normal;">${escapeHtml(variantNote)}</div>` : ''}
    </div>
    ` : ''}
    <p style="font-size:0.82em;color:var(--parchment-dim);margin-bottom:1rem;">
      Cada variante reemplaza el equipo del modelo en tu banda y se simula contra las 6 facciones canónicas. Win rate = de la banda completa. Eficiencia = winRate × 100 / coste total de la variante. Versatilidad = uniformidad del rendimiento (1 = mismo win rate en todas las facciones).
    </p>

    <!-- Summary cards: best of each metric -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:0.6rem;margin-bottom:1.2rem;">
      <div style="padding:0.7rem;background:rgba(127,176,105,0.08);border-left:3px solid #7fb069;">
        <div style="font-size:0.78em;color:var(--parchment-dim);">🏆 Mejor Win Rate</div>
        <div style="font-weight:700;color:var(--gold);font-size:1.05rem;margin-top:0.2em;">${escapeHtml(byWinRate.label)}</div>
        <div style="font-size:0.85em;font-family:var(--font-mono);">${(byWinRate.metrics.winRate * 100).toFixed(0)}% · ${byWinRate.cost}👑</div>
      </div>
      <div style="padding:0.7rem;background:rgba(212,160,23,0.08);border-left:3px solid #d4a017;">
        <div style="font-size:0.78em;color:var(--parchment-dim);">💰 Mejor Eficiencia <span style="color:var(--gold);">★</span></div>
        <div style="font-weight:700;color:var(--gold);font-size:1.05rem;margin-top:0.2em;">${escapeHtml(byEfficiency.label)}</div>
        <div style="font-size:0.85em;font-family:var(--font-mono);">eff ${byEfficiency.metrics.efficiency.toFixed(2)} · ${byEfficiency.cost}👑</div>
      </div>
      <div style="padding:0.7rem;background:rgba(176,141,87,0.08);border-left:3px solid var(--gold);">
        <div style="font-size:0.78em;color:var(--parchment-dim);">🎯 Más Versátil</div>
        <div style="font-weight:700;color:var(--gold);font-size:1.05rem;margin-top:0.2em;">${escapeHtml(byVersatility.label)}</div>
        <div style="font-size:0.85em;font-family:var(--font-mono);">vers ${byVersatility.metrics.versatility.toFixed(2)}</div>
      </div>
    </div>
  `;

  // Comparison table: rows=variants, cols=factions
  // When multiple scenarios are selected, this table shows the AVERAGE
  // across scenarios (overall view); a separate scenario-breakdown table
  // is rendered below.
  const multiScenario = result.scenarios && result.scenarios.length > 1;

  // Build a per-(variant, faction) aggregate. With multiple scenarios, each
  // (variant, faction) cell shows the AVERAGE win rate across scenarios.
  const aggMatchups = new Map();  // key = `${variantIdx}_${factionId}` → {winRate, modelKills, modelOoARate}
  for (let vi = 0; vi < result.variants.length; vi++) {
    const v = result.variants[vi];
    const byFaction = new Map();
    for (const m of v.matchups) {
      if (!byFaction.has(m.factionId)) {
        byFaction.set(m.factionId, { winRates: [], modelKills: [], modelOoARates: [] });
      }
      const e = byFaction.get(m.factionId);
      e.winRates.push(m.bandWinRate);
      e.modelKills.push(m.modelKills);
      e.modelOoARates.push(m.modelOoARate);
    }
    for (const [fid, e] of byFaction.entries()) {
      const avg = (a) => a.reduce((s,x) => s+x, 0) / Math.max(1, a.length);
      aggMatchups.set(`${vi}_${fid}`, {
        winRate: avg(e.winRates),
        modelKills: avg(e.modelKills),
        modelOoARate: avg(e.modelOoARates),
      });
    }
  }

  html += `
    <div style="overflow-x:auto;margin-bottom:1.2rem;">
      <table style="border-collapse:collapse;width:100%;font-size:0.85rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--gold);">
            <th style="text-align:left;padding:0.4rem 0.6rem;font-weight:600;">Variante</th>
            <th style="text-align:center;padding:0.4rem 0.4rem;font-weight:600;font-family:var(--font-mono);font-size:0.82em;">Coste</th>
  `;
  for (const fac of result.factions) {
    const shortLabel = fac.label.replace('New Antioch','NA').replace('Trench Pilgrims','Pilgrims').replace('Iron Sultanate','Sultanate').replace('Heretic Legions','Heretic').replace('Black Grail','B.Grail').replace('Court of Serpent','Court');
    html += `<th style="text-align:center;padding:0.4rem 0.3rem;font-weight:600;font-size:0.78em;">${escapeHtml(shortLabel)}</th>`;
  }
  html += `
            <th style="text-align:center;padding:0.4rem 0.3rem;font-weight:600;font-size:0.82em;background:rgba(176,141,87,0.1);">Win%</th>
            <th style="text-align:center;padding:0.4rem 0.3rem;font-weight:600;font-size:0.82em;background:rgba(212,160,23,0.1);">Eff ★</th>
            <th style="text-align:center;padding:0.4rem 0.3rem;font-weight:600;font-size:0.82em;background:rgba(176,141,87,0.1);">Vers</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (let vi = 0; vi < result.variants.length; vi++) {
    const v = result.variants[vi];
    const isBestEff = v === byEfficiency;
    const rowBg = isBestEff ? 'background:rgba(212,160,23,0.05);' : '';
    const itemsList = (v.items || []).map(i => i.name).join(', ');
    html += `
      <tr style="border-bottom:1px solid rgba(127,107,67,0.2);${rowBg}">
        <td style="padding:0.5rem 0.6rem;">
          <strong style="color:var(--gold);">${escapeHtml(v.label || '(sin nombre)')}</strong>
          <div style="font-size:0.72em;color:var(--parchment-dim);margin-top:0.2em;">${escapeHtml(itemsList)}</div>
        </td>
        <td style="text-align:center;padding:0.4rem;font-family:var(--font-mono);font-size:0.85em;">${v.cost}👑</td>
    `;
    for (const fac of result.factions) {
      const agg = aggMatchups.get(`${vi}_${fac.id}`) || { winRate: 0, modelKills: 0, modelOoARate: 0 };
      const rate = agg.winRate;
      const bg = heatBg(rate);
      const fg = heatColor(rate);
      html += `
        <td style="text-align:center;padding:0.4rem 0.3rem;background:${bg};font-family:var(--font-mono);color:${fg};font-weight:700;">
          ${(rate * 100).toFixed(0)}%
          <div style="font-size:0.65em;color:var(--parchment-dim);font-weight:normal;margin-top:0.1em;">k:${agg.modelKills.toFixed(1)} · OoA:${(agg.modelOoARate*100).toFixed(0)}%</div>
        </td>
      `;
    }
    html += `
        <td style="text-align:center;padding:0.4rem 0.3rem;background:rgba(176,141,87,0.1);font-family:var(--font-mono);font-weight:700;color:var(--gold);">${(v.metrics.winRate * 100).toFixed(0)}%</td>
        <td style="text-align:center;padding:0.4rem 0.3rem;background:rgba(212,160,23,0.1);font-family:var(--font-mono);font-weight:700;color:var(--gold);">${v.metrics.efficiency.toFixed(2)}</td>
        <td style="text-align:center;padding:0.4rem 0.3rem;background:rgba(176,141,87,0.1);font-family:var(--font-mono);font-weight:700;color:var(--gold);">${v.metrics.versatility.toFixed(2)}</td>
      </tr>
    `;
  }
  html += `</tbody></table></div>`;

  // Per-scenario breakdown — only if multiple scenarios selected.
  // Shows how each variant performs in different scenario archetypes.
  if (multiScenario) {
    html += `
      <div style="margin-top:1.2rem;">
        <h4 style="font-size:0.95rem;color:var(--gold);margin-bottom:0.4rem;">📜 Rendimiento por escenario</h4>
        <p style="font-size:0.78em;color:var(--parchment-dim);margin-bottom:0.6rem;">
          Misma comparación, desglosada por escenario. Esto revela trade-offs invisibles en el promedio: un Heavy Shotgun puede ser inútil en relic-hunt y devastador en hold-the-line.
        </p>
        <div style="overflow-x:auto;">
          <table style="border-collapse:collapse;width:100%;font-size:0.85rem;">
            <thead>
              <tr style="border-bottom:2px solid var(--gold);">
                <th style="text-align:left;padding:0.4rem 0.6rem;font-weight:600;">Variante</th>
    `;
    for (const scn of result.scenarios) {
      html += `<th style="text-align:center;padding:0.4rem 0.3rem;font-weight:600;font-size:0.82em;">${escapeHtml(scn.label)}</th>`;
    }
    html += `</tr></thead><tbody>`;

    for (const v of result.variants) {
      html += `
        <tr style="border-bottom:1px solid rgba(127,107,67,0.2);">
          <td style="padding:0.5rem 0.6rem;">
            <strong style="color:var(--gold);">${escapeHtml(v.label)}</strong>
          </td>
      `;
      // Find best and worst scenarios for highlighting
      const sortedScn = [...v.scenarioStats].sort((a, b) => b.avgWinRate - a.avgWinRate);
      const bestScn = sortedScn[0];
      const worstScn = sortedScn[sortedScn.length - 1];
      const swing = bestScn && worstScn ? (bestScn.avgWinRate - worstScn.avgWinRate) : 0;

      for (const ss of v.scenarioStats) {
        const rate = ss.avgWinRate;
        const bg = heatBg(rate);
        const fg = heatColor(rate);
        const isBest = swing > 0.10 && ss === bestScn;
        const isWorst = swing > 0.10 && ss === worstScn;
        const indicator = isBest ? ' ★' : (isWorst ? ' ⚠' : '');
        html += `
          <td style="text-align:center;padding:0.4rem 0.3rem;background:${bg};font-family:var(--font-mono);color:${fg};font-weight:700;">
            ${(rate * 100).toFixed(0)}%${indicator}
            <div style="font-size:0.65em;color:var(--parchment-dim);font-weight:normal;margin-top:0.1em;">k:${ss.avgModelKills.toFixed(1)} · OoA:${(ss.avgModelOoARate*100).toFixed(0)}%</div>
          </td>
        `;
      }
      html += `</tr>`;
    }
    html += `</tbody></table></div>`;

    // Identify variant + scenario pairs with biggest swing
    const swings = result.variants.map(v => {
      const sorted = [...v.scenarioStats].sort((a, b) => b.avgWinRate - a.avgWinRate);
      return {
        label: v.label,
        best: sorted[0],
        worst: sorted[sorted.length - 1],
        swing: sorted[0].avgWinRate - sorted[sorted.length - 1].avgWinRate,
      };
    });
    swings.sort((a, b) => b.swing - a.swing);
    if (swings[0] && swings[0].swing > 0.15) {
      const top = swings[0];
      html += `
        <div style="margin-top:0.6rem;padding:0.5rem 0.7rem;background:rgba(212,160,23,0.06);border-left:3px solid #d4a017;font-size:0.85em;">
          <strong style="color:#d4a017;">⚠ Variante sensible al escenario:</strong>
          <strong>${escapeHtml(top.label)}</strong> brilla en <strong>${escapeHtml(top.best.scenarioLabel)}</strong>
          (${(top.best.avgWinRate*100).toFixed(0)}% win) pero falla en <strong>${escapeHtml(top.worst.scenarioLabel)}</strong>
          (${(top.worst.avgWinRate*100).toFixed(0)}% win). Diferencia de ${(top.swing*100).toFixed(0)}pp — considera adaptarla al escenario antes de la partida.
        </div>
      `;
    }

    html += `</div>`;
  }

  // Top threats per faction (computed from the BEST variant — most informative)
  const bestVariant = byEfficiency;
  if (bestVariant && bestVariant.matchups.some(m => m.topThreats && m.topThreats.length > 0)) {
    html += `
      <div style="margin-top:1.2rem;">
        <h4 style="font-size:0.95rem;color:var(--gold);margin-bottom:0.4rem;">🎯 Top 3 amenazas por facción <span style="font-size:0.78em;color:var(--parchment-dim);font-weight:normal;">(con la variante más eficiente: ${escapeHtml(bestVariant.label)})</span></h4>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.6rem;">
    `;
    for (const matchup of bestVariant.matchups) {
      if (!matchup.topThreats || matchup.topThreats.length === 0) continue;
      html += `
        <div style="padding:0.5rem 0.7rem;background:rgba(176,141,87,0.04);border-left:3px solid var(--rust);">
          <div style="font-size:0.85em;font-weight:600;color:var(--parchment);margin-bottom:0.3em;">vs ${escapeHtml(matchup.factionLabel)}</div>
          <ul style="margin:0;padding-left:1.2em;font-size:0.78em;line-height:1.5;">
      `;
      for (const t of matchup.topThreats) {
        html += `<li><strong>${escapeHtml(t.name)}</strong> <span style="color:var(--parchment-dim);font-family:var(--font-mono);">${t.kills.toFixed(1)} kills/batalla · ${t.cost}👑</span></li>`;
      }
      html += `</ul></div>`;
    }
    html += `</div></div>`;
  }

  out.innerHTML = html;
  // Scroll into view
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Wire up: model selector change → reset variants and re-render
document.getElementById('lab-loadout-model')?.addEventListener('change', (e) => {
  LAB_LOADOUT_STATE.modelUid = e.target.value || null;
  // Reset variants when changing model (different unit = different armoury context)
  LAB_LOADOUT_STATE.variants = LAB_LOADOUT_STATE.modelUid
    ? [{ label: 'Variante 1', items: [] }]
    : [];
  _renderLoadoutVariants();
});

// Add-variant button
document.getElementById('btn-loadout-add-variant')?.addEventListener('click', () => {
  if (LAB_LOADOUT_STATE.variants.length >= 4) return;
  const n = LAB_LOADOUT_STATE.variants.length + 1;
  LAB_LOADOUT_STATE.variants.push({ label: `Variante ${n}`, items: [] });
  _renderLoadoutVariants();
});

// ─────────────────────────────────────────────────────────────────────

/* Lab 2.0 Sprint 13 — Rival JSON loader (paste Companion-format). */
let LAB2_RIVAL_JSON = null;  // { models: [...] } o null
document.getElementById('lab-spatial-rival')?.addEventListener('change', (e) => {
  const row = document.getElementById('lab-spatial-rival-json-row');
  if (row) row.style.display = (e.target.value === 'json') ? 'block' : 'none';
});
document.getElementById('btn-lab-spatial-rival-load')?.addEventListener('click', () => {
  const ta = document.getElementById('lab-spatial-rival-json');
  const status = document.getElementById('lab-spatial-rival-status');
  const txt = (ta && ta.value) || '';
  const r = _lab2ParseRivalJson(txt);
  if (!r.ok) {
    LAB2_RIVAL_JSON = null;
    if (status) { status.textContent = '✗ ' + r.error; status.style.color = '#c92424'; }
    return;
  }
  LAB2_RIVAL_JSON = { models: r.models };
  if (status) {
    status.textContent = '✓ ' + r.models.length + ' modelos cargados.';
    status.style.color = '#7fb069';
  }
});

/* Lab 2.0 Sprint 22 — Stats graph cache. */
let LAB2_LAST_STATS = null;

/* Lab 2.0 Sprint 12 — Replay UI state + handlers (modal + play/pause/step). */
let LAB2_LAST_REPLAY = null;
let LAB2_REPLAY_FRAME = 0;
let LAB2_REPLAY_TIMER = null;
const LAB2_REPLAY_TICK_MS = 700;

function _lab2RenderReplayCurrent() {
  if (!LAB2_LAST_REPLAY) return;
  const cnv = document.getElementById('lab2-replay-canvas');
  if (!cnv || !cnv.getContext) return;
  const ctx = cnv.getContext('2d');
  // Clear.
  ctx.fillStyle = '#1a1410';
  ctx.fillRect(0, 0, cnv.width, cnv.height);
  // cellPx para que 48×32 quepa en el canvas: 780/48 = 16.25, 520/32 = 16.25.
  const cellPx = Math.min(Math.floor((cnv.width - 20) / LAB2_LAST_REPLAY.map.width),
                          Math.floor((cnv.height - 20) / LAB2_LAST_REPLAY.map.height));
  const x0 = Math.floor((cnv.width - LAB2_LAST_REPLAY.map.width * cellPx) / 2);
  const y0 = Math.floor((cnv.height - LAB2_LAST_REPLAY.map.height * cellPx) / 2);
  renderReplayFrame(ctx, LAB2_LAST_REPLAY, LAB2_REPLAY_FRAME, { cellPx, x0, y0 });
  // Update UI counters.
  const idxEl = document.getElementById('lab2-replay-frame-idx');
  const totEl = document.getElementById('lab2-replay-frame-total');
  const slider = document.getElementById('lab2-replay-slider');
  if (idxEl) idxEl.textContent = String(LAB2_REPLAY_FRAME);
  if (totEl) totEl.textContent = String(LAB2_LAST_REPLAY.frames.length - 1);
  if (slider) slider.value = String(LAB2_REPLAY_FRAME);
}

function _lab2ReplaySetFrame(idx) {
  if (!LAB2_LAST_REPLAY) return;
  const max = LAB2_LAST_REPLAY.frames.length - 1;
  LAB2_REPLAY_FRAME = Math.max(0, Math.min(max, idx | 0));
  _lab2RenderReplayCurrent();
}

function _lab2ReplayPlayToggle() {
  const btn = document.getElementById('btn-lab2-replay-play');
  if (LAB2_REPLAY_TIMER) {
    clearInterval(LAB2_REPLAY_TIMER);
    LAB2_REPLAY_TIMER = null;
    if (btn) btn.textContent = '▶';
    return;
  }
  if (!LAB2_LAST_REPLAY) return;
  if (btn) btn.textContent = '⏸';
  LAB2_REPLAY_TIMER = setInterval(() => {
    if (!LAB2_LAST_REPLAY) { clearInterval(LAB2_REPLAY_TIMER); LAB2_REPLAY_TIMER = null; return; }
    const max = LAB2_LAST_REPLAY.frames.length - 1;
    if (LAB2_REPLAY_FRAME >= max) {
      clearInterval(LAB2_REPLAY_TIMER); LAB2_REPLAY_TIMER = null;
      if (btn) btn.textContent = '▶';
      return;
    }
    _lab2ReplaySetFrame(LAB2_REPLAY_FRAME + 1);
  }, LAB2_REPLAY_TICK_MS);
}

document.getElementById('btn-lab-spatial-replay')?.addEventListener('click', () => {
  if (!LAB2_LAST_REPLAY) { alert('Aún no hay replay — ejecuta una simulación primero.'); return; }
  LAB2_REPLAY_FRAME = 0;
  const slider = document.getElementById('lab2-replay-slider');
  if (slider) slider.max = String(LAB2_LAST_REPLAY.frames.length - 1);
  const resultEl = document.getElementById('lab2-replay-result');
  if (resultEl) {
    const r = LAB2_LAST_REPLAY.result;
    resultEl.textContent = 'Winner: ' + r.winner + ' · turns: ' + r.turns
      + ' · KO friendly: ' + r.friendlyKO + ' · KO enemy: ' + r.enemyKO;
  }
  openModal('modal-lab2-replay');
  _lab2RenderReplayCurrent();
  // Sprint 22: pinta también el stats graph (avg attrition) si hay cache.
  if (LAB2_LAST_STATS) {
    const sc = document.getElementById('lab2-stats-canvas');
    if (sc && sc.getContext) {
      renderStatsGraph(sc.getContext('2d'), LAB2_LAST_STATS,
                       { width: sc.width, height: sc.height });
    }
  }
});

document.getElementById('btn-lab2-replay-first')?.addEventListener('click', () => _lab2ReplaySetFrame(0));
document.getElementById('btn-lab2-replay-prev')?.addEventListener('click', () => _lab2ReplaySetFrame(LAB2_REPLAY_FRAME - 1));
document.getElementById('btn-lab2-replay-next')?.addEventListener('click', () => _lab2ReplaySetFrame(LAB2_REPLAY_FRAME + 1));
document.getElementById('btn-lab2-replay-last')?.addEventListener('click', () => {
  if (!LAB2_LAST_REPLAY) return;
  _lab2ReplaySetFrame(LAB2_LAST_REPLAY.frames.length - 1);
});
document.getElementById('btn-lab2-replay-play')?.addEventListener('click', () => _lab2ReplayPlayToggle());
document.getElementById('lab2-replay-slider')?.addEventListener('input', (e) => {
  _lab2ReplaySetFrame(parseInt(e.target.value, 10) || 0);
});

/* Sprint 32: export PNG del frame actual + JSON del replay completo. */
document.getElementById('btn-lab2-replay-export-png')?.addEventListener('click', () => {
  const cnv = document.getElementById('lab2-replay-canvas');
  if (!cnv || !LAB2_LAST_REPLAY) { alert('No hay replay.'); return; }
  try {
    const dataURL = cnv.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataURL;
    a.download = 'lab2-frame-' + LAB2_REPLAY_FRAME + '.png';
    a.click();
  } catch (e) {
    alert('Error exportando PNG: ' + e.message);
  }
});

document.getElementById('btn-lab2-replay-export-json')?.addEventListener('click', () => {
  if (!LAB2_LAST_REPLAY) { alert('No hay replay.'); return; }
  try {
    // Excluye .map (referencia circular) — solo el data del replay.
    const replayJson = {
      mapId: LAB2_LAST_REPLAY.mapId,
      initial: LAB2_LAST_REPLAY.initial,
      frames: LAB2_LAST_REPLAY.frames,
      result: LAB2_LAST_REPLAY.result,
    };
    const blob = new Blob([JSON.stringify(replayJson, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lab2-replay.json';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Error exportando JSON: ' + e.message);
  }
});

/* Lab 2.0 Sprint 8 — Wire del botón "Simular en mapa" del panel Espacial. */
document.getElementById('btn-lab-spatial-run')?.addEventListener('click', () => {
  const wb = STATE.currentWarband;
  const statusEl = document.getElementById('lab-spatial-status');
  const resultsEl = document.getElementById('lab-spatial-results');
  if (!wb || !wb.models || wb.models.length === 0) {
    if (statusEl) { statusEl.textContent = '✗ Carga una banda primero (modo Banda).'; statusEl.style.color = '#c92424'; }
    return;
  }
  const mapId = (document.getElementById('lab-spatial-map') || {}).value || 'open-ground';
  const nB = parseInt((document.getElementById('lab-spatial-nbattles') || {}).value, 10) || 50;
  const maxT = parseInt((document.getElementById('lab-spatial-max-turns') || {}).value, 10) || 20;
  const useCanon = !!(document.getElementById('lab-spatial-canon') || {}).checked;
  if (statusEl) { statusEl.textContent = '⏳ Simulando ' + nB + ' batallas...'; statusEl.style.color = ''; }
  // setTimeout para que el DOM repinte el "⏳ Simulando" antes de bloquear.
  setTimeout(() => {
    try {
      // Sprint 9 + 13: rival configurable (mirror / arquetipos / JSON).
      const rivalKey = (document.getElementById('lab-spatial-rival') || {}).value || 'mirror';
      // Sprint 31: loadout friendly (canon o variante experimental).
      const loadoutKey = (document.getElementById('lab-spatial-loadout') || {}).value || 'canon';
      const friendlyModels = _lab2BandFromVariant(wb, loadoutKey);
      let enemyModels;
      if (rivalKey === 'mirror') {
        enemyModels = wb.models.map(m => JSON.parse(JSON.stringify(m)));
      } else if (rivalKey === 'json') {
        if (!LAB2_RIVAL_JSON || !LAB2_RIVAL_JSON.models.length) {
          if (statusEl) { statusEl.textContent = '✗ Carga primero un JSON rival.'; statusEl.style.color = '#c92424'; }
          return;
        }
        enemyModels = LAB2_RIVAL_JSON.models.map(m => JSON.parse(JSON.stringify(m)));
      } else {
        enemyModels = _lab2SyntheticEnemyBand(rivalKey, wb.models.length);
      }
      const scenarioId = (document.getElementById('lab-spatial-scenario') || {}).value || 'pitched-battle';
      const r = runBattleSeriesSpatial({
        friendlyModels, enemyModels, mapId,
        nBattles: nB, maxTurns: maxT, rangeInches: 24,
        useCanonEngine: useCanon, factionId: wb.factionId,
        scenarioId,
      });
      // Sprint 22: cachea stats para que el modal de replay las pinte.
      LAB2_LAST_STATS = r.avgAlivePerTurn;
      const pct = (v) => (v * 100).toFixed(1) + '%';
      const lines = [
        '──── Resultado simulación espacial ────',
        'Mapa:        ' + mapId,
        'Batallas:    ' + r.nBattles,
        'Motor daño:  ' + (useCanon ? 'Canon engine (TC)' : 'V1 abstracto'),
        'Modelos:     ' + r.friendlyCount + ' vs ' + r.enemyCount + ' (mirror)',
        '',
        'Win rate friendly: ' + pct(r.winRateFriendly),
        'Win rate enemy:    ' + pct(r.winRateEnemy),
        'Draw rate:         ' + pct(r.drawRate),
        '',
        'Avg turnos:        ' + r.avgTurns.toFixed(1),
        'Avg KO friendly:   ' + r.avgFriendlyKO.toFixed(2),
        'Avg KO enemy:      ' + r.avgEnemyKO.toFixed(2),
      ];
      if (resultsEl) resultsEl.textContent = lines.join('\n');
      if (statusEl) { statusEl.textContent = '✓ Listo.'; statusEl.style.color = '#7fb069'; }
      // Sprint 12: cachea UN replay extra (la última batalla) para visualizar.
      try {
        const fClones = friendlyModels.map(m => JSON.parse(JSON.stringify(m)));
        const eClones = enemyModels.map(m => JSON.parse(JSON.stringify(m)));
        const stateForReplay = createLab2Battle(mapId, fClones, eClones);
        deployBandHeuristic(stateForReplay, 'friendly');
        deployBandHeuristic(stateForReplay, 'enemy');
        LAB2_LAST_REPLAY = buildBattleReplay(stateForReplay, {
          maxTurns: maxT, rangeInches: 24,
          useCanonEngine: useCanon, factionId: wb.factionId,
          scenarioId,
        });
        const replayBtn = document.getElementById('btn-lab-spatial-replay');
        if (replayBtn) replayBtn.disabled = false;
      } catch (eRep) {
        // Replay opcional — un fallo aquí no rompe el flujo principal.
        console.warn('[lab2] replay capture falló:', eRep && eRep.message);
      }
    } catch (e) {
      if (statusEl) { statusEl.textContent = '✗ Error: ' + e.message; statusEl.style.color = '#c92424'; }
      if (resultsEl) resultsEl.textContent = '';
    }
  }, 30);
});

document.getElementById('btn-lab-run')?.addEventListener('click', () => {
  const wb = STATE.currentWarband;
  if (!wb || !wb.models || wb.models.length === 0) {
    alert('Carga una banda primero (modo Banda).');
    return;
  }

  const mode = document.getElementById('lab-mode')?.value || 'analyze';
  const nBattles = parseInt(document.getElementById('lab-n-battles').value, 10) || 100;
  const terrain = document.getElementById('lab-terrain')?.value || 'mixed';
  const status = document.getElementById('lab-status');

  // Estimate run size: nBattles × number of enemies (approximation).
  // 5000 × 6 enemies = 30000 batallas → ~30-60s on average hardware.
  // Show clearer feedback when load is heavy so user knows it's still running.
  const selectedEnemyCount = mode === 'duel' ? 1
    : [...document.querySelectorAll('#lab-enemy-checkboxes input[type=checkbox]:checked')].length;
  const totalBattles = nBattles * Math.max(1, selectedEnemyCount);
  const isHeavyRun = totalBattles >= 10000;
  const isHugeRun  = totalBattles >= 25000;

  if (isHugeRun) {
    const warn = `Vas a simular ${totalBattles.toLocaleString('es-ES')} batallas en total. Esto puede tardar 30-60 segundos. ¿Continuar?`;
    if (!confirm(warn)) {
      if (status) status.textContent = 'Cancelado';
      return;
    }
  }

  if (status) {
    status.textContent = isHeavyRun
      ? `⏳ Simulando ${totalBattles.toLocaleString('es-ES')}… puede tardar`
      : '⏳ Simulando…';
  }

  const userCost = wb.budgetTotal || (wb.models.reduce((s, m) => s + (m.companionCost || 0), 0));

  if (mode === 'duel') {
    // Duel: one-on-one against a rival warband loaded from JSON
    if (!LAB_DUEL_RIVAL) {
      alert('Carga primero una banda rival con JSON de Companion.');
      if (status) status.textContent = '';
      return;
    }
    const rival = LAB_DUEL_RIVAL;
    setTimeout(() => {
      const stats = runDuel_lab(wb, rival, { nBattles, terrain });
      const rivalCost = rival.models.reduce((s, m) => s + (m.companionCost || 0), 0);
      const result = {
        enemyId: 'duel',
        enemyLabel: rival.name || 'Banda rival',
        enemyModelCount: rival.models.length,
        enemyCost: rivalCost,
        ...stats,
      };
      renderLabResults([result], userCost, nBattles, terrain, { mode: 'duel', rival });
      _saveLabRunToHistory('duel', [result], userCost, nBattles, terrain, { rivalName: rival.name });
      if (status) status.textContent = '✓ Hecho';
    }, 30);
    return;
  }

  if (mode === 'compare') {
    // Compare: A vs B (and optionally C), all vs the same canonical enemy set
    if (!LAB_COMPARE_B) {
      alert('Carga primero una banda B con JSON de Companion.');
      if (status) status.textContent = '';
      return;
    }
    const wbB = LAB_COMPARE_B;
    const wbC = LAB_COMPARE_C;  // optional
    const bands = wbC ? [wb, wbB, wbC] : [wb, wbB];
    const selectedEnemiesC = [...document.querySelectorAll('#lab-enemy-checkboxes input[type=checkbox]:checked')]
      .map(c => c.dataset.enemy);
    if (selectedEnemiesC.length === 0) {
      alert('Selecciona al menos un enemigo.');
      if (status) status.textContent = '';
      return;
    }
    const costModeC = document.getElementById('lab-enemy-cost').value;
    const customCostC = parseInt(document.getElementById('lab-enemy-cost-custom').value, 10) || 700;
    let enemyCostC = userCost;
    if (costModeC === 'custom') enemyCostC = Math.max(100, customCostC);
    else if (costModeC === '110') enemyCostC = Math.round(userCost * 1.10);
    else if (costModeC === '120') enemyCostC = Math.round(userCost * 1.20);
    setTimeout(() => {
      const cmpResult = runCompareN_lab(bands, selectedEnemiesC, {
        nBattles, terrain, enemyCost: enemyCostC,
      });
      // Use band A's results as the "primary" results (for breakdown
      // and tactical analysis), but pass full compareData with all bands.
      renderLabResults(cmpResult.results[0], userCost, nBattles, terrain, {
        mode: 'compare',
        bandB: wbB,
        bandC: wbC,
        bands,
        compareData: cmpResult,
      });
      _saveLabRunToHistory('compare', cmpResult.results[0], userCost, nBattles, terrain, {
        bandBName: wbB.name,
        bandCName: wbC?.name,
      });
      if (status) status.textContent = '✓ Hecho';
    }, 30);
    return;
  }

  // Analyze mode (default): vs canonical enemy factions
  const selectedEnemies = [...document.querySelectorAll('#lab-enemy-checkboxes input[type=checkbox]:checked')]
    .map(c => c.dataset.enemy);
  if (selectedEnemies.length === 0) {
    alert('Selecciona al menos un enemigo.');
    if (status) status.textContent = '';
    return;
  }

  const costMode = document.getElementById('lab-enemy-cost').value;
  const customCost = parseInt(document.getElementById('lab-enemy-cost-custom').value, 10) || 700;
  let enemyCost = userCost;
  if (costMode === 'custom') enemyCost = Math.max(100, customCost);
  else if (costMode === '110') enemyCost = Math.round(userCost * 1.10);
  else if (costMode === '120') enemyCost = Math.round(userCost * 1.20);

  // Run async-ish so the UI can repaint
  setTimeout(() => {
    const userBattleBand = buildBattleBandFromWarband(wb);
    const userFactory = makeBandFactory_lab(userBattleBand);
    const allResults = [];
    for (const enemyId of selectedEnemies) {
      const enemyBand = scaleEnemyBand(enemyId, enemyCost);
      const enemyFactory = makeBandFactory_lab(enemyBand);
      const stats = runBattleSeries_lab(userFactory, enemyFactory, nBattles, { terrain });
      const opt = LAB_ENEMY_OPTIONS.find(o => o.id === enemyId);
      allResults.push({
        enemyId, enemyLabel: opt ? opt.label : enemyId,
        enemyModelCount: enemyBand.length, enemyCost,
        ...stats,
      });
    }
    renderLabResults(allResults, userCost, nBattles, terrain, { mode: 'analyze' });
    _saveLabRunToHistory('analyze', allResults, userCost, nBattles, terrain, {});
    if (status) status.textContent = '✓ Hecho';
  }, 30);
});

/**
 * Helper: saves a completed Lab run to history with a compact summary.
 * Called by every mode (analyze/duel/compare) right before rendering.
 *
 * For analyze/compare: matchups are the win-rates of band A vs each enemy.
 * For duel: a single matchup labeled with the rival band's name.
 */
function _saveLabRunToHistory(mode, results, userCost, nBattles, terrain, opts) {
  try {
    const wb = STATE.currentWarband;
    if (!wb) return;
    const matchups = (results || []).map(r => ({
      enemyLabel: r.enemyLabel,
      winRate: r.winRateA,
    }));
    const avgWinRate = matchups.length
      ? matchups.reduce((s, m) => s + m.winRate, 0) / matchups.length
      : 0;
    saveSimToHistory({
      mode,
      bandName: wb.name || '—',
      bandCost: userCost,
      bandModelCount: wb.models?.length || 0,
      terrain,
      nBattles,
      summary: { avgWinRate, matchups },
    });
  } catch (e) {
    console.warn('History save failed:', e);
  }
}

function renderLabResults(results, userCost, nBattles, terrain, opts) {
  opts = opts || {};
  const isDuel = opts.mode === 'duel';
  const isCompare = opts.mode === 'compare';
  const rival = opts.rival || null;
  const bandB = opts.bandB || null;
  const compareData = opts.compareData || null;
  const out = document.getElementById('lab-results');
  if (!out) return;
  if (!results.length) { out.innerHTML = ''; return; }

  // Build sorted by win rate (best vs worst matchups)
  const sorted = [...results].sort((a, b) => b.winRateA - a.winRateA);
  const avgWin = results.reduce((s, r) => s + r.winRateA, 0) / results.length;
  const terrainLabels = { open: 'Campo abierto', mixed: 'Mixto', urban: 'Urbano denso' };

  // Aggregate per-model stats across all enemy matchups (averaged)
  let aggregateRoster = null;
  if (results[0]?.perModelA) {
    aggregateRoster = results[0].perModelA.map((m, i) => ({
      name: m.name,
      kills: 0, dmgDealt: 0, dmgReceived: 0, turnsSurvived: 0, outRate: 0,
    }));
    for (const r of results) {
      for (let i = 0; i < r.perModelA.length; i++) {
        const m = r.perModelA[i];
        aggregateRoster[i].kills          += m.avgKills;
        aggregateRoster[i].dmgDealt       += m.avgDmgDealt;
        aggregateRoster[i].dmgReceived    += m.avgDmgReceived;
        aggregateRoster[i].turnsSurvived  += m.avgTurnsSurvived;
        aggregateRoster[i].outRate        += m.outRate;
      }
    }
    aggregateRoster.forEach(a => {
      a.kills          /= results.length;
      a.dmgDealt       /= results.length;
      a.dmgReceived    /= results.length;
      a.turnsSurvived  /= results.length;
      a.outRate        /= results.length;
    });
  }

  let html = `
    <div style="margin-bottom:1rem;padding:1rem;background:rgba(176,141,87,0.08);border:1px solid var(--gold);">
      <div style="font-size:1.1rem;color:var(--gold);font-weight:600;margin-bottom:0.3rem;">
        ${isDuel    ? '⚔ Duelo: '    : ''}${isCompare ? '🔬 Comparar — Banda A vs Banda B' : ''}${!isDuel && !isCompare ? 'Win Rate Promedio: ' : ''}${!isCompare ? (avgWin * 100).toFixed(1) + '%' : ''}${isDuel ? ' (tu banda)' : ''}
      </div>
      <div style="font-size:0.85em;color:var(--parchment-dim);">
        ${isCompare
          ? `${nBattles} batallas · banda A "${STATE.currentWarband?.name || '—'}" (${userCost} 👑) vs banda B "${bandB?.name || '—'}" (${bandB ? bandB.models.reduce((s,m)=>s+(m.companionCost||0),0) : '—'} 👑) · ${results.length} enemigos`
          : isDuel
            ? `${nBattles} batallas · tu banda ${userCost} 👑 vs ${results[0].enemyLabel} ${results[0].enemyCost} 👑`
            : `${nBattles} batallas vs ${results.length} enemigos · banda usuario ${userCost} 👑`}
        · terreno: <strong style="color:var(--parchment);">${terrainLabels[terrain] || terrain || 'Mixto'}</strong>
      </div>
    </div>
  `;

  if (isCompare && compareData) {
    // Compare table: side-by-side win rates with diff and "better band" badge.
    // Supports 2 or 3 bands. compareData has either:
    //   - legacy 2-band shape: { resultsA, resultsB, comparison: [{winA, winB, diff, betterBand}] }
    //   - new N-band shape: { results: [...], comparison: [{winRates: [...], bestIdx, allTied}] }
    // We detect by checking for `results` array (N-band) vs `resultsA` (legacy).
    const isN = Array.isArray(compareData.results);
    const bandLabels = isN
      ? (opts.bands || []).map((b, i) => ['A','B','C','D','E'][i] || ('Banda' + (i + 1)))
      : ['A', 'B'];
    const bandNames = isN
      ? (opts.bands || []).map(b => b?.name || '—')
      : [STATE.currentWarband?.name || 'A', opts.bandB?.name || 'B'];
    const N = bandLabels.length;

    html += `
      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:1.5rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--gold);">
            <th style="text-align:left;padding:0.5rem;">Enemigo</th>
    `;
    for (const lbl of bandLabels) {
      html += `<th style="text-align:right;padding:0.5rem;" title="${bandNames[bandLabels.indexOf(lbl)]}">${lbl} · Win %</th>`;
    }
    html += `
            <th style="text-align:center;padding:0.5rem;">Mejor</th>
          </tr>
        </thead>
        <tbody>
    `;

    // Iterate comparisons (works for both shapes)
    for (const c of compareData.comparison) {
      const rates = isN ? c.winRates : [c.winA, c.winB];
      // Determine best in this row (per-row, not global)
      let bestIdx = 0;
      for (let i = 1; i < rates.length; i++) {
        if (rates[i] > rates[bestIdx]) bestIdx = i;
      }
      const minRate = Math.min(...rates);
      const tied = (rates[bestIdx] - minRate) < 0.05;

      html += `<tr style="border-bottom:1px solid rgba(127,107,67,0.2);">
        <td style="padding:0.5rem;">${c.enemyLabel}</td>`;
      for (let i = 0; i < rates.length; i++) {
        const w = rates[i];
        const isBest = !tied && i === bestIdx;
        const color = w >= 0.6 ? '#7fb069' : w >= 0.4 ? '#d4a017' : '#c92424';
        const weight = isBest ? '700' : '600';
        const bg = isBest ? 'background:rgba(127,176,105,0.10);' : '';
        html += `<td style="padding:0.5rem;text-align:right;color:${color};font-weight:${weight};${bg}">${(w * 100).toFixed(0)}%</td>`;
      }
      const badge = tied
        ? '<span style="color:var(--parchment-dim);">≈</span>'
        : `<span style="color:#7fb069;font-weight:700;">${bandLabels[bestIdx]}</span>`;
      html += `<td style="padding:0.5rem;text-align:center;font-size:1.1rem;">${badge}</td>
      </tr>`;
    }

    // Footer summary: count wins per band
    const winCounts = new Array(N).fill(0);
    let tieCount = 0;
    for (const c of compareData.comparison) {
      const rates = isN ? c.winRates : [c.winA, c.winB];
      let best = 0;
      for (let i = 1; i < rates.length; i++) {
        if (rates[i] > rates[best]) best = i;
      }
      const minR = Math.min(...rates);
      if ((rates[best] - minR) < 0.05) tieCount++;
      else winCounts[best]++;
    }
    let overallBest = 0;
    for (let i = 1; i < N; i++) {
      if (winCounts[i] > winCounts[overallBest]) overallBest = i;
    }
    const overallTied = winCounts.filter(c => c === winCounts[overallBest]).length > 1;
    const summaryParts = winCounts.map((cnt, i) =>
      `${bandLabels[i]} gana en ${cnt}`
    );
    html += `
        </tbody>
        <tfoot>
          <tr style="border-top:2px solid var(--gold);background:rgba(176,141,87,0.05);">
            <td colspan="${N + 1}" style="padding:0.5rem;font-weight:600;color:var(--gold);">Total: ${summaryParts.join(', ')}, ${tieCount} empates (≤5pp)</td>
            <td style="padding:0.5rem;text-align:center;">${overallTied ? '≈' : bandLabels[overallBest]}</td>
          </tr>
        </tfoot>
      </table>
    `;
  } else {
    // Standard matchup table (analyze + duel)
    html += `
      <table style="width:100%;border-collapse:collapse;font-size:0.9rem;margin-bottom:1.5rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--gold);">
            <th style="text-align:left;padding:0.5rem;">${isDuel ? 'Banda rival' : 'Enemigo'}</th>
            <th style="text-align:right;padding:0.5rem;">Win %</th>
            <th style="text-align:right;padding:0.5rem;">Bajas (yo / él)</th>
            <th style="text-align:right;padding:0.5rem;">Tamaño ${isDuel ? 'rival' : 'enemigo'}</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (const r of sorted) {
      const winColor = r.winRateA >= 0.6 ? '#7fb069' : r.winRateA >= 0.4 ? '#d4a017' : '#c92424';
      // CI 95% for binomial proportion: 1.96 × sqrt(p(1-p)/n).
      // With nBattles=5000 and p=0.5, CI ≈ ±1.4pp.
      // With nBattles=100 and p=0.5, CI ≈ ±9.8pp.
      const n = r.nBattles || 100;
      const p = r.winRateA;
      const ciHalf = 1.96 * Math.sqrt(Math.max(0.0001, p * (1 - p) / n));
      const ciStr = `±${(ciHalf * 100).toFixed(1)}pp`;
      // Stdev for casualties (only present if backend tracked it)
      const stdevA = (typeof r.stdevCasualtiesA === 'number') ? r.stdevCasualtiesA : null;
      const stdevB = (typeof r.stdevCasualtiesB === 'number') ? r.stdevCasualtiesB : null;
      const casStr = stdevA !== null
        ? `${r.avgCasualtiesA.toFixed(1)} ±${stdevA.toFixed(1)} / ${r.avgCasualtiesB.toFixed(1)} ±${stdevB.toFixed(1)}`
        : `${r.avgCasualtiesA.toFixed(1)} / ${r.avgCasualtiesB.toFixed(1)}`;
      html += `
        <tr style="border-bottom:1px solid rgba(127,107,67,0.2);">
          <td style="padding:0.5rem;">${r.enemyLabel}</td>
          <td style="padding:0.5rem;text-align:right;color:${winColor};font-weight:600;" title="Intervalo de confianza 95%">${(r.winRateA * 100).toFixed(0)}%<span style="font-weight:400;color:var(--parchment-dim);font-family:var(--font-mono);font-size:0.78em;margin-left:0.3em;">${ciStr}</span></td>
          <td style="padding:0.5rem;text-align:right;font-family:var(--font-mono);font-size:0.85em;" title="Promedio ±stdev">${casStr}</td>
          <td style="padding:0.5rem;text-align:right;font-family:var(--font-mono);font-size:0.85em;">${r.enemyModelCount} mod (${r.enemyCost} 👑)</td>
        </tr>
      `;
    }
    html += '</tbody></table>';
  }


  // Per-model breakdown (aggregated across all enemy matchups)
  if (aggregateRoster) {
    html += `
      <h3 style="font-size:1rem;margin-bottom:0.5rem;">📊 Rendimiento por modelo (promedio vs todos los enemigos)</h3>
      <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.5rem;">
        Kills = enemigos puestos OoA. DañoH = puntos de daño hechos. DañoR = recibidos.
        Cada BLOOD MARKER = 1 punto, DOWN = 2, OUT = 3. Caída% = % de batallas en que cayó OoA.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--gold);">
            <th style="text-align:left;padding:0.4rem;">Modelo</th>
            <th style="text-align:right;padding:0.4rem;" title="Kills (enemigos OoA)">Kills</th>
            <th style="text-align:right;padding:0.4rem;" title="Daño hecho (BLOOD/DOWN/OUT)">DañoH</th>
            <th style="text-align:right;padding:0.4rem;" title="Daño recibido">DañoR</th>
            <th style="text-align:right;padding:0.4rem;" title="Rondas vivo en promedio">Rondas</th>
            <th style="text-align:right;padding:0.4rem;" title="% batallas en que cayó">Caída%</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (const m of aggregateRoster) {
      const fallColor = m.outRate >= 0.7 ? '#c92424' : m.outRate >= 0.4 ? '#d4a017' : '#7fb069';
      html += `
        <tr style="border-bottom:1px solid rgba(127,107,67,0.2);">
          <td style="padding:0.4rem;">${m.name}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);">${m.kills.toFixed(2)}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);">${m.dmgDealt.toFixed(1)}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);">${m.dmgReceived.toFixed(1)}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);">${m.turnsSurvived.toFixed(1)}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);color:${fallColor};font-weight:600;">${(m.outRate * 100).toFixed(0)}%</td>
        </tr>
      `;
    }
    html += '</tbody></table>';
  }

  // In duel mode, also render the rival's per-model breakdown so the user
  // can see which of the rival's units are doing the most damage and which
  // are dropping fastest. This is the duel-specific value-add.
  if (isDuel && results[0]?.perModelB) {
    const rivalRoster = results[0].perModelB;
    html += `
      <h3 style="font-size:1rem;margin-bottom:0.5rem;margin-top:1.5rem;">⚔ Rendimiento de la banda rival</h3>
      <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.5rem;">
        Cómo se desempeñan los modelos rivales en este matchup. Útil para identificar qué unidades suyas son más amenazantes y cuáles caen rápido.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
        <thead>
          <tr style="border-bottom:2px solid var(--gold);">
            <th style="text-align:left;padding:0.4rem;">Modelo rival</th>
            <th style="text-align:right;padding:0.4rem;" title="Kills (modelos tuyos OoA)">Kills</th>
            <th style="text-align:right;padding:0.4rem;" title="Daño hecho">DañoH</th>
            <th style="text-align:right;padding:0.4rem;" title="Daño recibido">DañoR</th>
            <th style="text-align:right;padding:0.4rem;" title="Rondas vivo">Rondas</th>
            <th style="text-align:right;padding:0.4rem;" title="% batallas en que cayó">Caída%</th>
          </tr>
        </thead>
        <tbody>
    `;
    for (const m of rivalRoster) {
      // For rival, "low caída%" means dangerous (they don't die), so flip
      // the color: high outRate = green (good for us, they fall), low = red.
      const fallColor = m.outRate >= 0.7 ? '#7fb069' : m.outRate >= 0.4 ? '#d4a017' : '#c92424';
      html += `
        <tr style="border-bottom:1px solid rgba(127,107,67,0.2);">
          <td style="padding:0.4rem;">${m.name}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);">${m.avgKills.toFixed(2)}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);">${m.avgDmgDealt.toFixed(1)}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);">${m.avgDmgReceived.toFixed(1)}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);">${m.avgTurnsSurvived.toFixed(1)}</td>
          <td style="padding:0.4rem;text-align:right;font-family:var(--font-mono);color:${fallColor};font-weight:600;">${(m.outRate * 100).toFixed(0)}%</td>
        </tr>
      `;
    }
    html += '</tbody></table>';
  }

  // Structural diagnosis (Coverage Matrix) — visual snapshot of the band's
  // tactical "personality" across 6 dimensions. Renders as horizontal bars
  // with score 0-100 and color-coded label.
  const wbCov = STATE.currentWarband;
  if (wbCov) {
    let cov = null;
    try { cov = computeCoverageMatrix(wbCov); }
    catch (e) { console.warn('Coverage matrix failed:', e); }
    if (cov) {
      const dims = [
        { key: 'antiArmour', label: 'Anti-Armour',   hint: 'IGNORE ARMOUR + ARMOUR-PIERCING' },
        { key: 'antiHorde',  label: 'Anti-Horda',    hint: 'BLAST + AUTOMATIC + FLAMETHROWER' },
        { key: 'antiElite',  label: 'Anti-Élite',    hint: 'CRITICAL + DEADLY + IGNORE ARMOUR' },
        { key: 'antiFear',   label: 'Anti-Fear',     hint: 'NEGATE FEAR + Onward (Cleric aura)' },
        { key: 'resilience', label: 'Resiliencia',   hint: 'Field Strength + Armour + TOUGH' },
        { key: 'mobility',   label: 'Movilidad',     hint: 'FLYING + INFILTRATOR + IGNORE DEFENDED OBSTACLE + FAST' },
      ];
      const labelColors = {
        low:    '#c92424',
        medium: '#d4a017',
        high:   '#7fb069',
      };
      const labelText = { low: 'BAJA', medium: 'MEDIA', high: 'ALTA' };
      html += `
        <div style="margin-top:2rem;">
          <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">🧬 Diagnóstico Estructural</h3>
          <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.8rem;">
            Cobertura de tu banda en seis dimensiones tácticas. Te muestra el "perfil" de la composición independientemente de los matchups.
            <span style="color:#7fb069;">Alta</span> = saturación, <span style="color:#d4a017;">Media</span> = adecuada, <span style="color:#c92424;">Baja</span> = lagunar.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.45rem;">
      `;
      for (const d of dims) {
        const c = cov[d.key];
        const color = labelColors[c.label];
        const widthPct = c.score;
        html += `
          <div style="display:grid;grid-template-columns:120px 1fr 90px;gap:0.6rem;align-items:center;">
            <div style="font-size:0.85em;font-weight:600;" title="${d.hint}">${d.label}</div>
            <div style="position:relative;height:14px;background:rgba(127,107,67,0.12);overflow:hidden;">
              <div style="position:absolute;left:0;top:0;bottom:0;width:${widthPct}%;background:${color};transition:width 0.3s;"></div>
            </div>
            <div style="font-size:0.78em;text-align:right;color:${color};font-weight:600;">
              ${c.score} · ${labelText[c.label]}
            </div>
          </div>
        `;
      }
      html += '</div>';
    }
  }

  // Compare against the previous simulation of the same band (if exists).
  // We look up the most recent prior entry with the same bandName and same
  // mode. If the matchup labels overlap, show per-enemy delta.
  const wbHist = STATE.currentWarband;
  if (wbHist && wbHist.name) {
    try {
      const history = loadSimHistory(wbHist.name);
      // The current run was just saved by _saveLabRunToHistory, so the
      // PENULTIMATE entry is the previous one. Look for the most recent
      // entry that's NOT the current run.
      const currentMode = opts.mode || 'analyze';
      const prior = [...history].reverse().slice(1).find(e => e.mode === currentMode);
      if (prior && prior.summary && Array.isArray(prior.summary.matchups)) {
        const priorByLabel = {};
        for (const m of prior.summary.matchups) {
          priorByLabel[m.enemyLabel] = m.winRate;
        }
        // Build current matchups from the current results
        const currentMatchups = (results || []).map(r => ({
          enemyLabel: r.enemyLabel,
          winRate: r.winRateA,
        }));
        // Compute deltas only for matchups that exist in BOTH runs
        const deltas = currentMatchups
          .map(m => {
            const prev = priorByLabel[m.enemyLabel];
            if (typeof prev !== 'number') return null;
            return {
              enemyLabel: m.enemyLabel,
              current: m.winRate,
              previous: prev,
              diff: m.winRate - prev,
            };
          })
          .filter(d => d !== null);
        if (deltas.length) {
          const ageDays = (Date.now() - prior.timestamp) / (1000 * 60 * 60 * 24);
          const ageStr = ageDays < 1 ? 'hoy' :
                         ageDays < 2 ? 'ayer' :
                         ageDays < 30 ? `hace ${Math.floor(ageDays)} días` :
                         `hace ${Math.floor(ageDays / 30)} meses`;
          html += `
            <div style="margin-top:1.5rem;padding:0.8rem 1rem;background:rgba(176,141,87,0.06);border-left:3px solid var(--gold);">
              <h3 style="font-size:0.95rem;margin:0 0 0.5rem;color:var(--gold);">📈 Cambio respecto a la simulación anterior <span style="font-weight:400;color:var(--parchment-dim);font-size:0.85em;">(${ageStr})</span></h3>
              <table style="width:100%;border-collapse:collapse;font-size:0.85rem;">
                <thead>
                  <tr style="border-bottom:1px solid rgba(127,107,67,0.3);">
                    <th style="text-align:left;padding:0.3rem 0.5rem;">Enemigo</th>
                    <th style="text-align:right;padding:0.3rem 0.5rem;">Antes</th>
                    <th style="text-align:right;padding:0.3rem 0.5rem;">Ahora</th>
                    <th style="text-align:right;padding:0.3rem 0.5rem;">Δ</th>
                  </tr>
                </thead>
                <tbody>
          `;
          for (const d of deltas) {
            const diffPp = (d.diff * 100).toFixed(0);
            const dColor = Math.abs(d.diff) < 0.05 ? 'var(--parchment-dim)'
              : d.diff > 0 ? '#7fb069' : '#c92424';
            const sign = d.diff > 0 ? '+' : '';
            html += `
              <tr>
                <td style="padding:0.3rem 0.5rem;">${d.enemyLabel}</td>
                <td style="padding:0.3rem 0.5rem;text-align:right;font-family:var(--font-mono);">${(d.previous * 100).toFixed(0)}%</td>
                <td style="padding:0.3rem 0.5rem;text-align:right;font-family:var(--font-mono);">${(d.current * 100).toFixed(0)}%</td>
                <td style="padding:0.3rem 0.5rem;text-align:right;color:${dColor};font-weight:600;font-family:var(--font-mono);">${sign}${diffPp}pp</td>
              </tr>
            `;
          }
          html += '</tbody></table></div>';
        }
      }
    } catch (e) {
      console.warn('History delta failed:', e);
    }
  }

  // Cross-faction coverage heatmap: compares user's coverage against the
  // canonical faction benchmarks. Shows where the user excels and lags.
  const wbHeat = STATE.currentWarband;
  if (wbHeat) {
    let heatCov = null;
    try { heatCov = computeCoverageMatrix(wbHeat); }
    catch (e) {}
    let comparison = null;
    if (heatCov) {
      try {
        const benchmarks = computeFactionBenchmarks_lab();
        comparison = compareCoverageVsFactions_lab(heatCov, benchmarks);
      } catch (e) { console.warn('Heatmap compare failed:', e); }
    }
    if (comparison && comparison.dimensions.length) {
      // Faction order for the table (alphabetical-ish, consistent)
      const factionOrder = ['newAntioch','trenchPilgrims','ironSultanate','hereticLegions','blackGrail','courtSerpent'];
      const factionShortLabels = {
        newAntioch:     'NA',
        trenchPilgrims: 'Pilgrims',
        ironSultanate:  'Sultanate',
        hereticLegions: 'Heretic',
        blackGrail:     'B.Grail',
        courtSerpent:   'Court',
      };
      const factionFullLabels = {
        newAntioch:     'New Antioch',
        trenchPilgrims: 'Trench Pilgrims',
        ironSultanate:  'Iron Sultanate',
        hereticLegions: 'Heretic Legions',
        blackGrail:     'Black Grail',
        courtSerpent:   'Court of Serpent',
      };
      const factionColors = {
        newAntioch:     '#e8c547',
        trenchPilgrims: '#b0c987',
        ironSultanate:  '#d4915e',
        hereticLegions: '#c84545',
        blackGrail:     '#7a5c8e',
        courtSerpent:   '#5a9bb0',
      };
      const userBandLabel = (wbHeat.name || 'Tu banda').slice(0, 14);
      // Color helper: 0-25 red → 25-50 amber → 50-75 yellow-green → 75-100 green
      const cellColor = (score) => {
        if (score >= 75) return { bg: 'rgba(127,176,105,0.30)', txt: '#7fb069' };
        if (score >= 50) return { bg: 'rgba(127,176,105,0.15)', txt: '#7fb069' };
        if (score >= 30) return { bg: 'rgba(212,160,23,0.18)', txt: '#d4a017' };
        if (score >= 15) return { bg: 'rgba(201,36,36,0.12)', txt: '#c92424' };
        return { bg: 'rgba(201,36,36,0.20)', txt: '#c92424' };
      };
      // Build radar SVG visualization
      let radarSVG = '';
      try { radarSVG = renderCoverageRadarSVG(comparison, userBandLabel); }
      catch (e) { console.warn('Radar SVG failed:', e); }
      // Legend (one swatch per faction + user)
      let legendHTML = `<div style="display:flex;flex-wrap:wrap;gap:0.8rem;justify-content:center;margin:0.5rem 0 0.7rem;font-size:0.78em;">
        <div style="display:flex;align-items:center;gap:0.35rem;"><span style="display:inline-block;width:14px;height:8px;background:#d4a017;border:1px solid #1a0f08;"></span><strong style="color:#d4a017;">${userBandLabel}</strong></div>
      `;
      for (const fid of factionOrder) {
        legendHTML += `<div style="display:flex;align-items:center;gap:0.35rem;color:var(--parchment-dim);"><span style="display:inline-block;width:12px;height:6px;background:${factionColors[fid]};opacity:0.75;"></span>${factionFullLabels[fid]}</div>`;
      }
      legendHTML += '</div>';

      html += `
        <div style="margin-top:2rem;">
          <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">🌡 Heatmap Cross-Faction</h3>
          <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.6rem;">
            Tu banda comparada contra el coverage promedio de cada facción canónica al mismo presupuesto. Cada celda muestra el score 0-100 de esa dimensión. <strong style="color:#7fb069;">Verde</strong> = alto · <strong style="color:#d4a017;">ámbar</strong> = medio · <strong style="color:#c92424;">rojo</strong> = bajo.
          </p>
          ${radarSVG ? `
            <div style="background:rgba(127,107,67,0.04);padding:1rem 0.5rem 0.5rem;border:1px solid rgba(127,107,67,0.3);margin-bottom:0.7rem;">
              ${radarSVG}
              ${legendHTML}
            </div>
          ` : ''}
          <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
            <thead>
              <tr style="border-bottom:2px solid var(--gold);">
                <th style="text-align:left;padding:0.4rem;">Dimensión</th>
                <th style="text-align:center;padding:0.4rem;background:rgba(176,141,87,0.10);" title="Tu banda">${userBandLabel}</th>
      `;
      for (const fid of factionOrder) {
        html += `<th style="text-align:center;padding:0.4rem;font-size:0.78em;color:var(--parchment-dim);">${factionShortLabels[fid] || fid}</th>`;
      }
      html += `
                <th style="text-align:right;padding:0.4rem;font-size:0.78em;color:var(--parchment-dim);">Rank</th>
              </tr>
            </thead>
            <tbody>
      `;
      for (const d of comparison.dimensions) {
        const userCol = cellColor(d.userScore);
        const rankColor = d.rank <= 2 ? '#7fb069' : d.rank >= 6 ? '#c92424' : '#d4a017';
        // Highlight user cell border based on rank
        const userBorder = d.rank <= 2 ? '2px solid #7fb069'
          : d.rank >= 6 ? '2px solid #c92424'
          : '1px solid var(--gold)';
        // Rank icon
        const rankIcon = d.rank === 1 ? '★'
          : d.rank <= 2 ? '✓'
          : d.rank >= 6 ? '⚠' : '';
        html += `
          <tr style="border-bottom:1px solid rgba(127,107,67,0.2);">
            <td style="padding:0.4rem;font-weight:500;">${d.label}</td>
            <td style="padding:0.4rem;text-align:center;background:${userCol.bg};color:${userCol.txt};font-weight:700;font-family:var(--font-mono);border:${userBorder};">${d.userScore}</td>
        `;
        for (const fid of factionOrder) {
          const fScore = d.factionScores[fid] || 0;
          const fCol = cellColor(fScore);
          html += `<td style="padding:0.4rem;text-align:center;background:${fCol.bg};color:${fCol.txt};font-family:var(--font-mono);">${fScore}</td>`;
        }
        html += `
            <td style="padding:0.4rem;text-align:right;color:${rankColor};font-weight:600;font-family:var(--font-mono);">${rankIcon} ${d.rank}/${d.outOf}</td>
          </tr>
        `;
      }
      // Footer summary row: total dimensions in top-2, top-3, bottom
      const top2Count = comparison.dimensions.filter(d => d.rank <= 2).length;
      const aboveMedianCount = comparison.dimensions.filter(d => d.userScore > d.median).length;
      const bottomCount = comparison.dimensions.filter(d => d.rank >= 6).length;
      const summaryParts = [];
      if (top2Count > 0) summaryParts.push(`<span style="color:#7fb069;">★ Top 2 en ${top2Count}/${comparison.dimensions.length}</span>`);
      if (aboveMedianCount > 0) summaryParts.push(`<span style="color:var(--parchment-dim);">por encima de mediana en ${aboveMedianCount}/${comparison.dimensions.length}</span>`);
      if (bottomCount > 0) summaryParts.push(`<span style="color:#c92424;">⚠ Última posición en ${bottomCount}/${comparison.dimensions.length}</span>`);
      const summaryText = summaryParts.join(' · ');
      html += `
            <tr style="background:rgba(176,141,87,0.05);">
              <td colspan="${factionOrder.length + 3}" style="padding:0.5rem 0.4rem;font-size:0.82em;text-align:center;font-style:italic;">
                ${summaryText || 'Banda de perfil medio sin extremos cross-faction.'}
              </td>
            </tr>
      `;
      html += '</tbody></table></div>';
      // Insights below the heatmap
      if (comparison.insights.length) {
        html += `<div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.7rem;">`;
        for (const ins of comparison.insights) {
          const colors = {
            good: { bg: 'rgba(127,176,105,0.08)', border: '#7fb069', icon: '✓' },
            info: { bg: 'rgba(176,141,87,0.05)',  border: 'var(--parchment-dim)', icon: '·' },
            warn: { bg: 'rgba(212,160,23,0.08)', border: '#d4a017', icon: '◆' },
            crit: { bg: 'rgba(201,36,36,0.08)',  border: '#c92424', icon: '⚠' },
          };
          const c = colors[ins.severity] || colors.info;
          html += `
            <div style="padding:0.5rem 0.7rem;background:${c.bg};border-left:3px solid ${c.border};font-size:0.85em;line-height:1.4;">
              <span style="color:${c.border};font-weight:600;margin-right:0.4em;">${c.icon}</span>${ins.text}
            </div>
          `;
        }
        html += '</div>';
      }
      html += '</div>';
    }
  }

  // Scenario fit analysis: tier rating per scenario archetype with strategic
  // adjustments. Goes here because it builds on coverage matrix.
  const wbScn = STATE.currentWarband;
  if (wbScn) {
    let scnCov = null;
    try { scnCov = computeCoverageMatrix(wbScn); }
    catch (e) {}
    let scnFits = [];
    if (scnCov) {
      try { scnFits = analyzeScenarioFit_lab(wbScn, scnCov); }
      catch (e) { console.warn('Scenario fit failed:', e); }
    }
    if (scnFits.length) {
      // Sort by tier (S>A>B>C), then by score
      const tierOrder = { S: 0, A: 1, B: 2, C: 3 };
      scnFits.sort((a, b) => {
        const dt = (tierOrder[a.fit] || 99) - (tierOrder[b.fit] || 99);
        if (dt !== 0) return dt;
        return (b.score || 0) - (a.score || 0);
      });
      html += `
        <div style="margin-top:2rem;">
          <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">🗺 Fit por Arquetipo de Scenario</h3>
          <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.6rem;">
            Cómo encaja tu composición en cada arquetipo de scenario canon (numerados I-XII en el rulebook).
            <span style="color:#7fb069;">Tier S/A</span> = excelente fit ·
            <span style="color:#d4a017;">Tier B</span> = aceptable ·
            <span style="color:#c92424;">Tier C</span> = composición difícil. Si conoces el scenario antes de la partida, prioriza los matchups donde tu fit es más alto.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
      `;
      for (const f of scnFits) {
        const colors = {
          good: { bg: 'rgba(127,176,105,0.08)', border: '#7fb069', icon: '✓' },
          info: { bg: 'rgba(176,141,87,0.05)',  border: '#d4a017', icon: '◆' },
          warn: { bg: 'rgba(212,160,23,0.08)', border: '#d4a017', icon: '◆' },
          crit: { bg: 'rgba(201,36,36,0.08)',  border: '#c92424', icon: '⚠' },
        };
        const c = colors[f.severity] || colors.info;
        html += `
          <div style="padding:0.6rem 0.8rem;background:${c.bg};border-left:3px solid ${c.border};font-size:0.88em;line-height:1.45;">
            <span style="color:${c.border};font-weight:600;margin-right:0.4em;">${c.icon}</span>${f.text}
          </div>
        `;
      }
      html += '</div></div>';
    }
  }

  // Synergy detection: pairs of friendly models whose performance
  // correlates positively/negatively. Useful for deployment planning.
  const wbSyn = STATE.currentWarband;
  if (wbSyn && results && results.length) {
    let synergies = [];
    try { synergies = detectModelSynergies_lab(results); }
    catch (e) { console.warn('Synergy detection failed:', e); }
    if (synergies.length) {
      html += `
        <div style="margin-top:2rem;">
          <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">🔗 Sinergias entre modelos</h3>
          <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.6rem;">
            Pares de modelos cuya supervivencia correlaciona más (sinergia) o menos (conflicto) de lo esperado por independencia. <strong>Lift</strong> = ratio observado/esperado: 1.0 = independientes, &gt;1.10 sinergia, &lt;0.85 conflicto. Útil para planificar despliegue.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
      `;
      for (const i of synergies) {
        const colors = {
          good: { bg: 'rgba(127,176,105,0.08)', border: '#7fb069', icon: '✓' },
          info: { bg: 'rgba(176,141,87,0.05)',  border: 'var(--parchment-dim)', icon: '·' },
          warn: { bg: 'rgba(212,160,23,0.08)', border: '#d4a017', icon: '◆' },
          crit: { bg: 'rgba(201,36,36,0.08)',  border: '#c92424', icon: '⚠' },
        };
        const c = colors[i.severity] || colors.info;
        html += `
          <div style="padding:0.6rem 0.8rem;background:${c.bg};border-left:3px solid ${c.border};font-size:0.88em;line-height:1.45;">
            <span style="color:${c.border};font-weight:600;margin-right:0.4em;">${c.icon}</span>${i.text}
          </div>
        `;
      }
      html += '</div></div>';
    }
  }

  // Enemy threat analysis: per-matchup MVP identification + countermeasures.
  // This is the most actionable section: it tells you WHO to focus down
  // and HOW to counter their kit. Placed BEFORE tactical analysis so the
  // user sees specific advice first.
  const wbThreats = STATE.currentWarband;
  if (wbThreats && results && results.length) {
    let threatInsights = [];
    try { threatInsights = analyzeEnemyThreats_lab(results); }
    catch (e) { console.warn('Threat analysis failed:', e); }
    if (threatInsights.length) {
      html += `
        <div style="margin-top:2rem;">
          <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">🎯 Amenazas Principales por Matchup</h3>
          <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.6rem;">
            Identificación del modelo más letal del rival en cada matchup, con contramedidas específicas basadas en su perfil de keywords.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
      `;
      for (const i of threatInsights) {
        const colors = {
          crit: { bg: 'rgba(201,36,36,0.08)',  border: '#c92424', icon: '⚠' },
          warn: { bg: 'rgba(212,160,23,0.08)', border: '#d4a017', icon: '◆' },
          info: { bg: 'rgba(176,141,87,0.05)',  border: 'var(--parchment-dim)', icon: '·' },
        };
        const c = colors[i.severity] || colors.info;
        html += `
          <div style="padding:0.6rem 0.8rem;background:${c.bg};border-left:3px solid ${c.border};font-size:0.88em;line-height:1.45;">
            <span style="color:${c.border};font-weight:600;margin-right:0.4em;">${c.icon}</span>${i.text}
          </div>
        `;
      }
      html += '</div></div>';
    }
  }

  // Faction-aware upgrade suggestions: for each LOW dimension in coverage
  // matrix, propose canon upgrades available to this faction. Placed
  // after threat analysis: "what's wrong" then "how to fix it".
  const wbUpg = STATE.currentWarband;
  if (wbUpg) {
    let cov = null;
    try { cov = computeCoverageMatrix(wbUpg); }
    catch (e) { console.warn('Coverage failed:', e); }
    let upgInsights = [];
    if (cov) {
      try { upgInsights = suggestFactionUpgrades_lab(wbUpg, cov); }
      catch (e) { console.warn('Upgrades failed:', e); }
    }
    if (upgInsights.length) {
      html += `
        <div style="margin-top:2rem;">
          <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">🛠 Sugerencias de Upgrade (Canon)</h3>
          <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.6rem;">
            Mejoras concretas disponibles para tu facción que cubrirían las dimensiones tácticas con score bajo. Cada sugerencia incluye coste, efecto de keyword, y rol.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
      `;
      for (const i of upgInsights) {
        html += `
          <div style="padding:0.6rem 0.8rem;background:rgba(212,160,23,0.08);border-left:3px solid #d4a017;font-size:0.88em;line-height:1.45;">
            <span style="color:#d4a017;font-weight:600;margin-right:0.4em;">◆</span>${i.text}
          </div>
        `;
      }
      html += '</div></div>';
    }
  }

  // ── Battlekit Deltas (per-model upgrade recommendations) ─────────
  // For each model, show the top 3 most efficient armoury upgrades.
  // Heuristic-based, deterministic (no simulation).
  if (STATE.currentWarband && opts.mode !== 'compare') {
    try {
      const recs = recommendBattlekit(STATE.currentWarband);
      const modelsWithRecs = recs.byModel.filter(e => e.topPicks.length > 0);
      if (modelsWithRecs.length > 0) {
        const ctxLabels = {
          mid:   'general',
          horde: 'vs. horda',
          heavy: 'vs. heavy',
          elite: 'vs. ELITE',
        };
        const ctxColors = {
          mid:   '#a8b466',
          horde: '#d4a017',
          heavy: '#c92424',
          elite: '#7fb069',
        };
        html += `
          <div style="margin-top:2rem;">
            <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">⚒ Battlekit Deltas (Por Modelo)</h3>
            <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.8rem;">
              Mejoras de armoury más eficientes (Δscore / coste 👑) para cada modelo. La heurística considera
              keywords (+1 DICE, IGNORE ARMOUR, BLAST, CRITICAL...) y contexto enemigo. Verifica legalidad en el Companion.
            </p>
            <div style="display:flex;flex-direction:column;gap:0.6rem;">
        `;
        for (const entry of modelsWithRecs) {
          html += `
            <div style="padding:0.6rem 0.8rem;background:rgba(176,141,87,0.06);border-left:3px solid var(--gold);">
              <div style="font-weight:600;color:var(--parchment);margin-bottom:0.3em;">
                ${escapeHtml(entry.modelName)}
                <span style="font-size:0.72em;color:var(--parchment-dim);font-weight:normal;margin-left:0.4em;">${entry.totalCandidates} candidatos</span>
              </div>
              <ul style="margin:0;padding-left:1.2em;font-size:0.82em;line-height:1.55;">
          `;
          for (const pick of entry.topPicks) {
            const ctxLabel = ctxLabels[pick.ctxBest] || 'general';
            const ctxColor = ctxColors[pick.ctxBest] || 'var(--parchment-dim)';
            const slotIcon = pick.slot === 'melee' ? '⚔' : '🔫';
            html += `
              <li style="margin-bottom:0.3em;">
                ${slotIcon} <strong>${escapeHtml(pick.armouryItem.name)}</strong>
                <span style="color:var(--parchment-dim);font-family:var(--font-mono);font-size:0.9em;"> · ${pick.cost}👑 · eff ${pick.efficiency.toFixed(2)}</span>
                <span style="color:${ctxColor};margin-left:0.4em;font-size:0.92em;">→ ${ctxLabel}</span>
              </li>
            `;
          }
          html += `</ul></div>`;
        }
        html += `</div>
            <p style="font-size:0.72em;color:var(--parchment-dim);margin-top:0.6rem;font-style:italic;">
              Heurística determinística: no simula batallas, evalúa weapons por sus keywords.
              "eff" = ganancia bruta de score / coste — picks con eff &gt; 2 son altamente prioritarios.
            </p>
          </div>
        `;
      }
    } catch (e) {
      console.warn('Battlekit deltas failed:', e);
    }
  }

  // Tactical analysis (insights based on warband composition + results)
  const wb = STATE.currentWarband;
  if (wb) {
    let insights = [];
    try { insights = generateTacticalAnalysis(wb, results); }
    catch (e) { console.warn('Tactical analysis failed:', e); }
    if (insights.length) {
      html += `
        <div style="margin-top:2rem;">
          <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">📋 Análisis Táctico</h3>
          <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.6rem;">
            Recomendaciones basadas en la composición de tu banda y los resultados simulados.
            <span style="color:#7fb069;">Verde</span> = fortaleza ·
            <span style="color:#d4a017;">Ámbar</span> = oportunidad ·
            <span style="color:#c92424;">Rojo</span> = debilidad importante ·
            <span style="color:var(--parchment-dim);">Gris</span> = info contextual.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
      `;
      for (const i of insights) {
        const colors = {
          crit: { bg: 'rgba(201,36,36,0.08)',  border: '#c92424', icon: '⚠' },
          warn: { bg: 'rgba(212,160,23,0.08)', border: '#d4a017', icon: '◆' },
          good: { bg: 'rgba(127,176,105,0.08)', border: '#7fb069', icon: '✓' },
          info: { bg: 'rgba(176,141,87,0.05)',  border: 'var(--parchment-dim)', icon: '·' },
        };
        const c = colors[i.severity] || colors.info;
        html += `
          <div style="padding:0.6rem 0.8rem;background:${c.bg};border-left:3px solid ${c.border};font-size:0.88em;line-height:1.45;">
            <span style="color:${c.border};font-weight:600;margin-right:0.4em;">${c.icon}</span>${i.text}
          </div>
        `;
      }
      html += '</div></div>';
    }
  }

  // Combat Playbook: turn-by-turn strategic recommendations based on
  // warband composition + matchup results. Placed last because it's the
  // synthesis: now that the user knows their gaps and threats, this is
  // how to actually play the game.
  const wbPlay = STATE.currentWarband;
  if (wbPlay) {
    let plays = [];
    try { plays = generateCombatPlaybook(wbPlay, results); }
    catch (e) { console.warn('Playbook failed:', e); }
    if (plays.length) {
      html += `
        <div style="margin-top:2rem;">
          <h3 style="font-size:1rem;margin-bottom:0.5rem;color:var(--gold);">📖 Plan de Combate (turno a turno)</h3>
          <p style="font-size:0.8em;color:var(--parchment-dim);margin-bottom:0.6rem;">
            Plan estratégico contextualizado a tu banda: qué ACTIONs lanzar y a quién priorizar en cada fase.
          </p>
          <div style="display:flex;flex-direction:column;gap:0.5rem;">
      `;
      for (const p of plays) {
        html += `
          <div style="padding:0.7rem 0.9rem;background:rgba(176,141,87,0.08);border-left:3px solid var(--gold);font-size:0.88em;line-height:1.5;">
            <div style="color:var(--gold);font-weight:600;font-size:0.9em;margin-bottom:0.2em;">${p.turn}</div>
            ${p.text}
          </div>
        `;
      }
      html += '</div></div>';
    }
  }

  out.innerHTML = html;
}

// Warband name input (persists on blur)
document.getElementById('warband-name').addEventListener('input', (e) => {
  if (STATE.currentWarband) {
    STATE.currentWarband.name = e.target.value;
    persistWarband(STATE.currentWarband);
  }
});

// Budget and starting glory inputs
function bindBudgetInputs() {
  const bIn = document.getElementById('budget-input');
  const gIn = document.getElementById('glory-input');
  const gameSelect = document.getElementById('budget-game-select');

  // Populate the game-select with canonical Warband Threshold Table entries.
  // Re-population is idempotent (we only add options once) so it's safe to
  // call from anywhere. Guard against the campaign-tables module not yet
  // being loaded (e.g. in test environments) by catching the TDZ error.
  let _ct = null;
  try { _ct = CAMPAIGN_TABLES; } catch (e) { _ct = null; }
  if (gameSelect && !gameSelect.dataset.populated && _ct && _ct.warbandThresholdByGame) {
    gameSelect.dataset.populated = '1';
    for (const row of _ct.warbandThresholdByGame) {
      const opt = document.createElement('option');
      opt.value = String(row.game);
      opt.textContent = `Game ${row.game} — ${row.threshold} 👑 · ${row.fieldStrength} mod.`;
      gameSelect.appendChild(opt);
    }
  }

  if (bIn && !bIn.dataset.bound) {
    bIn.dataset.bound = '1';
    bIn.addEventListener('input', () => {
      if (!STATE.currentWarband) return;
      const v = parseInt(bIn.value, 10);
      if (Number.isFinite(v) && v >= 0) {
        STATE.currentWarband.budgetTotal = v;
        // The user typed manually; reset gameNumber so the dropdown shows "manual"
        STATE.currentWarband.gameNumber = null;
        if (gameSelect) gameSelect.value = '';
        persistWarband(STATE.currentWarband);
        renderRoster();
      }
    });
  }
  if (gIn && !gIn.dataset.bound) {
    gIn.dataset.bound = '1';
    gIn.addEventListener('input', () => {
      if (!STATE.currentWarband) return;
      const v = parseInt(gIn.value, 10);
      if (Number.isFinite(v) && v >= 0) {
        STATE.currentWarband.startingGlory = v;
        persistWarband(STATE.currentWarband);
        renderRoster();
      }
    });
  }
  if (gameSelect && !gameSelect.dataset.bound) {
    gameSelect.dataset.bound = '1';
    gameSelect.addEventListener('change', () => {
      if (!STATE.currentWarband) return;
      const v = gameSelect.value;
      if (!v) {
        // User went back to manual — keep current budget, just clear gameNumber
        STATE.currentWarband.gameNumber = null;
      } else {
        const gameNumber = parseInt(v, 10);
        const row = warbandThresholdForGame(gameNumber);
        if (row) {
          STATE.currentWarband.gameNumber = gameNumber;
          STATE.currentWarband.budgetTotal = row.threshold;
          // Reflect in the input
          if (bIn) bIn.value = row.threshold;
        }
      }
      persistWarband(STATE.currentWarband);
      renderRoster();
    });
  }
  // Promotion Step button: opens the promotion modal
  const promoBtn = document.getElementById('btn-promotion-step');
  if (promoBtn && !promoBtn.dataset.bound) {
    promoBtn.dataset.bound = '1';
    promoBtn.addEventListener('click', () => {
      const wb = STATE.currentWarband;
      if (!wb) return;
      openPromotionModal(wb, (promotedList) => {
        for (const m of promotedList) {
          promoteModel(m);
        }
        persistWarband(wb);
        renderAll();
      });
    });
  }
  // Reinforcements Step button: opens the reinforcements modal
  const rfBtn = document.getElementById('btn-reinforcements-step');
  if (rfBtn && !rfBtn.dataset.bound) {
    rfBtn.dataset.bound = '1';
    rfBtn.addEventListener('click', () => {
      const wb = STATE.currentWarband;
      if (!wb) return;
      openReinforcementsModal(wb, () => {
        // applyReinforcementsStep already mutated the wb in place. Just persist
        // and re-render the UI to reflect the new budget / cleared strongbox.
        persistWarband(wb);
        renderAll();
      });
    });
  }
  // Fase 3 — Free Battle Wizard button: opens the wizard for the current band.
  const fbBtn = document.getElementById('btn-start-free-battle');
  if (fbBtn && !fbBtn.dataset.bound) {
    fbBtn.dataset.bound = '1';
    fbBtn.addEventListener('click', () => {
      const wb = STATE.currentWarband;
      if (!wb) return;
      openFreeBattleWizard(wb);
    });
  }
  // P1 open-QM-free — Quartermaster button for the free context.
  const qmFreeBtn = document.getElementById('btn-open-qm-free');
  if (qmFreeBtn && !qmFreeBtn.dataset.bound) {
    qmFreeBtn.dataset.bound = '1';
    qmFreeBtn.addEventListener('click', () => {
      const wb = STATE.currentWarband;
      if (!wb) return;
      openQuartermaster(null, wb);
    });
  }
  // Fase 7.4 — Warband campaigns button.
  const wbCampBtn = document.getElementById('btn-warband-campaigns');
  if (wbCampBtn && !wbCampBtn.dataset.bound) {
    wbCampBtn.dataset.bound = '1';
    wbCampBtn.addEventListener('click', () => {
      const wb = STATE.currentWarband;
      if (!wb) return;
      openWarbandCampaignsModal(wb);
    });
  }
}
bindBudgetInputs();

/* Fase 7.4 — Opens the modal listing the campaigns this warband
 * participates in. The list is computed from loadCampaignIndex +
 * loadCampaign per id; tests cover the pure helper getWarbandCampaigns.
 */
function openWarbandCampaignsModal(wb) {
  if (!wb) return;
  const subtitle = document.getElementById('wbcamp-subtitle');
  if (subtitle) subtitle.textContent = `Banda: ${wb.name || wb.id}`;
  const list = document.getElementById('wbcamp-list');
  const idx = (typeof loadCampaignIndex === 'function') ? loadCampaignIndex() : [];
  const campaigns = idx.map(meta => (typeof loadCampaign === 'function' ? loadCampaign(meta.id) : null)).filter(Boolean);
  const rows = getWarbandCampaigns(wb, { campaigns });
  if (!rows.length) {
    list.innerHTML = `<div class="notice info">Esta banda no participa en ninguna campaña registrada.</div>`;
  } else {
    list.innerHTML = rows.map(r => `
      <div class="detail-section" style="display:flex;align-items:center;gap:0.6rem;">
        <div style="flex:1;">
          <div class="detail-label">${r.name}</div>
          <div style="font-size:0.85rem;color:var(--parchment-dim);">
            ${r.battleCount} batalla${r.battleCount === 1 ? '' : 's'}${r.gameNumber !== null ? ` · Game ${r.gameNumber}` : ''}
          </div>
        </div>
        <button class="btn btn-primary" data-open-camp-id="${r.id}">Abrir</button>
      </div>`).join('');
    list.querySelectorAll('[data-open-camp-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.openCampId;
        const c = (typeof loadCampaign === 'function') ? loadCampaign(id) : null;
        if (!c) return;
        closeModal('modal-warband-campaigns');
        STATE.currentCampaign = c;
        STATE.selectedCampaignWarbandId = wb.id;
        if (typeof refreshAllWarbandStates === 'function') refreshAllWarbandStates(c);
        if (typeof setMode === 'function') setMode('campana');
        if (typeof renderCampaignMode === 'function') renderCampaignMode();
      });
    });
  }
  openModal('modal-warband-campaigns');
}


