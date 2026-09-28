/* ======================================================================
   CAMPAIGN UI
   ====================================================================== */

function renderCampaignMode() {
  renderCampaignList();
  renderCampaignCenter();
  renderCampaignDetail();
  // Status line
  const c = STATE.currentCampaign;
  document.getElementById('campaign-status').textContent =
    c ? `${c.warbandIds.length} bandas · ${c.battles.length} batallas` : 'Sin campaña';
  renderCampaignBreadcrumb();
}

function renderCampaignList() {
  const container = document.getElementById('panel-catalogue');
  container.innerHTML = `
    <h2 class="panel-title">Campañas</h2>
    <p class="panel-subtitle">Crónicas de la Gran Cruzada</p>
    <div id="campaign-list"></div>
  `;
  const listEl = document.getElementById('campaign-list');
  const idx = loadCampaignIndex().sort((a,b) => b.updatedAt.localeCompare(a.updatedAt));
  if (!idx.length) {
    listEl.innerHTML = `
      <div class="detail-empty" style="padding:1rem 0;">
        Sin campañas guardadas. Pulsa "Nueva Campaña" para crear la primera.
      </div>`;
    return;
  }
  for (const entry of idx) {
    const card = el('div', 'campaign-card');
    if (STATE.currentCampaign && STATE.currentCampaign.id === entry.id) card.classList.add('selected');
    card.innerHTML = `
      <div class="campaign-card-name">${entry.name || '(Sin nombre)'}</div>
      <div class="campaign-card-meta">${entry.warbands} bandas · ${entry.battles} batallas · ${new Date(entry.updatedAt).toLocaleDateString()}</div>
    `;
    card.addEventListener('click', () => selectCampaign(entry.id));
    listEl.appendChild(card);
  }
}

function selectCampaign(id) {
  const c = loadCampaign(id);
  if (!c) return;
  refreshAllWarbandStates(c);
  STATE.currentCampaign = c;
  STATE.selectedCampaignWarbandId = c.warbandIds[0] || null;
  STATE.selectedBattleId = null;
  localStorage.setItem(STORAGE_CURRENT_CAMPAIGN, c.id);
  renderCampaignMode();
}

