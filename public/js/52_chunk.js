/* ======================================================================
   ====================================================================
   QUARTERMASTER STEP
   ====================================================================
   ====================================================================== */

let QM = null;  // active quartermaster context: { campaign, warband, tab }

function openQuartermaster(c, wb) {
  // P1 open-QM-free — c may be null in free context. We default the
  // active tab to 'shopping' (works without campaign); campaign-only
  // tabs are hidden by renderQM via data-qmtab-campaign-only.
  const initialTab = c ? 'recruit' : 'shopping';
  QM = { campaign: c, warband: wb, tab: initialTab, selectedModelUid: null };
  // Apply warband faction theme to QM
  const f = DATA.factions[wb.factionId];
  document.body.dataset.side = f.side;
  // Update header
  document.getElementById('qm-title').textContent = `🛒 Quartermaster · ${wb.name || '(Sin nombre)'}`;
  const subtitle = c ? `${f.name} · Campaña: ${c.name}` : `${f.name} · Partida libre (strongbox de banda)`;
  document.getElementById('qm-subtitle').textContent = subtitle;
  openModal('modal-quartermaster');
  renderQM();
}
function closeQuartermaster() {
  closeModal('modal-quartermaster');
  const wasFree = QM && !QM.campaign;
  QM = null;
  // Restore the right view based on context.
  if (wasFree) {
    if (typeof renderAll === 'function') renderAll();
  } else {
    renderCampaignMode();
  }
}

function renderQM() {
  if (!QM) return;
  const { campaign, warband } = QM;

  // Update balance — campaign path uses campaignBalance, free path
  // uses wb.strongbox via getWarbandBalance.
  const bal = getWarbandBalance(warband, campaign);
  const valEl = document.getElementById('qm-balance-value');
  valEl.textContent = `${bal.ducados} 👑 · ${bal.glory} ☼`;
  valEl.classList.toggle('over', bal.ducados < 0 || bal.glory < 0);
  if (campaign) {
    document.getElementById('qm-balance-detail').innerHTML =
      `Inicial ${bal.startingDucats}/${bal.startingGlory} · +ganados ${bal.earningsDucats}/${bal.earningsGlory} · −coste ${bal.rosterCostDucats}/${bal.rosterCostGlory}`;
  } else {
    // Free context — no detailed breakdown. Surface a hint instead.
    document.getElementById('qm-balance-detail').innerHTML =
      `<span style="color:var(--parchment-dim);">Strongbox acumulado de partidas libres</span>`;
  }

  // Tabs — hide campaign-only buttons when there's no campaign.
  document.querySelectorAll('.qm-tab').forEach(t => {
    const campaignOnly = t.dataset.qmtabCampaignOnly === '1';
    if (!campaign && campaignOnly) {
      t.style.display = 'none';
    } else {
      t.style.display = '';
    }
    t.classList.toggle('active', t.dataset.qmtab === QM.tab);
  });
  // If the active tab is now hidden, snap to a free-safe default.
  if (!campaign && (QM.tab === 'recruit' || QM.tab === 'log')) {
    QM.tab = 'shopping';
  }
  document.getElementById('qm-pane-recruit').style.display  = QM.tab === 'recruit'  ? '' : 'none';
  document.getElementById('qm-pane-roster').style.display   = QM.tab === 'roster'   ? '' : 'none';
  document.getElementById('qm-pane-shopping').style.display = QM.tab === 'shopping' ? '' : 'none';
  document.getElementById('qm-pane-arsenal').style.display  = QM.tab === 'arsenal'  ? '' : 'none';
  document.getElementById('qm-pane-status').style.display   = QM.tab === 'status'   ? '' : 'none';
  document.getElementById('qm-pane-history').style.display  = QM.tab === 'history'  ? '' : 'none';
  document.getElementById('qm-pane-log').style.display      = QM.tab === 'log'      ? '' : 'none';

  switch (QM.tab) {
    case 'recruit':  renderQMRecruit();  break;
    case 'roster':   renderQMRoster();   break;
    case 'shopping': renderQMShopping(); break;
    case 'arsenal':  renderQMArsenal();  break;
    case 'status':   renderQMStatus();   break;
    case 'history':  renderQMHistory();  break;
    case 'log':      renderQMLog();      break;
  }
}

/* Fase 7.2 — Battle history pane: chronological list of all battles
 * this warband has played, free + campaign, with origin badges.
 */
function renderQMHistory() {
  const pane = document.getElementById('qm-pane-history');
  const { warband: wb } = QM;
  // Resolve every campaign in the index so getWarbandBattleHistory can
  // scan their battles. We don't filter to wb.campaignIds because the
  // helper is the canonical source-of-truth for participation.
  const idx = (typeof loadCampaignIndex === 'function') ? loadCampaignIndex() : [];
  const campaigns = idx.map(meta => (typeof loadCampaign === 'function' ? loadCampaign(meta.id) : null)).filter(Boolean);
  const items = getWarbandBattleHistory(wb, { campaigns });
  if (!items.length) {
    pane.innerHTML = `<div class="detail-empty">
      Sin batallas registradas. Cuando esta banda termine una partida (libre o
      de campaña) aparecerá aquí con su badge de origen y resultado.
    </div>`;
    return;
  }
  let html = `<div style="display:flex;flex-direction:column;gap:0.5rem;">`;
  for (const it of items) {
    const b = it.battle;
    const scenarioId = (it.kind === 'free') ? b.scenarioId : b.scenario;
    const scenarioName = (scenarioId && SCENARIOS_CATALOG[scenarioId])
      ? SCENARIOS_CATALOG[scenarioId].name : (scenarioId || '—');
    let result = null;
    if (it.kind === 'free') {
      result = b.result;
    } else {
      const part = (b.participants || []).find(p => p && p.warbandId === wb.id);
      result = part ? part.result : null;
    }
    const resIcon = result === 'win' ? '🏆' : result === 'draw' ? '⚖' : (result === 'loss' ? '💀' : '·');
    let badge;
    if (it.kind === 'free') {
      const dateShort = it.date ? it.date.slice(0, 10) : '—';
      badge = `<span style="background:rgba(176,141,87,0.15);color:var(--gold);padding:0.1em 0.4em;font-size:0.75rem;">Libre · ${dateShort}</span>`;
    } else {
      const campName = it.campaign ? it.campaign.name : '(campaña)';
      badge = `<span style="background:rgba(127,107,67,0.15);color:var(--rust-bright);padding:0.1em 0.4em;font-size:0.75rem;">${campName}</span>`;
    }
    html += `
      <div class="detail-section" style="display:flex;align-items:center;gap:0.6rem;">
        <div style="font-size:1.1rem;min-width:1.5rem;text-align:center;">${resIcon}</div>
        <div style="flex:1;">
          <div class="detail-label">${scenarioName}</div>
          <div style="font-size:0.75rem;color:var(--parchment-dim);">${it.date || '—'}</div>
        </div>
        <div>${badge}</div>
      </div>`;
  }
  html += `</div>`;
  pane.innerHTML = html;
}

/* P2/6 — Arsenal pane: list wb.arsenal entries with provenance and a
 * per-entry remove button. The data lands here from
 * add-named-battlekit pending effects (Fase 5.6) and any manual
 * additions a future helper exposes.
 */
function renderQMArsenal() {
  const pane = document.getElementById('qm-pane-arsenal');
  const { warband: wb } = QM;
  const list = Array.isArray(wb.arsenal) ? wb.arsenal : [];
  if (list.length === 0) {
    pane.innerHTML = `<div class="detail-empty">
      Arsenal vacío. Se llena con descubrimientos de Exploration que añaden
      battlekit nombrado (ej. Trench Shrine → Field Shrine / Troop Flag).
    </div>`;
    return;
  }
  let html = `<div style="display:flex;flex-direction:column;gap:0.5rem;">`;
  for (let i = 0; i < list.length; i++) {
    const it = list[i];
    const costStr = (typeof it.cost === 'number' && it.cost > 0)
      ? `${it.cost} ${it.currency || '👑'}` : 'gratis';
    const dt = it.addedAt ? new Date(it.addedAt).toISOString().slice(0,10) : '—';
    html += `
      <div class="detail-section" style="display:flex;align-items:center;gap:0.6rem;">
        <div style="flex:1;">
          <div class="detail-label">⚓ ${it.name}</div>
          <div style="font-size:0.85rem;color:var(--parchment-dim);">
            ${costStr} · añadido ${dt}
            ${it.source ? ` · <em style="color:var(--gold);">${it.source}</em>` : ''}
          </div>
        </div>
        <button class="btn btn-danger" data-arsenal-rm="${i}" title="Quitar del Arsenal">✕</button>
      </div>`;
  }
  html += `</div>`;
  pane.innerHTML = html;
  pane.querySelectorAll('[data-arsenal-rm]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.arsenalRm, 10);
      removeFromArsenal(wb, idx);
      persistWarband(wb);
      renderQM();
    });
  });
}

/* Fase 6.3 — Shopping list pane for the QM modal.
 * Lists the player's queued purchases with buy/remove affordances.
 * Buy is wired to the campaign-finances purchase flow used by qmRecruit.
 */
function renderQMShopping() {
  const pane = document.getElementById('qm-pane-shopping');
  const { campaign: c, warband: wb } = QM;
  const bal = campaignBalance(c, wb.id);
  const rows = qmShoppingRows(wb, bal);
  if (rows.length === 0) {
    pane.innerHTML = `<div class="detail-empty">
      Lista de la compra vacía. Añade items desde el panel de detalle de
      cada modelo (botón "+ Lista de la compra" junto a cada upgrade).
    </div>`;
    return;
  }
  let html = `<div id="qm-shopping-rows" style="display:flex;flex-direction:column;gap:0.5rem;">`;
  for (const row of rows) {
    const modelName = row.model ? (row.model.customName || (getUnit(wb.factionId, row.model.unitId) || {}).name || row.model.uid) : '(modelo perdido)';
    const kitName   = row.kit ? row.kit.name : '(kit no resuelto)';
    const costStr   = row.resolved ? `${row.cost} ${row.currency}` : '?';
    const have      = row.currency === '☼' ? (bal.glory || 0) : (bal.ducados || 0);
    const shortfall = row.resolved && !row.affordable ? `faltan ${row.cost - have} ${row.currency}` : '';
    // Fase 6.4 — draggable rows for reorder.
    html += `
      <div class="detail-section qm-shopping-row" draggable="true" data-drag-idx="${row.idx}" style="display:flex;align-items:center;gap:0.6rem;cursor:grab;">
        <div style="min-width:1.5rem;text-align:right;color:var(--parchment-dim);font-family:var(--font-mono);" title="Arrastra para reordenar">≡ ${row.entry.priority}.</div>
        <div style="flex:1;">
          <div class="detail-label">${kitName}</div>
          <div style="font-size:0.85rem;color:var(--parchment-dim);">${modelName} · ${costStr}</div>
          ${shortfall ? `<div style="font-size:0.75rem;color:var(--fallen-blood-bright);">${shortfall}</div>` : ''}
        </div>
        <div style="display:flex;gap:0.3rem;">
          ${row.resolved
            ? `<button class="btn btn-primary" data-buy-idx="${row.idx}" ${row.affordable ? '' : 'disabled'} title="${row.affordable ? 'Comprar' : shortfall}">Comprar</button>`
            : ''}
          <button class="btn btn-danger" data-remove-idx="${row.idx}" title="Quitar de la lista">✕</button>
        </div>
      </div>`;
  }
  html += `</div>`;
  pane.innerHTML = html;

  pane.querySelectorAll('[data-buy-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.buyIdx, 10);
      buyShoppingItem(c, wb, idx);
    });
  });
  pane.querySelectorAll('[data-remove-idx]').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.removeIdx, 10);
      removeFromShoppingList(wb, idx);
      persistWarband(wb);
      renderQM();
    });
  });

  // Fase 6.4 — drag-and-drop reorder. Uses native HTML5 DnD events.
  // dragstart stashes the source index in dataTransfer; drop calls
  // reorderShoppingList. We use document-level tracking instead of
  // dataTransfer because some browsers strip text/plain payload during
  // drop and we want a reliable handoff.
  let dragSrcIdx = null;
  pane.querySelectorAll('[data-drag-idx]').forEach(row => {
    row.addEventListener('dragstart', (e) => {
      dragSrcIdx = parseInt(row.dataset.dragIdx, 10);
      row.style.opacity = '0.5';
      if (e.dataTransfer) {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(dragSrcIdx));
      }
    });
    row.addEventListener('dragend', () => {
      row.style.opacity = '';
      dragSrcIdx = null;
    });
    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });
    row.addEventListener('drop', (e) => {
      e.preventDefault();
      const dstIdx = parseInt(row.dataset.dragIdx, 10);
      let srcIdx = dragSrcIdx;
      if (srcIdx === null && e.dataTransfer) {
        const s = e.dataTransfer.getData('text/plain');
        srcIdx = s ? parseInt(s, 10) : null;
      }
      if (typeof srcIdx === 'number' && srcIdx !== dstIdx) {
        reorderShoppingList(wb, srcIdx, dstIdx);
        persistWarband(wb);
        renderQM();
      }
    });
  });
}

/* Fase 6.3 — Execute a shopping list purchase against the campaign.
 *
 * Mirrors qmRecruit's pattern: equip on the model, log the transaction
 * in finances, refresh state, persist. Removes the entry from the list
 * after a successful buy.
 */