function renderCampaignCenter() {
  const container = document.getElementById('panel-roster');
  const c = STATE.currentCampaign;
  if (!c) {
    container.innerHTML = `
      <div class="roster-empty">
        <h2>SIN CAMPAÑA</h2>
        <p>Crea o selecciona una campaña para empezar a registrar batallas, glory, XP y bajas.</p>
      </div>`;
    return;
  }

  let html = `
    <div class="roster-header">
      <div style="flex:1;">
        <input type="text" class="warband-name-input" id="campaign-name-input" value="${(c.name||'').replace(/"/g,'&quot;')}" placeholder="Nombre de campaña…" />
        <div class="warband-meta">${c.warbandIds.length} bandas · ${c.battles.length} batallas · creada ${new Date(c.createdAt).toLocaleDateString()}</div>
      </div>
    </div>

    <div class="campaign-section">
      <h3 class="campaign-section-title">🗓 Partida actual</h3>
      <div id="campaign-game-block"></div>
    </div>

    <div class="campaign-section">
      <h3 class="campaign-section-title">⚔ Bandas <span class="count">${c.warbandIds.length}</span></h3>
      <div id="campaign-warbands-list"></div>
    </div>

    <div class="campaign-section">
      <h3 class="campaign-section-title">⚙ House Rules <span class="count" id="house-rules-count">${listTraumaOverrides(c).length}</span></h3>
      <div class="house-rules-block" style="padding:0.6rem 0.8rem;background:rgba(127,107,67,0.08);border-left:3px solid var(--gold);font-size:0.85rem;color:var(--parchment);">
        <p style="margin:0 0 0.4rem;">Personaliza la tabla de Trauma D66 con reglas propias de tu grupo. Sólo afecta a esta campaña.</p>
        <button class="btn" id="btn-open-house-rules">⚙ Editar House Rules</button>
      </div>
    </div>

    <div class="campaign-section">
      <h3 class="campaign-section-title">🩸 Batallas <span class="count">${c.battles.length}</span></h3>
      <div id="campaign-battles-list"></div>
    </div>
  `;
  container.innerHTML = html;

  // Render game-number block
  renderCampaignGameBlock(c);

  // Bind name input
  document.getElementById('campaign-name-input').addEventListener('input', (e) => {
    c.name = e.target.value;
    persistCampaign(c);
    renderCampaignList();
  });

  // Render warbands
  const wbList = document.getElementById('campaign-warbands-list');
  if (!c.warbandIds.length) {
    wbList.innerHTML = `<div class="detail-empty" style="padding:0.8rem;">Pulsa "Añadir Banda" en la cabecera para incorporar bandas a esta campaña.</div>`;
  } else {
    for (const wid of c.warbandIds) {
      const wb = loadWarband(wid);
      if (!wb) continue;
      const f = DATA.factions[wb.factionId];
      const st = c.warbandStates[wid] || emptyWarbandState();
      const row = el('div', 'cwarband-row');
      row.dataset.side = f ? f.side : '';
      if (STATE.selectedCampaignWarbandId === wid) row.classList.add('selected');
      row.innerHTML = `
        <div>
          <div class="cwarband-name">${wb.name || '(Sin nombre)'}</div>
          <div class="cwarband-faction">${f ? f.shortName : '?'} · ${wb.models.length} modelos</div>
        </div>
        <div class="cwarband-stat"><span class="label">Bat.</span>${st.battlesPlayed}</div>
        <div class="cwarband-stat"><span class="label">W/L/D</span>${st.wins}/${st.losses}/${st.draws}</div>
        <div class="cwarband-stat"><span class="label">Glory</span>${st.glory} ☼</div>
      `;
      row.addEventListener('click', () => {
        STATE.selectedCampaignWarbandId = wid;
        renderCampaignCenter();
        renderCampaignDetail();
      });
      wbList.appendChild(row);
    }
  }

  // Render battles
  const blList = document.getElementById('campaign-battles-list');
  if (!c.battles.length) {
    blList.innerHTML = `<div class="detail-empty" style="padding:0.8rem;">Aún sin batallas. Cuando registres una, aparecerá aquí.</div>`;
  } else {
    const sorted = c.battles.slice().sort((a,b) => b.date.localeCompare(a.date));
    for (const b of sorted) {
      const entry = el('div', 'battle-entry');
      let resultsHtml = '';
      for (const part of (b.participants || [])) {
        const wb = loadWarband(part.warbandId);
        const cls = part.result === 'win' ? 'win' : part.result === 'loss' ? 'loss' : 'draw';
        const symbol = part.result === 'win' ? '✓' : part.result === 'loss' ? '✕' : '=';
        resultsHtml += `<span class="battle-result-pill ${cls}">${symbol} ${wb ? (wb.name || '?') : '?'}${part.gloryEarned ? ' +' + part.gloryEarned + '☼' : ''}</span>`;
      }
      entry.innerHTML = `
        <div class="battle-entry-header">
          <div class="battle-scenario">${b.scenario || '(Sin escenario)'}</div>
          <div class="battle-date">${b.date ? new Date(b.date).toLocaleDateString() : '?'}</div>
        </div>
        <div class="battle-results">${resultsHtml}</div>
      `;
      entry.addEventListener('click', () => {
        STATE.selectedBattleId = b.id;
        renderCampaignDetail();
      });
      blList.appendChild(entry);
    }
  }
}

/**
 * Renders the campaign Game-number block: shows the current game,
 * canonical Threshold + Field Strength, and lets the user advance the
 * game (which propagates the new threshold to all warbands in the
 * campaign).
 */