function buyShoppingItem(c, wb, idx) {
  if (!wb || !Array.isArray(wb.shoppingList)) return;
  const entry = wb.shoppingList[idx];
  if (!entry) return;
  const bal = getWarbandBalance(wb, c);
  const rows = qmShoppingRows(wb, bal);
  const row = rows.find(r => r.idx === idx);
  if (!row || !row.resolved) {
    alert('No se puede comprar: entrada no resuelta. Quítala de la lista.');
    return;
  }
  if (!row.affordable) {
    const have = row.currency === '☼' ? bal.glory : bal.ducados;
    if (!confirm(`No te llega para ${row.kit.name} (${row.cost} ${row.currency}, te quedan ${have}). ¿Comprarlo igual?`)) {
      return;
    }
  }
  // Equip: add the upgrade id to the model (mirrors the manual toggle in renderDetail).
  if (!Array.isArray(row.model.upgrades)) row.model.upgrades = [];
  if (!row.model.upgrades.includes(row.kit.id)) {
    row.model.upgrades.push(row.kit.id);
  }
  if (c) {
    // Campaign context: log transaction in campaign finances.
    const fin = ensureFinanceEntry(c, wb.id);
    fin.transactions.push({
      type: 'shopping-buy',
      ts: new Date().toISOString(),
      gameNumber: c.gameNumber || wb.gameNumber || null,
      modelUid: row.model.uid,
      kitId: row.kit.id,
      kitName: row.kit.name,
      cost: row.cost,
      currency: row.currency,
    });
  } else {
    // BACKLOG P1/3 — free context: debit the warband's strongbox and
    // log the purchase on wb.strongboxLog so the historial keeps the
    // same level of detail as campaign finances.
    if (!wb.strongbox) wb.strongbox = { ducados: 0, glory: 0 };
    if (row.currency === '☼') wb.strongbox.glory   -= row.cost;
    else                       wb.strongbox.ducados -= row.cost;
    if (!Array.isArray(wb.strongboxLog)) wb.strongboxLog = [];
    wb.strongboxLog.push({
      type: 'shopping-buy',
      ts: new Date().toISOString(),
      modelUid: row.model.uid,
      kitId: row.kit.id,
      kitName: row.kit.name,
      cost: row.cost,
      currency: row.currency,
    });
  }
  // Remove the entry and renumber.
  removeFromShoppingList(wb, idx);
  if (c) refreshAllWarbandStates(c);
  persistWarband(wb);
  if (c) persistCampaign(c);
  renderQM();
}

/* ----- Recruit tab: catalogue of units + mercenaries ----- */
function renderQMRecruit() {
  const pane = document.getElementById('qm-pane-recruit');
  const { warband: wb, campaign: c } = QM;
  const f = DATA.factions[wb.factionId];

  // Tier groups. Fase 9 — in free context filter out Glory Items so
  // glory-cost units don't show up. Today this tab is hidden in free,
  // but the filter stays as a defensive guard.
  const ctxName = c ? 'campaign' : 'free';
  const visibleUnits = filterUnitsForContext(f.units, ctxName);
  const tiers = { elite: [], troops: [] };
  visibleUnits.forEach(u => tiers[u.tier].push(u));

  // Canon Threshold info (when this band is tied to a campaign game)
  const totals = warbandTotals(wb);
  const gameRow = wb.gameNumber ? warbandThresholdForGame(wb.gameNumber) : null;
  let thresholdBlock = '';
  if (gameRow) {
    const overFs = wb.models.length >= gameRow.fieldStrength;
    const overBudget = totals.ducados >= gameRow.threshold;
    thresholdBlock = `
      <div class="qm-threshold-block ${overFs || overBudget ? 'qm-threshold-warn' : ''}">
        <div class="qm-threshold-title">🗓 Game ${gameRow.game} — Threshold canon</div>
        <div class="qm-threshold-row">
          <span>Coste actual:</span>
          <span class="${overBudget ? 'over' : ''}">${totals.ducados} / ${gameRow.threshold} 👑${overBudget ? ' ⚠' : ''}</span>
        </div>
        <div class="qm-threshold-row">
          <span>Field Strength:</span>
          <span class="${overFs ? 'over' : ''}">${wb.models.length} / ${gameRow.fieldStrength} mod.${overFs ? ' ⚠' : ''}</span>
        </div>
      </div>`;
  }

  let html = `<div class="qm-recruit-grid">
    <div>
      <div class="qm-recruit-section">
        <h4>★ Elite (de la facción)</h4>
        <div class="units-grid" id="qm-elite-grid"></div>
      </div>
      <div class="qm-recruit-section">
        <h4>⚔ Troops (de la facción)</h4>
        <div class="units-grid" id="qm-troops-grid"></div>
      </div>
      <div class="qm-recruit-section">
        <h4>☼ Mercenarios</h4>
        <div class="units-grid" id="qm-merc-grid"></div>
      </div>
    </div>
    <div>
      ${thresholdBlock}
      <div class="qm-recruit-section">
        <h4>ℹ Info</h4>
        <div style="font-family:var(--font-mono);font-size:0.72rem;color:var(--parchment-dim);line-height:1.5;">
          Los modelos reclutados aquí se añaden a la banda y aparecerán en el roster de campaña.<br><br>
          Los costes se restan automáticamente del balance disponible. Los límites de banda (1, 0-2, 0-5...) y restricciones de unidad se respetan.<br><br>
          ${gameRow ? `<strong style="color:var(--faithful-gold);">Threshold canon Game ${gameRow.game}:</strong> ${gameRow.threshold} 👑 / ${gameRow.fieldStrength} modelos. Si excedes uno de estos, la banda no podrá desplegar legalmente esa partida (canon page 98).<br><br>` : ''}
          Para equipar a un modelo recién reclutado, ve a la pestaña "Roster" y selecciónalo.
        </div>
      </div>
    </div>
  </div>`;
  pane.innerHTML = html;

  const renderUnit = (u, container, isMerc) => {
    const can = canAddUnit(wb, u);
    const card = el('div', 'unit-card');
    card.dataset.tier = u.tier || 'mercenary';
    if (!can) card.dataset.disabled = 'true';
    const count = unitCountInWarband(wb, u.id);
    const lim = parseLimit(u.limit);
    const limitTxt = u.limit ? `${u.limit}` + (lim ? ` (${count}/${lim.max})` : '') : (u.limitPerUnit ? perUnitLimitText(wb, u) : 'sin límite');
    const costStr = u.costAlt ? `${u.cost}/${u.costAlt} ${u.currency}` : `${u.cost} ${u.currency}`;
    // Anticipate threshold/field-strength impact for the recruit-card
    let thresholdHint = '';
    if (gameRow && can) {
      const newCost = totals.ducados + (u.currency === '👑' ? u.cost : 0);
      const newCount = wb.models.length + 1;
      const willExceedBudget = newCost > gameRow.threshold;
      const willExceedFs = newCount > gameRow.fieldStrength;
      if (willExceedBudget || willExceedFs) {
        thresholdHint = `<span class="qm-threshold-hint" title="Reclutar excede el threshold canon de Game ${gameRow.game}">⚠</span>`;
      }
    }
    card.innerHTML = `
      <div class="unit-row">
        <div class="unit-name">${u.name}${thresholdHint}</div>
        <div class="unit-cost">${costStr}</div>
      </div>
      <div class="unit-meta">
        ${u.tier ? `<span class="tier">${u.tier}</span>` : '<span class="tier">mercenary</span>'}
        <span class="limit">${limitTxt}</span>
      </div>
    `;
    if (can) {
      card.addEventListener('click', () => qmRecruit(u, isMerc));
    }
    container.appendChild(card);
  };
  tiers.elite.forEach(u  => renderUnit(u, document.getElementById('qm-elite-grid'),  false));
  tiers.troops.forEach(u => renderUnit(u, document.getElementById('qm-troops-grid'), false));
  DATA.mercenaries.forEach(u => renderUnit(u, document.getElementById('qm-merc-grid'), true));
}

function qmRecruit(unit, isMerc) {
  const { campaign: c, warband: wb } = QM;
  // Check budget
  const bal = campaignBalance(c, wb.id);
  const cost = unit.currency === '👑' ? unit.cost : 0;
  const gloryCost = unit.currency === '☼' ? unit.cost : 0;
  if ((cost > 0 && cost > bal.ducados) || (gloryCost > 0 && gloryCost > bal.glory)) {
    if (!confirm(`No te llega para ${unit.name} (cuesta ${unit.cost} ${unit.currency}, te quedan ${unit.currency === '👑' ? bal.ducados : bal.glory}). ¿Reclutarlo igual y dejar el balance en negativo?`)) {
      return;
    }
  }
  // Threshold canon check (page 98): warn if recruiting would exceed the
  // game's threshold or field strength. Don't block — the user may want to
  // build ahead and trim before deploying.
  if (wb.gameNumber) {
    const row = warbandThresholdForGame(wb.gameNumber);
    if (row) {
      const totals = warbandTotals(wb);
      const newCost = totals.ducados + cost;
      const newCount = wb.models.length + 1;
      const overBudget = newCost > row.threshold;
      const overFs = newCount > row.fieldStrength;
      if (overBudget || overFs) {
        const lines = [];
        if (overBudget) lines.push(`Coste subiría a ${newCost} 👑 (threshold canon Game ${row.game}: ${row.threshold} 👑).`);
        if (overFs)     lines.push(`Modelos subirían a ${newCount} (Field Strength canon Game ${row.game}: ${row.fieldStrength}).`);
        const msg = `Reclutar ${unit.name} excedería el threshold canon de Game ${row.game}.\n\n${lines.join('\n')}\n\nLa banda no podrá desplegar legalmente esa partida hasta que reduzcas. ¿Reclutar igualmente?`;
        if (!confirm(msg)) return;
      }
    }
  }
  // Add to roster
  const model = {
    uid: uid(),
    unitId: unit.id,
    customName: null,
    battlekit: [],
    notes: '',
    isMercenary: !!isMerc,
  };
  if (unit.costAlt) model.costVariant = 'base';
  wb.models.push(model);
  persistWarband(wb);
  // Log transaction
  const fin = ensureFinanceEntry(c, wb.id);
  fin.transactions.push({
    type: 'recruit',
    ts: new Date().toISOString(),
    gameNumber: c.gameNumber || wb.gameNumber || null,
    modelUid: model.uid,
    unitName: unit.name,
    cost: unit.cost,
    currency: unit.currency,
  });
  refreshAllWarbandStates(c);
  persistCampaign(c);
  renderQM();
}

/* ----- Roster tab: edit/sell models + battlekit ----- */
function renderQMRoster() {
  const pane = document.getElementById('qm-pane-roster');
  const { campaign: c, warband: wb } = QM;
  const st = c.warbandStates[wb.id] || emptyWarbandState();

  if (!wb.models.length) {
    pane.innerHTML = `<div class="detail-empty">La banda no tiene modelos. Recluta unos primero en la pestaña "Reclutar".</div>`;
    return;
  }

  let html = `<div class="qm-roster-list" id="qm-roster-list-el"></div>`;
  pane.innerHTML = html;
  const list = document.getElementById('qm-roster-list-el');

  for (const m of wb.models) {
    const u = getUnit(wb.factionId, m.unitId);
    if (!u) continue;
    const ms = st.modelStates[m.uid] || emptyModelState();
    const isDead = ms.status === 'dead';
    const cost = modelCost(m, wb.factionId, wb);
    const card = el('div', 'qm-roster-card' + (isDead ? ' dead' : ''));
    card.innerHTML = `
      <div class="qm-roster-card-row1">
        <div>
          <div class="prog-name">${m.customName || u.name}</div>
          <div class="roster-unit-name">${u.name}${isDead ? ' · MUERTO' : ''}</div>
        </div>
        <div class="roster-cost">${cost.ducados ? cost.ducados+' 👑' : ''}${cost.ducados && cost.glory ? ' · ' : ''}${cost.glory ? cost.glory+' ☼' : ''}</div>
      </div>
      <div class="qm-equip-list" id="equip-${m.uid}"></div>
      <div class="qm-roster-actions">
        <button class="btn btn-icon" data-action="equip" data-uid="${m.uid}" ${isDead ? 'disabled' : ''}>+ Equipar</button>
        <button class="btn btn-icon btn-danger" data-action="sell" data-uid="${m.uid}">💰 Vender (${Math.round((c.saleRefundRatio ?? 0.5)*100)}%)</button>
      </div>
    `;
    list.appendChild(card);

    // Render battlekit list
    const equipEl = card.querySelector(`#equip-${m.uid}`);
    if (m.battlekit && m.battlekit.length) {
      for (const kid of m.battlekit) {
        const it = findBattlekitItem(wb.factionId, kid, wb);
        if (!it) continue;
        const row = el('div', 'qm-equip-row');
        row.innerHTML = `
          <span>${it.name} <span style="color:var(--parchment-dim);">${it.cost} ${it.currency}</span></span>
          <button class="sell-link" data-sell-equip data-uid="${m.uid}" data-kit="${kid}">vender ${Math.round((c.saleRefundRatio ?? 0.5)*100)}%</button>
        `;
        equipEl.appendChild(row);
      }
    } else {
      equipEl.innerHTML = `<span style="color:var(--parchment-dim);font-style:italic;">Sin equipo añadido</span>`;
    }

    card.querySelector('[data-action="equip"]').addEventListener('click', () => qmOpenEquipDialog(m));
    card.querySelector('[data-action="sell"]').addEventListener('click', () => qmSellModel(m));
    card.querySelectorAll('[data-sell-equip]').forEach(b => {
      b.addEventListener('click', () => qmSellEquipment(m, b.dataset.kit));
    });
  }
}