function renderCampaignGameBlock(c) {
  const container = document.getElementById('campaign-game-block');
  if (!container) return;
  const gameNum = c.gameNumber || 1;
  const row = warbandThresholdForGame(gameNum);
  const isMaxed = gameNum >= 12;

  // Compute affected-warband summary for the next-game preview
  const nextRow = isMaxed ? null : warbandThresholdForGame(gameNum + 1);

  container.innerHTML = `
    <div class="game-block">
      <div class="game-block-current">
        <div class="game-block-label">Game actual</div>
        <div class="game-block-value">
          <span class="game-block-num">${gameNum}</span>
          <span class="game-block-divider">/ 12</span>
        </div>
      </div>
      <div class="game-block-info">
        <div class="game-block-info-row">
          <span class="game-block-info-label">Threshold canon</span>
          <span class="game-block-info-value">${row?.threshold ?? '?'} 👑</span>
        </div>
        <div class="game-block-info-row">
          <span class="game-block-info-label">Field Strength máx</span>
          <span class="game-block-info-value">${row?.fieldStrength ?? '?'} modelos</span>
        </div>
      </div>
      <div class="game-block-actions">
        <button class="btn btn-icon" id="game-prev" ${gameNum <= 1 ? 'disabled' : ''} title="Bajar Game">−</button>
        <select id="game-set-select" class="budget-quick-select-input" style="margin:0 0.4rem;">
          ${Array.from({length:12}, (_,i) => i+1).map(g => {
            const r = warbandThresholdForGame(g);
            return `<option value="${g}" ${g===gameNum?'selected':''}>Game ${g} — ${r.threshold} 👑 · ${r.fieldStrength} mod.</option>`;
          }).join('')}
        </select>
        <button class="btn btn-icon" id="game-next" ${isMaxed ? 'disabled' : ''} title="Subir Game">+</button>
      </div>
      ${nextRow ? `
        <div class="game-block-preview">
          Próximo: Game ${gameNum+1} → ${nextRow.threshold} 👑 · ${nextRow.fieldStrength} mod.
        </div>
      ` : '<div class="game-block-preview">Última partida de la campaña</div>'}
    </div>
  `;

  // Bind decrement/increment & explicit pick
  const advance = (newGame) => {
    if (newGame === c.gameNumber) return;
    const willChange = (c.warbandIds || []).some(wid => {
      const wb = loadWarband(wid);
      return wb && !wb.lockBudget && wb.budgetTotal !== warbandThresholdForGame(newGame).threshold;
    });
    const apply = () => {
      const changes = syncCampaignGameNumber(c, newGame);
      persistCampaign(c);
      renderCampaignMode();
      // If the user is currently looking at one of those warbands, refresh
      // its STATE so the builder shows the new budget.
      if (STATE.currentWarband && (changes.find(ch => ch.warbandId === STATE.currentWarband.id))) {
        STATE.currentWarband = loadWarband(STATE.currentWarband.id);
      }
    };
    if (willChange) {
      confirmModal({
        title: `Avanzar a Game ${newGame}`,
        message: `Se actualizará el threshold a ${warbandThresholdForGame(newGame).threshold} 👑 en todas las bandas de la campaña sin "lockBudget" puesto. ¿Continuar?`,
        confirmText: `Aplicar Game ${newGame}`,
        onConfirm: apply,
      });
    } else {
      apply();
    }
  };
  container.querySelector('#game-prev').addEventListener('click', () => {
    if (gameNum > 1) advance(gameNum - 1);
  });
  container.querySelector('#game-next').addEventListener('click', () => {
    if (gameNum < 12) advance(gameNum + 1);
  });
  container.querySelector('#game-set-select').addEventListener('change', (e) => {
    advance(parseInt(e.target.value, 10));
  });
}

function renderCampaignDetail() {
  const container = document.getElementById('panel-detail');
  const c = STATE.currentCampaign;
  if (!c) {
    container.innerHTML = `<h2 class="panel-title">Detalle</h2><div class="detail-empty">Selecciona una campaña.</div>`;
    return;
  }

  // Battle detail takes precedence if a battle was clicked
  if (STATE.selectedBattleId) {
    const battle = c.battles.find(b => b.id === STATE.selectedBattleId);
    if (battle) {
      renderBattleDetail(container, c, battle);
      return;
    }
  }

  // Otherwise show selected warband progression
  const wid = STATE.selectedCampaignWarbandId;
  if (!wid) {
    container.innerHTML = `<h2 class="panel-title">Detalle</h2><div class="detail-empty">Selecciona una banda o batalla.</div>`;
    return;
  }
  const wb = loadWarband(wid);
  if (!wb) {
    container.innerHTML = `<h2 class="panel-title">Detalle</h2><div class="detail-empty">Banda no encontrada.</div>`;
    return;
  }
  renderProgression(container, c, wb);
}