function qmSellModel(model) {
  const { campaign: c, warband: wb } = QM;
  const u = getUnit(wb.factionId, model.unitId);
  const cost = modelCost(model, wb.factionId, wb);
  const ratio = c.saleRefundRatio ?? 0.5;
  const refundD = Math.round(cost.ducados * ratio);
  const refundG = Math.round(cost.glory * ratio);
  confirmModal({
    title: 'Vender modelo',
    message: `¿Vender ${model.customName || u.name}? Recuperarás ${refundD} 👑${refundG ? ' · ' + refundG + ' ☼' : ''} (${Math.round(ratio*100)}% del coste).`,
    confirmText: 'Vender',
    onConfirm: () => {
      // Log transactions for refund. Include originalCost so balance does not double-count.
      const fin = ensureFinanceEntry(c, wb.id);
      const gameNum = c.gameNumber || wb.gameNumber || null;
      if (cost.ducados > 0) {
        fin.transactions.push({
          type: 'sale-model', ts: new Date().toISOString(),
          gameNumber: gameNum,
          modelUid: model.uid, unitName: u.name,
          refund: refundD, originalCost: cost.ducados, currency: '👑',
        });
      }
      if (cost.glory > 0) {
        fin.transactions.push({
          type: 'sale-model', ts: new Date().toISOString(),
          gameNumber: gameNum,
          modelUid: model.uid, unitName: u.name,
          refund: refundG, originalCost: cost.glory, currency: '☼',
        });
      }
      // Remove model from roster
      wb.models = wb.models.filter(x => x.uid !== model.uid);
      persistWarband(wb);
      refreshAllWarbandStates(c);
      persistCampaign(c);
      renderQM();
    }
  });
}

function qmSellEquipment(model, kid) {
  const { campaign: c, warband: wb } = QM;
  const item = findBattlekitItem(wb.factionId, kid, wb);
  if (!item) return;
  const ratio = c.saleRefundRatio ?? 0.5;
  const refund = Math.round(item.cost * ratio);
  confirmModal({
    title: 'Vender equipo',
    message: `¿Vender ${item.name}? Recuperarás ${refund} ${item.currency} (${Math.round(ratio*100)}% del coste).`,
    confirmText: 'Vender',
    onConfirm: () => {
      const fin = ensureFinanceEntry(c, wb.id);
      fin.transactions.push({
        type: 'sale-equipment', ts: new Date().toISOString(),
        gameNumber: c.gameNumber || wb.gameNumber || null,
        modelUid: model.uid, kitId: kid, kitName: item.name,
        refund, originalCost: item.cost, currency: item.currency,
      });
      // Remove kit from model
      model.battlekit = (model.battlekit || []).filter(x => x !== kid);
      persistWarband(wb);
      refreshAllWarbandStates(c);
      persistCampaign(c);
      renderQM();
    }
  });
}

// Open a temporary modal/dialog to select battlekit for a model.
// We reuse the legality engine via classifyBattlekitItem.
function qmOpenEquipDialog(model) {
  const { campaign: c, warband: wb } = QM;
  const unit = getUnit(wb.factionId, model.unitId);
  const f = DATA.factions[wb.factionId];

  // Build a simple inline dialog inside the roster pane
  const card = document.querySelector(`.qm-roster-card [data-uid="${model.uid}"][data-action="equip"]`)?.closest('.qm-roster-card');
  if (!card) return;

  // Toggle: if dialog already open in this card, close it
  const existing = card.querySelector('.qm-equip-dialog');
  if (existing) { existing.remove(); return; }

  const dialog = el('div', 'qm-equip-dialog');
  dialog.style.cssText = 'margin-top:0.6rem;padding-top:0.5rem;border-top:1px solid var(--rust);max-height:340px;overflow-y:auto;';

  const cats = [
    ['ranged', 'Ranged'], ['melee', 'Melee'], ['grenades', 'Grenades'],
    ['shields', 'Shields'], ['armour', 'Armour'], ['equipment', 'Equipment'],
  ];
  let html = '';
  let totalAvail = 0;
  for (const [key, label] of cats) {
    const items = armouryItemsForWarband(wb, key);
    if (!items.length) continue;
    const classified = items.map(it => ({ item: it, cls: classifyBattlekitItem(it, model, unit, wb) }));
    const visible = classified.filter(x => x.cls.state !== 'hidden');
    if (!visible.length) continue;
    const avail = visible.filter(x => x.cls.state === 'available' || x.cls.state === 'equipped').length;
    totalAvail += avail;
    html += `<h4 style="margin-top:0.6rem;">${label} <span class="bk-cat-count">${avail} disp.</span></h4>`;
    for (const { item, cls } of visible) {
      const stateClass = cls.state;
      const reasonHTML = cls.state === 'disabled' ? `<div class="bk-reason">${cls.reason}</div>` : '';
      html += `
        <div class="battlekit-item ${stateClass}" data-kit="${item.id}" data-state="${cls.state}">
          <div class="bk-main">
            <div class="bk-line">
              <span class="bk-name">${item.name}</span>
              ${item.restriction ? `<span class="bk-restriction">${item.restriction}</span>` : ''}
            </div>
            ${reasonHTML}
          </div>
          <span class="bk-cost ${item.currency==='☼'?'glory':''}">${item.cost} ${item.currency}</span>
        </div>
      `;
    }
  }
  if (totalAvail === 0 && !(model.battlekit||[]).length) {
    html = `<div class="notice info">No hay equipo disponible para esta unidad.</div>`;
  }
  dialog.innerHTML = html;
  card.appendChild(dialog);

  dialog.querySelectorAll('.battlekit-item').forEach(it => {
    it.addEventListener('click', () => {
      if (it.dataset.state === 'disabled') return;
      const kid = it.dataset.kit;
      const item = findBattlekitItem(wb.factionId, kid, wb);
      if (!item) return;
      const wasEquipped = (model.battlekit || []).includes(kid);
      if (wasEquipped) {
        // Unequipping in QM context = sell at refund
        qmSellEquipment(model, kid);
        return;
      }
      // Buy: check budget
      const bal = campaignBalance(c, wb.id);
      if (item.currency === '👑' && item.cost > bal.ducados) {
        if (!confirm(`No te llega para ${item.name} (cuesta ${item.cost} 👑, te quedan ${bal.ducados}). ¿Comprar igual?`)) return;
      }
      if (item.currency === '☼' && item.cost > bal.glory) {
        if (!confirm(`No te llega para ${item.name} (cuesta ${item.cost} ☼, te quedan ${bal.glory}). ¿Comprar igual?`)) return;
      }
      model.battlekit = model.battlekit || [];
      model.battlekit.push(kid);
      // Log transaction
      const fin = ensureFinanceEntry(c, wb.id);
      fin.transactions.push({
        type: 'buy-equipment', ts: new Date().toISOString(),
        gameNumber: c.gameNumber || wb.gameNumber || null,
        modelUid: model.uid, kitId: kid, kitName: item.name,
        cost: item.cost, currency: item.currency,
      });
      persistWarband(wb);
      refreshAllWarbandStates(c);
      persistCampaign(c);
      renderQM();
    });
  });
}