function renderProgression(container, c, wb) {
  const f = DATA.factions[wb.factionId];
  const st = c.warbandStates[wb.id] || emptyWarbandState();
  const bal = campaignBalance(c, wb.id);
  const fin = ensureFinanceEntry(c, wb.id);
  let html = `
    <h2 class="panel-title">${wb.name || '(Sin nombre)'}</h2>
    <p class="panel-subtitle">${f ? f.name : '?'}</p>

    <div class="detail-section">
      <div class="detail-label">Estado de campaña</div>
      <div class="stat-block" style="grid-template-columns:repeat(4, 1fr);">
        <div class="stat-cell"><div class="label">Batallas</div><div class="value">${st.battlesPlayed}</div></div>
        <div class="stat-cell"><div class="label">W / L / D</div><div class="value">${st.wins}/${st.losses}/${st.draws}</div></div>
        <div class="stat-cell"><div class="label">Modelos vivos</div><div class="value">${wb.models.length}</div></div>
        <div class="stat-cell"><div class="label">Glory tot.</div><div class="value">${st.glory} ☼</div></div>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-label">Finanzas</div>
      <div class="finance-block">
        <div class="finance-row"><span>Inicial</span><span>${bal.startingDucats} 👑 · ${bal.startingGlory} ☼</span></div>
        <div class="finance-row"><span>+ Ganados</span><span>${bal.earningsDucats} 👑 · ${bal.earningsGlory} ☼</span></div>
        ${(bal.refundsDucats || bal.refundsGlory) ? `<div class="finance-row"><span>+ Ventas</span><span>${bal.refundsDucats} 👑 · ${bal.refundsGlory} ☼</span></div>` : ''}
        <div class="finance-row"><span>− Coste banda</span><span>${bal.rosterCostDucats} 👑 · ${bal.rosterCostGlory} ☼</span></div>
        <div class="finance-row finance-total ${bal.ducados < 0 ? 'over' : ''}">
          <span>Disponible</span>
          <span><strong>${bal.ducados} 👑</strong> · <strong>${bal.glory} ☼</strong></span>
        </div>
      </div>
      <div style="display:flex;gap:0.4rem;margin-top:0.5rem;flex-wrap:wrap;">
        <button class="btn btn-primary" id="btn-quartermaster">🛒 Quartermaster Step</button>
        <button class="btn" id="btn-edit-starting">✎ Editar inicial</button>
      </div>
    </div>

    <div class="detail-section">
      <div class="detail-label">Modelos</div>
      <div id="progression-models"></div>
    </div>

    <div class="detail-section" style="display:flex;gap:0.5rem;flex-wrap:wrap;">
      <button class="btn btn-danger" id="btn-remove-from-camp">✕ Quitar de la campaña</button>
      <button class="btn" id="btn-edit-warband-from-camp">✎ Editar banda</button>
    </div>
  `;
  container.innerHTML = html;

  const modelsList = document.getElementById('progression-models');
  for (const m of wb.models) {
    const ms = st.modelStates[m.uid] || emptyModelState();
    const u = getUnit(wb.factionId, m.unitId);
    const next = nextXpThreshold(ms.xp);
    const earnedAdv = advancementsEarned(ms.xp);
    const xpPct = next ? Math.min(100, ((ms.xp - (CAMPAIGN_TABLES.xpThresholds[earnedAdv-1]||0)) /
                  (next - (CAMPAIGN_TABLES.xpThresholds[earnedAdv-1]||0)) * 100)) : 100;
    const card = el('div', 'progression-model ' + ms.status);

    // Build abilities (from unit + base advancements + acquired in-campaign)
    const unitAbilities = (u && u.abilities) || [];
    const campAdvancements = ms.advancements || [];
    const allAbilityCount = unitAbilities.length + campAdvancements.length;
    const expandedKey = wb.id + ':' + m.uid;
    const expanded = STATE.progressionAbilitiesOpen && STATE.progressionAbilitiesOpen[expandedKey];
    let abilitiesBlock = '';
    if (allAbilityCount > 0) {
      abilitiesBlock = `
        <button class="roster-abilities-toggle" data-toggle-prog-abilities="${expandedKey}">
          ${expanded ? '▼' : '▶'} Habilidades (${allAbilityCount})
        </button>
      `;
      if (expanded) {
        const items = [
          ...unitAbilities.map(n => ({ name: n, source: 'unit' })),
          ...campAdvancements.map(a => ({ name: a.name, source: 'advancement' })),
        ];
        const itemsHtml = items.map(({ name, source }) => {
          const lib = ABILITY_LIBRARY[name];
          const summary = lib ? lib.summary : '';
          const userNote = (m.abilityNotes && m.abilityNotes[name]) || '';
          const sourceTag = source === 'advancement' ? ' <span style="color:var(--faithful-gold);">★</span>' : '';
          const finalText = userNote.trim() ? userNote : summary;
          return `
            <div class="roster-ability-item">
              <div class="roster-ability-name">${name}${sourceTag}</div>
              ${finalText ? `<div class="roster-ability-summary">${finalText.replace(/</g,'&lt;')}</div>` : ''}
            </div>
          `;
        }).join('');
        abilitiesBlock += `<div class="roster-abilities-list">${itemsHtml}</div>`;
      }
    }

    card.innerHTML = `
      <div class="prog-row1">
        <div>
          <div class="prog-name">${m.customName || (u ? u.name : '?')}</div>
          <div class="roster-unit-name">${u ? u.name : '?'}${ms.kills ? ' · ' + ms.kills + ' kills' : ''}</div>
        </div>
        <span class="prog-status ${ms.status}">${ms.status}</span>
      </div>
      <div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div>
      <div class="xp-label">
        <span>XP ${ms.xp}${next ? ' / ' + next + ' (próx. ascenso)' : ' (max)'}</span>
        <span>${earnedAdv} ascensos</span>
      </div>
      ${ms.advancements.length ? `<div class="advance-row">${ms.advancements.map(a => `<span class="adv-pill">★ ${a.name}</span>`).join('')}</div>` : ''}
      ${ms.scars.length ? `<div class="scars-row">${ms.scars.map(s => `<span class="scar-pill">⚕ ${s.name}</span>`).join('')}</div>` : ''}
      ${abilitiesBlock}
    `;

    // Wire abilities toggle
    const abilitiesToggle = card.querySelector('[data-toggle-prog-abilities]');
    if (abilitiesToggle) {
      abilitiesToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!STATE.progressionAbilitiesOpen) STATE.progressionAbilitiesOpen = {};
        STATE.progressionAbilitiesOpen[expandedKey] = !STATE.progressionAbilitiesOpen[expandedKey];
        renderProgression(container, c, wb);
      });
    }

    modelsList.appendChild(card);
  }

  document.getElementById('btn-quartermaster').addEventListener('click', () => {
    openQuartermaster(c, wb);
  });
  document.getElementById('btn-edit-starting').addEventListener('click', () => {
    const curD = fin.startingDucatsOverride != null ? fin.startingDucatsOverride : (wb.budgetTotal || 700);
    const curG = fin.startingGloryOverride  != null ? fin.startingGloryOverride  : (wb.startingGlory || 0);
    const newD = prompt('Ducados iniciales para esta banda en esta campaña:', String(curD));
    if (newD === null) return;
    const newG = prompt('Glory inicial para esta banda en esta campaña:', String(curG));
    if (newG === null) return;
    const dn = parseInt(newD, 10), gn = parseInt(newG, 10);
    if (Number.isFinite(dn) && dn >= 0) fin.startingDucatsOverride = dn;
    if (Number.isFinite(gn) && gn >= 0) fin.startingGloryOverride  = gn;
    persistCampaign(c);
    renderCampaignDetail();
  });

  document.getElementById('btn-remove-from-camp').addEventListener('click', () => {
    confirmModal({
      title: 'Quitar banda de la campaña',
      message: `¿Quitar "${wb.name||'?'}" de la campaña? Su histórico de batallas se conservará pero la banda dejará de participar.`,
      confirmText: 'Quitar',
      onConfirm: () => {
        c.warbandIds = c.warbandIds.filter(x => x !== wb.id);
        delete c.warbandStates[wb.id];
        persistCampaign(c);
        STATE.selectedCampaignWarbandId = c.warbandIds[0] || null;
        renderCampaignMode();
      }
    });
  });
  document.getElementById('btn-edit-warband-from-camp').addEventListener('click', () => {
    // Switch to banda mode with this warband loaded
    STATE.currentWarband = wb;
    STATE.selectedModelUid = null;
    persistWarband(wb);
    setMode('banda');
  });
}