/* ----- Status tab: campaign-aware overview of the warband ----- */
function renderQMStatus() {
  const pane = document.getElementById('qm-pane-status');
  const { campaign: c, warband: wb } = QM;

  // Aggregates
  const eliteCount = countEliteInWarband(wb);
  const elig = eligibleForPromotion(wb);
  const slotsLeft = Math.max(0, CAMPAIGN_TABLES.promotionRules.maxElites - eliteCount);
  const gameRow = wb.gameNumber ? warbandThresholdForGame(wb.gameNumber) : null;
  const totals = warbandTotals(wb);
  // Glorious Deeds total: include both manual entries and wizard-recorded
  // feats from the campaign's battles.
  const gloriousDeeds = countGloriousDeeds(wb, undefined, c);

  // Models in special states
  const dead = [], captured = [], unfit = [], limitedAtCap = [];
  const promotedList = [];
  for (const m of wb.models) {
    const u = getUnit(wb.factionId, m.unitId);
    const name = m.customName || u?.name || '?';
    const bp = m.baseProgression;
    if (bp?.promotedToElite) promotedList.push({ name, m, u });
    if (!bp) continue;
    if (bp.status === 'dead') dead.push({ name, m });
    else if (bp.status === 'captured') captured.push({ name, m });
    const traumaScars = (bp.scars || []).filter(s => s.source === 'trauma').length;
    if (traumaScars >= unfitScarThreshold(m)) unfit.push({ name, count: traumaScars, m });
    const cap = xpCapFor(wb.factionId, m.unitId);
    if (cap !== Infinity && (bp.xp || 0) >= cap) limitedAtCap.push({ name, cap, m });
  }

  let html = '<div class="qm-status-grid">';

  // ---- Game / Threshold card ----
  if (gameRow) {
    const overFs = wb.models.length > gameRow.fieldStrength;
    const overBudget = totals.ducados > gameRow.threshold;
    html += `
      <div class="qm-status-card${overFs || overBudget ? ' qm-status-warn' : ''}">
        <div class="qm-status-card-title">🗓 Game ${gameRow.game}</div>
        <div class="qm-status-row">
          <span class="qm-status-label">Threshold canon</span>
          <span class="qm-status-value">${gameRow.threshold} 👑</span>
        </div>
        <div class="qm-status-row">
          <span class="qm-status-label">Coste actual</span>
          <span class="qm-status-value ${overBudget ? 'over' : ''}">${totals.ducados} 👑${overBudget ? ' ⚠' : ''}</span>
        </div>
        <div class="qm-status-row">
          <span class="qm-status-label">Field Strength</span>
          <span class="qm-status-value">${gameRow.fieldStrength} mod.</span>
        </div>
        <div class="qm-status-row">
          <span class="qm-status-label">Modelos actuales</span>
          <span class="qm-status-value ${overFs ? 'over' : ''}">${wb.models.length} mod.${overFs ? ' ⚠' : ''}</span>
        </div>
      </div>`;
  } else {
    html += `
      <div class="qm-status-card">
        <div class="qm-status-card-title">🗓 Sin Game asignado</div>
        <div class="qm-status-empty">Asigna un Game number a la banda en el editor para activar el threshold canon.</div>
      </div>`;
  }

  // ---- Elite composition card ----
  html += `
    <div class="qm-status-card">
      <div class="qm-status-card-title">★ Composición ELITE</div>
      <div class="qm-status-row">
        <span class="qm-status-label">ELITE actuales</span>
        <span class="qm-status-value">${eliteCount} / ${CAMPAIGN_TABLES.promotionRules.maxElites}</span>
      </div>
      <div class="qm-status-row">
        <span class="qm-status-label">Plazas libres</span>
        <span class="qm-status-value">${slotsLeft}</span>
      </div>
      <div class="qm-status-row">
        <span class="qm-status-label">Troops elegibles</span>
        <span class="qm-status-value">${elig.length}</span>
      </div>
      <div class="qm-status-row">
        <span class="qm-status-label">Glorious Deeds</span>
        <span class="qm-status-value">${gloriousDeeds} (Pool ${promotionPoolSize(gloriousDeeds, wb)} dado${promotionPoolSize(gloriousDeeds, wb)===1?'':'s'})</span>
      </div>
      ${(elig.length > 0 && slotsLeft > 0) ? `
        <button class="qm-status-action" id="qm-promote-step">🎲 Iniciar Promotion Step</button>
      ` : (slotsLeft === 0
            ? `<div class="qm-status-empty">Banda al máximo de ELITE (canon: ${CAMPAIGN_TABLES.promotionRules.maxElites}).</div>`
            : `<div class="qm-status-empty">Sin Troops elegibles para promoción.</div>`)}
    </div>`;

  // ---- Promoted list card ----
  if (promotedList.length) {
    html += `
      <div class="qm-status-card">
        <div class="qm-status-card-title">★ Promocionados en campaña</div>
        ${promotedList.map(p => `
          <div class="qm-status-row">
            <span class="qm-status-label">★ ${p.name}</span>
            <span class="qm-status-value" style="font-size:0.7rem;opacity:0.7;">${p.u?.name || ''}</span>
          </div>`).join('')}
      </div>`;
  }

  // ---- Attention list card ----
  const attentionItems = [];
  if (dead.length)         attentionItems.push({ icon:'💀', label:'Muertos', list: dead });
  if (captured.length)     attentionItems.push({ icon:'🔒', label:'Capturados', list: captured });
  if (unfit.length)        attentionItems.push({
    icon:'⚠', label:'Unfit for Duty (3+ scars)',
    list: unfit.map(x => ({ name: `${x.name} (${x.count} cicatrices)` })),
  });
  if (limitedAtCap.length) attentionItems.push({
    icon:'🎯', label:'En cap de Limited Potential',
    list: limitedAtCap.map(x => ({ name: `${x.name} (${x.cap} XP / ${x.cap})` })),
  });
  if (attentionItems.length) {
    html += `
      <div class="qm-status-card qm-status-warn">
        <div class="qm-status-card-title">⚠ Modelos que requieren atención</div>
        ${attentionItems.map(g => `
          <div class="qm-status-attention-group">
            <div class="qm-status-attention-label">${g.icon} ${g.label}</div>
            ${g.list.map(x => `<div class="qm-status-attention-item">• ${x.name}</div>`).join('')}
          </div>`).join('')}
      </div>`;
  }

  html += '</div>';

  // P2/7 — In free context, expose a retro-fill button so the user
  // can rebuild wb.strongbox from past free battles (useful after
  // manual edits or for bands that pre-date P1/3).
  if (!c) {
    const computed = (Array.isArray(wb.freeBattles) ? wb.freeBattles : [])
      .reduce((acc, fb) => {
        acc.d += (fb && typeof fb.loot  === 'number') ? fb.loot  : 0;
        acc.g += (fb && typeof fb.glory === 'number') ? fb.glory : 0;
        return acc;
      }, { d: 0, g: 0 });
    const current = wb.strongbox || { ducados: 0, glory: 0 };
    const drifted = current.ducados !== computed.d || current.glory !== computed.g;
    html += `<div class="detail-section" style="margin-top:1rem;">
      <div class="detail-label">Strongbox (libre)</div>
      <div style="font-size:0.85rem;color:var(--parchment-dim);">
        Actual: ${current.ducados} 👑 · ${current.glory} ☼ &nbsp;|&nbsp;
        Suma freeBattles: ${computed.d} 👑 · ${computed.g} ☼
      </div>
      ${drifted ? `<div style="font-size:0.8rem;color:var(--fallen-blood-bright);margin-top:0.3rem;">
        ⚠ Hay drift entre el strongbox y la suma de batallas libres. Probablemente por compras pasadas o edición manual.
      </div>` : ''}
      <div style="margin-top:0.5rem;">
        <button class="btn" id="qm-strongbox-rebuild" type="button"
                title="Reconstruye el strongbox sumando fb.loot/fb.glory de todas las freeBattles. Sobrescribe el valor actual.">
          ↻ Reconstruir desde freeBattles
        </button>
      </div>
    </div>`;
  }

  // P2/7 — Temp bonuses panel. Renders active wb.tempBonuses with
  // scope + source so the player knows what's still in play. The
  // decay logic lives in applyWizardOutcomesToWarband (Fase 5.7);
  // this is read-only display.
  const tb = Array.isArray(wb.tempBonuses) ? wb.tempBonuses : [];
  if (tb.length) {
    html += `<div class="detail-section" style="margin-top:1rem;">
      <div class="detail-label">Bonuses temporales activos</div>
      <div style="display:flex;flex-direction:column;gap:0.4rem;margin-top:0.4rem;">
        ${tb.map(b => {
          const scopeLabel = b.scope === 'next-game' ? 'próxima batalla' : (b.scope || 'permanente');
          const payload = (b.kind === 'morale-bonus' && typeof b.dice === 'number')
            ? `+${b.dice} dado${b.dice === 1 ? '' : 's'} a Morale Checks`
            : b.kind;
          return `<div style="font-size:0.85rem;">
            <strong>${payload}</strong>
            <span style="color:var(--parchment-dim);"> · ${scopeLabel}</span>
            ${b.sourceBattleId ? `<span style="color:var(--parchment-dim);font-family:var(--font-mono);font-size:0.75rem;"> · ${b.sourceBattleId}</span>` : ''}
          </div>`;
        }).join('')}
      </div>
      <div style="font-size:0.75rem;color:var(--parchment-dim);margin-top:0.4rem;">
        Los bonuses con scope <em>próxima batalla</em> decaen automáticamente tras guardar la siguiente batalla.
      </div>
    </div>`;
  }

  pane.innerHTML = html;

  // P2/7 — wire the strongbox rebuild button (only present in free).
  const rebuildBtn = pane.querySelector('#qm-strongbox-rebuild');
  if (rebuildBtn) {
    rebuildBtn.addEventListener('click', () => {
      confirmModal({
        title: 'Reconstruir strongbox',
        message: `Esto sobrescribe el strongbox de "${wb.name || wb.id}" con la suma de loot/glory de todas las partidas libres registradas. ¿Continuar?`,
        confirmText: 'Reconstruir',
        onConfirm: () => {
          rebuildStrongboxFromFreeBattles(wb);
          persistWarband(wb);
          renderQM();
        },
      });
    });
  }

  // Wire up the promotion button if present
  const promoBtn = pane.querySelector('#qm-promote-step');
  if (promoBtn) {
    promoBtn.addEventListener('click', () => {
      openPromotionModal(wb, (promotedListResult) => {
        for (const m of promotedListResult) promoteModel(m);
        persistWarband(wb);
        refreshAllWarbandStates(c);
        persistCampaign(c);
        renderQM();
      });
    });
  }
}