function renderBattleDetail(container, c, battle) {
  let html = `
    <h2 class="panel-title">${battle.scenario || 'Batalla'}</h2>
    <p class="panel-subtitle">${battle.date ? new Date(battle.date).toLocaleDateString() : '?'}</p>
    <div class="detail-section">
      <button class="btn" id="btn-back-to-warband">← Volver a la banda</button>
      <button class="btn btn-danger" id="btn-delete-battle" style="margin-left:0.5rem;">✕ Eliminar batalla</button>
    </div>
  `;
  if (battle.notes) {
    html += `<div class="detail-section"><div class="detail-label">Notas</div><div style="font-family:var(--font-mono);font-size:0.78rem;color:var(--parchment);">${battle.notes.replace(/</g,'&lt;')}</div></div>`;
  }
  for (const part of (battle.participants || [])) {
    const wb = loadWarband(part.warbandId);
    if (!wb) continue;
    const f = DATA.factions[wb.factionId];
    html += `
      <div class="detail-section">
        <div class="detail-label">${wb.name || '?'} <span style="color:var(--parchment-dim);font-weight:400;">(${f?f.shortName:'?'})</span></div>
        <div class="battle-results">
          <span class="battle-result-pill ${part.result}">${part.result.toUpperCase()}</span>
          ${part.gloryEarned ? `<span class="battle-result-pill">+${part.gloryEarned} ☼</span>` : ''}
        </div>
        <div style="margin-top:0.5rem;font-family:var(--font-mono);font-size:0.78rem;color:var(--parchment);">
          ${(part.modelOutcomes||[]).filter(o => o.participated !== false).map(o => {
            const m = wb.models.find(x => x.uid === o.modelUid);
            const name = m ? (m.customName || (getUnit(wb.factionId, m.unitId)||{}).name) : '?';
            const bits = [];
            if (o.outOfAction) bits.push('OOA');
            if (o.kills) bits.push(o.kills + ' kills');
            if (o.feats) bits.push('+' + o.feats + ' feats');
            if (o.injury) bits.push('🩸 ' + o.injury.name);
            if (o.advancementsChosen && o.advancementsChosen.length) bits.push('★ ' + o.advancementsChosen.map(a=>a.name).join(', '));
            return `<div>• ${name}${bits.length ? ' — ' + bits.join(' · ') : ''}</div>`;
          }).join('')}
        </div>
      </div>
    `;
  }
  container.innerHTML = html;
  document.getElementById('btn-back-to-warband').addEventListener('click', () => {
    STATE.selectedBattleId = null;
    renderCampaignDetail();
  });
  document.getElementById('btn-delete-battle').addEventListener('click', () => {
    confirmModal({
      title: 'Eliminar batalla',
      message: '¿Eliminar esta batalla y recalcular el estado de campaña?',
      confirmText: 'Eliminar',
      onConfirm: () => {
        c.battles = c.battles.filter(b => b.id !== battle.id);
        refreshAllWarbandStates(c);
        persistCampaign(c);
        STATE.selectedBattleId = null;
        renderCampaignMode();
      }
    });
  });
}