/* ----- Log tab ----- */
function renderQMLog() {
  const pane = document.getElementById('qm-pane-log');
  const { campaign: c, warband: wb } = QM;
  const fin = ensureFinanceEntry(c, wb.id);
  const txs = (fin.transactions || []).slice().sort((a,b) => b.ts.localeCompare(a.ts));
  if (!txs.length) {
    pane.innerHTML = `<div class="detail-empty">Sin transacciones todavía. Cuando reclutes, equipes o vendas aquí, las verás listadas.</div>`;
    return;
  }
  let html = '';
  for (const tx of txs) {
    const date = new Date(tx.ts).toLocaleString();
    let icon, type, desc, amount, amountClass;
    if (tx.type === 'recruit') {
      icon = '⊕'; type = 'Recluta'; desc = tx.unitName;
      amount = `−${tx.cost} ${tx.currency}`; amountClass = 'cost';
    } else if (tx.type === 'buy-equipment') {
      icon = '🛒'; type = 'Equipo'; desc = `${tx.kitName}`;
      amount = `−${tx.cost} ${tx.currency}`; amountClass = 'cost';
    } else if (tx.type === 'sale-model') {
      icon = '💰'; type = 'Venta'; desc = `${tx.unitName}`;
      amount = `+${tx.refund} ${tx.currency}`; amountClass = 'refund';
    } else if (tx.type === 'sale-equipment') {
      icon = '💰'; type = 'Venta equipo'; desc = `${tx.kitName}`;
      amount = `+${tx.refund} ${tx.currency}`; amountClass = 'refund';
    } else { icon = '?'; type = tx.type; desc = ''; amount = ''; amountClass = ''; }
    html += `
      <div class="qm-log-entry">
        <div class="qm-log-type">${icon} ${type}</div>
        <div>${desc} <span style="color:var(--parchment-dim);font-size:0.65rem;">${date}</span></div>
        <div class="qm-log-amount ${amountClass}">${amount}</div>
      </div>
    `;
  }
  pane.innerHTML = html;
}

/* ----- QM event bindings ----- */
document.querySelectorAll('.qm-tab').forEach(t => {
  t.addEventListener('click', () => {
    if (!QM) return;
    QM.tab = t.dataset.qmtab;
    renderQM();
  });
});
document.getElementById('qm-close').addEventListener('click', () => closeQuartermaster());
// Click outside to close
document.getElementById('modal-quartermaster').addEventListener('click', (e) => {
  if (e.target.id === 'modal-quartermaster') closeQuartermaster();
});

/* ----- Campaign action buttons in header ----- */
document.getElementById('btn-new-campaign').addEventListener('click', () => {
  document.getElementById('new-campaign-name').value = '';
  document.getElementById('new-campaign-desc').value = '';
  openModal('modal-new-campaign');
});
document.getElementById('btn-do-new-campaign').addEventListener('click', () => {
  const name = document.getElementById('new-campaign-name').value.trim();
  const desc = document.getElementById('new-campaign-desc').value.trim();
  if (!name) { alert('Necesitas un nombre.'); return; }
  const c = newCampaign(name);
  c.description = desc;
  persistCampaign(c);
  STATE.currentCampaign = c;
  STATE.selectedCampaignWarbandId = null;
  STATE.selectedBattleId = null;
  localStorage.setItem(STORAGE_CURRENT_CAMPAIGN, c.id);
  closeModal('modal-new-campaign');
  renderCampaignMode();
});

document.getElementById('btn-add-warband-to-camp').addEventListener('click', () => {
  const c = STATE.currentCampaign;
  if (!c) { alert('Crea primero una campaña.'); return; }
  const list = document.getElementById('add-warband-list');
  const idx = loadIndex().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  const available = idx.filter(e => !c.warbandIds.includes(e.id));
  if (!available.length) {
    list.innerHTML = `<div class="detail-empty">No hay bandas guardadas que añadir. Crea bandas en el modo "Banda" primero.</div>`;
  } else {
    list.innerHTML = '';
    for (const entry of available) {
      const f = DATA.factions[entry.factionId];
      const wb = loadWarband(entry.id);
      const baseBudget = wb ? (wb.budgetTotal || 700) : 700;
      const baseGlory  = wb ? (wb.startingGlory || 0) : 0;
      const item = el('div', 'warband-list-item');
      item.style.flexDirection = 'column';
      item.style.alignItems = 'stretch';
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div class="name">${entry.name}</div>
            <div class="meta">${f ? f.shortName : entry.factionId} · ${entry.models} modelos · ${new Date(entry.updatedAt).toLocaleDateString()}</div>
          </div>
        </div>
        <div style="display:flex;gap:0.4rem;align-items:center;margin-top:0.4rem;font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment-dim);">
          Empieza con:
          <input type="number" min="0" max="9999" data-start-d value="${baseBudget}" style="width:70px;background:var(--ink-black);color:var(--parchment-bright);border:1px solid var(--rust);padding:0.2rem 0.3rem;font-family:var(--font-mono);" />
          <span class="budget-unit">👑</span>
          <input type="number" min="0" max="999" data-start-g value="${baseGlory}" style="width:55px;background:var(--ink-black);color:var(--parchment-bright);border:1px solid var(--rust);padding:0.2rem 0.3rem;font-family:var(--font-mono);" />
          <span class="budget-unit">☼</span>
          <button class="btn btn-primary" data-add style="margin-left:auto;">+ Añadir</button>
        </div>
      `;
      item.querySelector('[data-add]').addEventListener('click', () => {
        const startD = parseInt(item.querySelector('[data-start-d]').value, 10);
        const startG = parseInt(item.querySelector('[data-start-g]').value, 10);
        c.warbandIds.push(entry.id);
        // If override differs from the warband's own values, store as override
        const fin = ensureFinanceEntry(c, entry.id);
        if (Number.isFinite(startD) && startD !== baseBudget) fin.startingDucatsOverride = startD;
        if (Number.isFinite(startG) && startG !== baseGlory)  fin.startingGloryOverride  = startG;
        refreshAllWarbandStates(c);
        persistCampaign(c);
        STATE.selectedCampaignWarbandId = entry.id;
        closeModal('modal-add-warband');
        renderCampaignMode();
      });
      list.appendChild(item);
    }
  }
  openModal('modal-add-warband');
});

document.getElementById('btn-record-battle').addEventListener('click', () => {
  startWizard();
});

document.getElementById('btn-campaign-settings').addEventListener('click', () => {
  if (!STATE.currentCampaign) { alert('Selecciona o crea una campaña primero.'); return; }
  openRewardDefaultsModal();
});

document.getElementById('btn-delete-campaign').addEventListener('click', () => {
  const c = STATE.currentCampaign;
  if (!c) return;
  const battleCount = (c.battles || []).length;
  const wbCount = (c.warbandIds || []).length;
  // Fase 8 — delete with conversion. The campaign disappears but each
  // participating warband gets its battles back as free-battle entries.
  confirmModal({
    title: 'Eliminar campaña',
    message: `¿Eliminar "${c.name}"?\n\n` +
             `${battleCount} batalla${battleCount === 1 ? '' : 's'} se convertirá${battleCount === 1 ? '' : 'n'} en ` +
             `partidas libres de las ${wbCount} banda${wbCount === 1 ? '' : 's'} participante${wbCount === 1 ? '' : 's'}. ` +
             `Los XP, scars y advancements aplicados ya están en las bandas — se conservan. La estructura de campaña sí desaparece.`,
    confirmText: 'Eliminar y convertir',
    onConfirm: () => {
      deleteCampaignWithConversion(c);
      STATE.currentCampaign = null;
      STATE.selectedCampaignWarbandId = null;
      STATE.selectedBattleId = null;
      localStorage.removeItem(STORAGE_CURRENT_CAMPAIGN);
      renderCampaignMode();
    }
  });
});

/* ----- Reward defaults modal ----- */
function openRewardDefaultsModal() {
  const c = STATE.currentCampaign;
  if (!c) return;
  const d = c.rewardDefaults || { win:{ducados:50,glory:1}, draw:{ducados:30,glory:0}, loss:{ducados:20,glory:0} };
  document.getElementById('rd-win-d').value  = d.win.ducados;
  document.getElementById('rd-win-g').value  = d.win.glory;
  document.getElementById('rd-draw-d').value = d.draw.ducados;
  document.getElementById('rd-draw-g').value = d.draw.glory;
  document.getElementById('rd-loss-d').value = d.loss.ducados;
  document.getElementById('rd-loss-g').value = d.loss.glory;
  document.getElementById('rd-sale-pct').value = Math.round((c.saleRefundRatio ?? 0.5) * 100);
  openModal('modal-reward-defaults');
}
document.getElementById('btn-save-reward-defaults').addEventListener('click', () => {
  const c = STATE.currentCampaign;
  if (!c) return;
  const num = (id, def=0) => {
    const v = parseInt(document.getElementById(id).value, 10);
    return Number.isFinite(v) && v >= 0 ? v : def;
  };
  c.rewardDefaults = {
    win:  { ducados: num('rd-win-d',50),  glory: num('rd-win-g',1)  },
    draw: { ducados: num('rd-draw-d',30), glory: num('rd-draw-g',0) },
    loss: { ducados: num('rd-loss-d',20), glory: num('rd-loss-g',0) },
  };
  c.saleRefundRatio = Math.max(0, Math.min(100, num('rd-sale-pct', 50))) / 100;
  persistCampaign(c);
  closeModal('modal-reward-defaults');
  // If wizard is open, re-render so new defaults appear
  if (WIZARD) renderWizardStep();
});


