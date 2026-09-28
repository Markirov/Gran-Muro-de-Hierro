/* ======================================================================
   RENDERING
   ====================================================================== */

function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/**
 * SPEC-rediseno-ui Sub-A — Selecciona automáticamente el primer modelo
 * del roster si no hay selección activa (o la actual ya no existe).
 * Mantiene la selección actual si sigue siendo válida.
 */
function ensureDefaultModelSelection() {
  const wb = STATE.currentWarband;
  if (!wb || !Array.isArray(wb.models) || wb.models.length === 0) {
    STATE.selectedModelUid = null;
    return;
  }
  const stillExists = STATE.selectedModelUid &&
    wb.models.some(m => m.uid === STATE.selectedModelUid);
  if (!stillExists) {
    STATE.selectedModelUid = wb.models[0].uid;
  }
}

/**
 * SPEC-rediseno-ui Sub-A — Toggle body.has-warband para bloqueo scroll desktop.
 */
function syncBodyWarbandClass() {
  if (typeof document === 'undefined' || !document.body) return;
  const hasWb = !!(STATE.currentWarband && Array.isArray(STATE.currentWarband.models) &&
                   STATE.currentWarband.models.length > 0);
  document.body.classList.toggle('has-warband', hasWb);
}

function renderAll() {
  ensureDefaultModelSelection();
  syncBodyWarbandClass();
  renderFactionSelector();
  renderUnitCatalogue();
  renderRoster();
  renderDetail();
  applyFactionTheme();
  renderCampaignBreadcrumb();
}

/**
 * Updates the active-campaign breadcrumb shown in the header. Visible
 * across both modes (Banda and Campaña) when the user has a campaign
 * loaded — gives constant context about which campaign / Game number
 * is currently active.
 *
 * Click on the campaign name jumps to Campaign mode. This is the most
 * common navigation: build a band → realize you need to update the
 * campaign → click the breadcrumb name.
 */
function renderCampaignBreadcrumb() {
  const bc = document.getElementById('campaign-breadcrumb');
  if (!bc) return;
  const c = STATE.currentCampaign;
  if (!c) {
    bc.style.display = 'none';
    return;
  }
  bc.style.display = '';
  const nameEl = document.getElementById('bc-name');
  const gameEl = document.getElementById('bc-game');
  const warbandEl = document.getElementById('bc-warband');
  const thresholdEl = document.getElementById('bc-threshold');

  if (nameEl) {
    nameEl.textContent = c.name || '(Sin nombre)';
    if (!nameEl.dataset.bound) {
      nameEl.dataset.bound = '1';
      nameEl.addEventListener('click', () => {
        // Switch to campaign mode (only if not already there)
        if (STATE.mode !== 'campana') {
          setMode('campana');
        } else {
          // Already in campaign mode — just refresh
          renderAll();
        }
      });
    }
  }
  const gameNum = c.gameNumber || 1;
  if (gameEl) gameEl.textContent = `${gameNum}/12`;

  // Active warband: in Banda mode show the current warband if it belongs
  // to the campaign; in Campaña mode show the selected warband from the list.
  if (warbandEl) {
    let activeWb = null;
    if (STATE.mode === 'banda' && STATE.currentWarband &&
        c.warbandIds.includes(STATE.currentWarband.id)) {
      activeWb = STATE.currentWarband;
    } else if (STATE.mode === 'campana' && STATE.selectedCampaignWarbandId) {
      activeWb = loadWarband(STATE.selectedCampaignWarbandId);
    }
    if (activeWb) {
      warbandEl.innerHTML = `· <strong>${activeWb.name || '(Sin nombre)'}</strong>`;
    } else {
      warbandEl.textContent = '';
    }
  }

  if (thresholdEl) {
    const row = warbandThresholdForGame(gameNum);
    if (row) {
      thresholdEl.textContent = `Threshold ${row.threshold} 👑 · ${row.fieldStrength} mod. máx`;
    } else {
      thresholdEl.textContent = '';
    }
  }
}

function applyFactionTheme() {
  const wb = STATE.currentWarband;
  if (!wb) return;
  const f = DATA.factions[wb.factionId];
  document.body.dataset.side = f.side;
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('panel-fallen', f.side === 'fallen');
    p.classList.toggle('panel-faithful', f.side === 'faithful');
  });
}

function renderFactionSelector() {
  const container = document.getElementById('faction-select');
  container.innerHTML = '';
  const wb = STATE.currentWarband;
  for (const [id, f] of Object.entries(DATA.factions)) {
    const card = el('div', 'faction-card');
    card.dataset.side = f.side;
    if (wb && wb.factionId === id) card.classList.add('selected');
    card.innerHTML = `
      <div class="faction-name">${f.name}</div>
      <div class="faction-side">${f.side === 'faithful' ? '✠ The Faithful' : '⛧ The Fallen'}</div>
    `;
    card.addEventListener('click', () => onSelectFaction(id));
    container.appendChild(card);
  }

  // Variants
  const variantBox = document.getElementById('variant-select');
  const variantSel = document.getElementById('variant-dropdown');
  if (wb) {
    const f = DATA.factions[wb.factionId];
    if (f.variants && f.variants.length) {
      variantBox.style.display = 'block';
      variantSel.innerHTML = '<option value="">— Banda principal —</option>'
        + f.variants.map(v =>
            `<option value="${v.id}" ${wb.variantId === v.id ? 'selected' : ''}>${v.name}</option>`
          ).join('');
      variantSel.onchange = () => {
        const newVariantId = variantSel.value || null;
        const newVariant = newVariantId ? f.variants.find(v => v.id === newVariantId) : null;
        // If the new variant has a budget override and the band is currently
        // at the faction's default budget (i.e. unmodified), offer to switch.
        if (newVariant && newVariant.budget) {
          const factionDefault = f.budget || 700;
          const isDefault = wb.budgetTotal === factionDefault &&
                            (wb.startingGlory || 0) === 0;
          if (isDefault || confirm(
            `La variante ${newVariant.name} usa ${newVariant.budget.ducados} 👑` +
            (newVariant.budget.glory ? ` + ${newVariant.budget.glory} ☼` : '') +
            `. ¿Cambiar el presupuesto de la banda?`
          )) {
            wb.budgetTotal = newVariant.budget.ducados;
            wb.startingGlory = newVariant.budget.glory || 0;
          }
        }
        wb.variantId = newVariantId;
        persistWarband(wb);
        renderAll();
      };
    } else {
      variantBox.style.display = 'none';
    }
  } else {
    variantBox.style.display = 'none';
  }
}

function renderUnitCatalogue() {
  const container = document.getElementById('unit-catalogue');
  container.innerHTML = '';
  const wb = STATE.currentWarband;
  if (!wb) {
    container.innerHTML = '<div class="detail-empty">Crea o carga una banda primero.</div>';
    return;
  }
  const f = DATA.factions[wb.factionId];
  // Group by tier. Variant-only units (e.g. Defenders' Sipahi/Silahdar)
  // appear only under their variant via unitsAvailableForWarband.
  const tiers = { elite: [], troops: [] };
  unitsAvailableForWarband(wb).forEach(u => { if (tiers[u.tier]) tiers[u.tier].push(u); });

  ['elite', 'troops'].forEach(tier => {
    if (!tiers[tier].length) return;
    const div = el('div', 'section-divider');
    const count = tiers[tier].length;
    div.innerHTML = `<span>${tier === 'elite' ? '★ Elite' : '⚔ Troops'}</span><span class="count">${count}</span>`;
    container.appendChild(div);
    tiers[tier].forEach(u => container.appendChild(unitCatalogueCard(u, wb)));
  });

  // Mercenaries section
  const merc = el('div', 'section-divider');
  merc.innerHTML = `<span>☼ Mercenaries</span><span class="count">${DATA.mercenaries.length}</span>`;
  container.appendChild(merc);
  DATA.mercenaries.forEach(u => container.appendChild(unitCatalogueCard(u, wb, true)));
}

function unitCatalogueCard(unit, wb, isMerc=false) {
  const card = el('div', 'unit-card');
  card.dataset.tier = unit.tier || 'mercenary';
  const can = canAddUnit(wb, unit);
  if (!can) card.dataset.disabled = 'true';
  const forbiddenBy = isMerc ? null : unitForbiddenByVariant(wb, unit.id);

  // Apply variant override (e.g. Anchorite Shrine 0-2 in St Methodius)
  const override = isMerc ? null : variantUnitOverride(wb, unit.id);
  const effectiveLimit = (override && override.limit) || unit.limit;
  const effectiveStats = override && override.stats
    ? Object.assign({}, unit.stats || {}, override.stats)
    : unit.stats;

  const count = unitCountInWarband(wb, unit.id);
  const lim = parseLimit(effectiveLimit);
  const limitTxt = effectiveLimit
    ? `${effectiveLimit}` + (lim ? ` (${count}/${lim.max})` : '')
    : (unit.limitPerUnit ? perUnitLimitText(wb, unit) : 'sin límite');
  const limitChanged = override && override.limit && override.limit !== unit.limit;

  // Variant cost override (Tenth Plague: Communicants for 3 ☼)
  const cu = (override && override.cost != null) ? Object.assign({}, unit, { cost: override.cost, currency: override.currency || unit.currency }) : unit;
  const costStr = cu.costAlt && unitCostAltAllowed(wb, cu)
    ? `${cu.cost}/${cu.costAlt} ${cu.currency}`
    : `${cu.cost} ${cu.currency}`;

  card.innerHTML = `
    <div class="unit-row">
      <div class="unit-name">${unit.name}</div>
      <div class="unit-cost">${costStr}</div>
    </div>
    <div class="unit-meta">
      ${unit.tier ? `<span class="tier">${unit.tier}</span>` : ''}
      <span class="limit${limitChanged ? ' variant-override' : ''}">${limitTxt}</span>
      ${unit.mandatory ? `<span style="color:var(--faithful-gold);">obligatorio</span>` : ''}
      ${forbiddenBy ? `<span style="color:var(--fallen-blood-bright);">prohibido en ${forbiddenBy}</span>` : ''}
      ${!isMerc && wb.factionId && !canBePromoted(wb.factionId, unit.id) && unit.tier === 'troops'
        ? `<span class="badge-no-promo" title="No puede ascender a ELITE">⛔ promoción</span>` : ''}
      ${!isMerc && wb.factionId && xpCapFor(wb.factionId, unit.id) !== Infinity
        ? `<span class="badge-limited-xp" title="Limited Potential: máx 7 XP">⚠ máx ${xpCapFor(wb.factionId, unit.id)} XP</span>` : ''}
    </div>
    ${effectiveStats ? `
      <div class="unit-stats-preview">
        <div class="stat"><span class="label">Mov</span><span class="value">${effectiveStats.movement.replace('"/Infantry','"').replace('"/Flying','"✈').replace('"/Cavalry','"⚐')}</span></div>
        <div class="stat"><span class="label">Rng</span><span class="value${override && override.stats && override.stats.ranged ? ' variant-override' : ''}">${effectiveStats.ranged}</span></div>
        <div class="stat"><span class="label">Mel</span><span class="value${override && override.stats && override.stats.melee ? ' variant-override' : ''}">${effectiveStats.melee}</span></div>
        <div class="stat"><span class="label">Arm</span><span class="value${override && override.stats && override.stats.armour ? ' variant-override' : ''}">${effectiveStats.armour}</span></div>
      </div>` : ''}
  `;
  if (can) {
    card.addEventListener('click', () => addUnitToRoster(unit, isMerc));
  }
  return card;
}

function renderRoster() {
  const wb = STATE.currentWarband;
  // Name + meta + budget
  const nameInput = document.getElementById('warband-name');
  if (wb) nameInput.value = wb.name || '';

  const metaLine = document.getElementById('warband-meta-line');
  const budgetVal = document.getElementById('budget-value');
  const budgetFill = document.getElementById('budget-fill');
  const budgetDetail = document.getElementById('budget-detail');
  const gloryDetail = document.getElementById('glory-detail');
  const budgetInput = document.getElementById('budget-input');
  const gloryInput  = document.getElementById('glory-input');

  if (!wb) {
    metaLine.textContent = '— · — · 0 modelos';
    budgetVal.textContent = '— / —';
    budgetFill.style.width = '0%';
    budgetDetail.textContent = '';
    if (gloryDetail) gloryDetail.style.display = 'none';
    if (budgetInput) budgetInput.disabled = true;
    if (gloryInput)  gloryInput.disabled  = true;
    const gameSelectNo = document.getElementById('budget-game-select');
    if (gameSelectNo) { gameSelectNo.value = ''; gameSelectNo.disabled = true; }
  } else {
    const f = DATA.factions[wb.factionId];
    const variant = wb.variantId ? f.variants.find(v => v.id === wb.variantId) : null;
    let metaHtml = `${f.shortName}${variant ? ' · ' + variant.name : ''} · ${wb.models.length} modelos`;
    if (wb.gameNumber) {
      const row = warbandThresholdForGame(wb.gameNumber);
      const overFs = row && wb.models.length > row.fieldStrength;
      const overBudget = row && warbandTotals(wb).ducados > row.threshold;
      metaHtml += ` <span class="game-badge${overFs || overBudget ? ' game-badge-warn' : ''}"
        title="Canon Game ${wb.gameNumber}: threshold ${row?.threshold} 👑, field strength ${row?.fieldStrength} mod.${overFs ? ' — superado' : ''}">
        🗓 GAME ${wb.gameNumber}/${row?.fieldStrength || '?'}${overFs ? ' ⚠' : ''}
      </span>`;
    }
    metaHtml += ' ' + warbandSourceBadgeHtml(wb);
    metaLine.innerHTML = metaHtml;

    // Sync inputs (only when not currently focused, to avoid disrupting typing)
    if (budgetInput && document.activeElement !== budgetInput) {
      budgetInput.value = wb.budgetTotal;
      budgetInput.disabled = false;
    }
    if (gloryInput && document.activeElement !== gloryInput) {
      gloryInput.value = wb.startingGlory || 0;
      gloryInput.disabled = false;
    }
    // Sync the canon Game number selector (if this band is tied to a game)
    const gameSelect = document.getElementById('budget-game-select');
    if (gameSelect && document.activeElement !== gameSelect) {
      gameSelect.value = wb.gameNumber ? String(wb.gameNumber) : '';
      gameSelect.disabled = false;
    }
    // Sync the Promotion Step button: show it if there are eligible Troops AND
    // the warband isn't already at the 6-elite cap.
    const promoBtn = document.getElementById('btn-promotion-step');
    if (promoBtn) {
      const eligible = eligibleForPromotion(wb);
      const eliteCount = countEliteInWarband(wb);
      const slotsLeft = CAMPAIGN_TABLES.promotionRules.maxElites - eliteCount;
      if (eligible.length > 0 && slotsLeft > 0) {
        promoBtn.style.display = '';
        promoBtn.title = `${eligible.length} Troop${eligible.length===1?'':'s'} elegible${eligible.length===1?'':'s'} · ${slotsLeft} plaza${slotsLeft===1?'':'s'} libre${slotsLeft===1?'':'s'}`;
      } else {
        promoBtn.style.display = 'none';
      }
    }
    // Sync the Reinforcements Step button: visible when the band is below the
    // NEXT game's threshold (canon: only call reinforcements if you've had
    // losses). Hidden if the band has no game number set, or is already at
    // game 12 (campaign end).
    const rfBtn = document.getElementById('btn-reinforcements-step');
    if (rfBtn) {
      const currentGame = wb.gameNumber || 0;
      if (currentGame > 0 && currentGame < 12) {
        const calc = calculateReinforcementsBudget(wb, currentGame + 1);
        if (calc.underThreshold) {
          rfBtn.style.display = '';
          rfBtn.title = `Game ${currentGame} → ${calc.nextGame}: ${calc.availableBudget} 👑 disponibles para refuerzos`;
        } else {
          rfBtn.style.display = 'none';
        }
      } else {
        rfBtn.style.display = 'none';
      }
    }
    // Fase 3 — Free Battle button: visible whenever a band has at least
    // one model. No game-number gating: free battles can start fresh.
    const fbBtn = document.getElementById('btn-start-free-battle');
    if (fbBtn) {
      fbBtn.style.display = (wb.models && wb.models.length > 0) ? '' : 'none';
    }
    // P1 open-QM-free — QM button visible same condition as free-battle.
    const qmFreeBtn = document.getElementById('btn-open-qm-free');
    if (qmFreeBtn) {
      qmFreeBtn.style.display = (wb.models && wb.models.length > 0) ? '' : 'none';
    }
    // Fase 7.4 — Campaigns button always visible (info even when 0).
    const wbCampBtn = document.getElementById('btn-warband-campaigns');
    if (wbCampBtn) {
      wbCampBtn.style.display = '';
    }

    const totals = warbandTotals(wb);
    const remaining = wb.budgetTotal - totals.ducados;
    const pct = wb.budgetTotal > 0 ? Math.min(100, (totals.ducados / wb.budgetTotal) * 100) : 0;
    budgetVal.textContent = `${totals.ducados} / ${wb.budgetTotal}`;
    budgetVal.classList.toggle('over', remaining < 0);
    budgetFill.style.width = pct + '%';
    budgetFill.classList.toggle('warning', pct > 90 && pct <= 100);
    budgetFill.classList.toggle('over', pct > 100);
    budgetDetail.innerHTML =
      remaining >= 0
        ? `<span style="color:var(--bone);">Restantes: ${remaining} 👑</span>`
        : `<span style="color:var(--fallen-blood-bright);">Excedido por ${-remaining} 👑</span>`;

    // Glory line — show only if startingGlory > 0 or models cost glory
    const sg = wb.startingGlory || 0;
    if (sg > 0 || totals.glory > 0) {
      const remainingG = sg - totals.glory;
      gloryDetail.style.display = '';
      gloryDetail.innerHTML = remainingG >= 0
        ? `<span style="color:var(--bone);">Glory restante: ${remainingG} ☼ (gastada ${totals.glory})</span>`
        : `<span style="color:var(--fallen-blood-bright);">Glory excedida por ${-remainingG} ☼</span>`;
    } else {
      gloryDetail.style.display = 'none';
    }
  }

  // Roster body
  const content = document.getElementById('roster-content');
  content.innerHTML = '';

  if (!wb) {
    content.innerHTML = `
      <div class="roster-empty">
        <h2>SIN BANDA</h2>
        <p>Forja una nueva banda o carga una existente desde la cabecera. Cada banda tiene 700 ducados (👑) por defecto para reclutar a sus miembros.</p>
      </div>`;
    return;
  }
  if (wb.models.length === 0) {
    const f = DATA.factions[wb.factionId];
    content.innerHTML = `
      <div class="roster-empty">
        <h2>VACÍA</h2>
        <p>Tu banda de <strong>${f.name}</strong> aguarda. Selecciona unidades del catálogo de la izquierda para empezar a reclutar.</p>
      </div>`;
    return;
  }

  // Detect Companion-imported warbands: any model with companionRef triggers
  // the Companion-aware rendering path. We don't try to fit Companion models
  // into the canon catalogue (Plan: Companion is the builder, Forge tracks).
  const isCompanion = wb.models.some(m => m.companionRef);

  if (isCompanion) {
    // Companion-aware rendering: group all models in a single "Roster" section.
    // We don't use canon tiers because Companion data is the source of truth.
    const grp = el('div', 'roster-group');
    grp.innerHTML = `<div class="roster-group-title">⤓ Companion Roster <span style="font-size:0.7em;opacity:0.7;font-weight:normal;">(${wb.models.length} modelos)</span></div>`;
    wb.models.forEach(model => {
      grp.appendChild(rosterCardCompanion(model, wb));
    });
    content.appendChild(grp);
    if (wb.archivedModels && wb.archivedModels.length > 0) {
      const archGrp = el('div', 'roster-group');
      archGrp.innerHTML = `<div class="roster-group-title" style="opacity:0.6;">⚰ Archivados <span style="font-size:0.7em;font-weight:normal;">(${wb.archivedModels.length})</span></div>`;
      wb.archivedModels.forEach(model => {
        const card = rosterCardCompanion(model, wb);
        card.style.opacity = '0.5';
        card.style.filter = 'grayscale(0.5)';
        archGrp.appendChild(card);
      });
      content.appendChild(archGrp);
    }
    return;
  }

  // Group by tier — promoted Troops appear in the ELITE section per canon
  const groups = { elite: [], troops: [], mercenary: [] };
  wb.models.forEach(m => {
    const u = getUnit(wb.factionId, m.unitId);
    if (!u) return;
    let tier = u.tier || 'mercenary';
    if (tier === 'troops' && m.baseProgression && m.baseProgression.promotedToElite) {
      tier = 'elite';
    }
    groups[tier].push({ model: m, unit: u });
  });

  // Warband-level legality warnings: upgrades + battlekit canonical limits
  const upgradeWarnings = checkUpgradeLegality(wb);
  const battlekitWarnings = checkBattlekitLegality(wb);
  const allWarnings = [...upgradeWarnings, ...battlekitWarnings];
  if (allWarnings.length) {
    const noticesEl = el('div');
    for (const msg of allWarnings) {
      const n = el('div', 'notice');
      n.textContent = '⚠ ' + msg;
      noticesEl.appendChild(n);
    }
    content.appendChild(noticesEl);
  }

  ['elite', 'troops', 'mercenary'].forEach(tier => {
    if (!groups[tier].length) return;
    const titleMap = {
      elite: '★ Elite Warband Entries',
      troops: '⚔ Troops',
      mercenary: '☼ Mercenaries',
    };
    const grp = el('div', 'roster-group');
    grp.innerHTML = `<div class="roster-group-title">${titleMap[tier]}</div>`;
    groups[tier].forEach(({ model, unit }) => grp.appendChild(rosterCard(model, unit, wb)));
    content.appendChild(grp);
  });
}

/**
 * Renders a Companion-imported model. Uses companionStats/Equipment/etc.
 * as authoritative data, plus campaign progression overlay.
 */
function rosterCardCompanion(model, wb) {
  const card = el('div', 'roster-card');
  card.dataset.uid = model.uid;
  card.draggable = true;  // SPEC-rediseno-ui Sub-I — reorden por drag.
  card.classList.add('tier-companion');
  if (STATE.selectedModelUid === model.uid) card.classList.add('selected');

  const stats = model.companionStats || {};
  const cost = model.companionCost || 0;
  const glory = model.companionGlory || 0;
  const costStr = `${cost ? cost + ' 👑' : ''}${cost && glory ? ' · ' : ''}${glory ? glory + ' ☼' : ''}`;

  // Equipment lines
  const eqList = (model.companionEquipment || [])
    .map(e => `<span style="display:inline-block;padding:0.1em 0.5em;margin:0.1em 0.2em 0.1em 0;background:rgba(127,107,67,0.15);border:1px solid rgba(127,107,67,0.3);border-radius:3px;font-size:0.75em;">${escapeHtml(e.name)}</span>`)
    .join('');

  const abList = (model.companionAbilities || [])
    .map(a => `<span style="display:inline-block;padding:0.1em 0.5em;margin:0.1em 0.2em 0.1em 0;background:rgba(176,141,87,0.12);font-size:0.7em;color:var(--gold);">${escapeHtml(a.name)}</span>`)
    .join('');

  const kwList = (model.companionKeywords || [])
    .map(k => `<span style="display:inline-block;padding:0.05em 0.4em;margin:0.05em;font-size:0.65em;letter-spacing:0.05em;text-transform:uppercase;color:var(--parchment-dim);">${escapeHtml(k.name)}</span>`)
    .join('');

  // Campaign progression overlay (XP, scars, advancements)
  const prog = model.baseProgression || {};
  const xp = prog.xp || 0;
  const scars = (prog.scars || []).length;
  const advs = (prog.advancements || []).length;
  let progStr = '';
  if (xp || scars || advs) {
    const bits = [];
    if (xp) bits.push(`XP ${xp}`);
    if (advs) bits.push(`${advs} avance${advs > 1 ? 's' : ''}`);
    if (scars) bits.push(`${scars} cicatri${scars > 1 ? 'ces' : 'z'}`);
    progStr = `<div style="margin-top:0.4em;font-size:0.75em;color:var(--gold);">⚙ ${bits.join(' · ')}</div>`;
  }

  const customBadge = model.customContent
    ? `<span style="font-size:0.65em;padding:0.1em 0.4em;background:rgba(176,141,87,0.2);color:var(--gold);border-radius:2px;margin-left:0.5em;letter-spacing:0.05em;" title="Modelo no encontrado en el catálogo nativo (variante regional o custom de Companion)">CUSTOM</span>`
    : '';

  card.innerHTML = `
    <div class="roster-card-header">
      <div>
        <div class="model-name">${escapeHtml(model.name)} ${customBadge}</div>
        <div class="model-stats" style="font-family:var(--font-mono);font-size:0.78em;color:var(--parchment-dim);margin-top:0.2em;">
          M ${escapeHtml(stats.move || '?')} ·
          ⚔ ${escapeHtml(stats.melee || '0')} ·
          ⌖ ${escapeHtml(stats.ranged || '0')} ·
          ⛨ ${escapeHtml(stats.armour || '0')}
        </div>
      </div>
      <div class="model-cost">${costStr}</div>
    </div>
    ${eqList ? `<div style="margin-top:0.5em;">${eqList}</div>` : ''}
    ${abList ? `<div style="margin-top:0.3em;">${abList}</div>` : ''}
    ${kwList ? `<div style="margin-top:0.3em;line-height:1.4;">${kwList}</div>` : ''}
    ${progStr}
  `;

  card.addEventListener('click', () => {
    STATE.selectedModelUid = model.uid;
    renderRoster();
    renderDetail();
  });

  return card;
}

// Simple HTML escape for Companion data (which is user-controlled)
function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function rosterCard(model, unit, wb) {
  const card = el('div', 'roster-card');
  card.dataset.uid = model.uid;
  card.dataset.tier = unit.tier || 'mercenary';
  card.draggable = true;  // SPEC-rediseno-ui Sub-I — reorden por drag.
  card.classList.add('tier-' + (unit.tier || 'mercenary'));
  if (STATE.selectedModelUid === model.uid) card.classList.add('selected');

  const cost = modelCost(model, wb.factionId, wb);
  const costStr = `${cost.ducados ? cost.ducados + ' 👑' : ''}${cost.ducados && cost.glory ? ' · ' : ''}${cost.glory ? cost.glory + ' ☼' : ''}`;

  // Battlekit display
  let kitDisplay = '';
  if (model.battlekit && model.battlekit.length) {
    const items = model.battlekit.map(kid => {
      const it = findBattlekitItem(wb.factionId, kid, wb);
      return it ? `<span class="eq-item">${it.name}<span class="eq-cost">${it.cost}${it.currency}</span></span>` : '';
    }).join('');
    kitDisplay = `<div class="roster-equipment-list">${items}</div>`;
  }

  // Base progression summary
  const bp = model.baseProgression;
  const hasProg = bp && (
    (bp.xp || 0) > 0 ||
    (bp.kills || 0) > 0 ||
    (bp.advancements || []).length > 0 ||
    (bp.scars || []).length > 0 ||
    (bp.status && bp.status !== 'alive')
  );
  // Canon-aware constraints for this unit
  const xpCap = xpCapFor(wb.factionId, unit.id);
  const hasXpCap = xpCap !== Infinity;
  const cannotPromote = !canBePromoted(wb.factionId, unit.id) && unit.tier === 'troops';
  // Battle scar warning: 3 scars = Unfit for Duty
  const scarCount = (bp && bp.scars || []).filter(s => s.source === 'trauma').length;
  const unfit = scarCount >= unfitScarThreshold(model);

  let progSummary = '';
  if (hasProg) {
    const parts = [];
    if (bp.xp) {
      parts.push(`${bp.xp} XP${hasXpCap ? ` <span style="color:var(--faithful-gold);">/${xpCap}</span>` : ''}`);
    }
    if ((bp.advancements || []).length) parts.push(`${bp.advancements.length}★`);
    if ((bp.scars || []).length) parts.push(`${bp.scars.length}⚕`);
    if (bp.status && bp.status !== 'alive') parts.push(bp.status);
    progSummary = `<div class="roster-prog-summary">⏳ ${parts.join(' · ')}`;
    if (unfit) progSummary += ` <span style="color:var(--fallen-blood-bright);font-weight:700;">⚠ UNFIT FOR DUTY</span>`;
    progSummary += '</div>';
  }
  // Static unit constraints (always shown if applicable, even with no progression)
  const constraintBadges = [];
  if (cannotPromote) constraintBadges.push(`<span class="badge-no-promo" title="No puede ascender a ELITE">⛔ no asciende</span>`);
  if (hasXpCap)      constraintBadges.push(`<span class="badge-limited-xp" title="Limited Potential: máx 7 XP">⚠ máx ${xpCap} XP</span>`);
  const constraintsRow = constraintBadges.length
    ? `<div class="roster-constraints" style="margin-top:0.2rem;">${constraintBadges.join(' ')}</div>`
    : '';

  // Abilities (innate + upgrades + advancements).
  // Modelos Companion-imported: TC es verdad oficial, no mezclar abilities
  // del unit alias de Forge (bug Silahdar/Yüzbaşı, ver displayAbilitiesForCard).
  const displayAbs = displayAbilitiesForCard(model, unit);
  const unitAbilities = displayAbs.map(a => a.name);
  const hasCompanion = !!(model.companionStats || (Array.isArray(model.companionAbilities) && model.companionAbilities.length));
  const baseUnitAbilities = hasCompanion ? unitAbilities : (unit.abilities || []);
  const baseAdvancements = (model.baseProgression && model.baseProgression.advancements) || [];
  const totalAbilityCount = unitAbilities.length + baseAdvancements.length;
  const expanded = STATE.rosterCardAbilitiesOpen && STATE.rosterCardAbilitiesOpen[model.uid];
  let abilitiesBlock = '';
  if (totalAbilityCount > 0) {
    abilitiesBlock = `
      <button class="roster-abilities-toggle" data-toggle-abilities="${model.uid}">
        ${expanded ? '▼' : '▶'} Habilidades (${totalAbilityCount})
      </button>
    `;
    // Always render the list (so print can show them), but hide via display when not expanded.
    const allItems = [
      ...unitAbilities.map(n => ({
        name: n,
        source: baseUnitAbilities.includes(n) ? 'unit' : 'upgrade',
      })),
      ...baseAdvancements.map(a => ({ name: a.name, source: 'advancement' })),
    ];
    const itemsHtml = allItems.map(({ name, source }) => {
      const lib = ABILITY_LIBRARY[name];
      const summary = lib ? lib.summary : '';
      const userNote = (model.abilityNotes && model.abilityNotes[name]) || '';
      let sourceTag = '';
      if (source === 'advancement') sourceTag = ' <span style="color:var(--faithful-gold);">★</span>';
      else if (source === 'upgrade') sourceTag = ' <span style="color:var(--rust);">⊕</span>';
      const finalText = userNote.trim() ? userNote : summary;
      return `
        <div class="roster-ability-item">
          <div class="roster-ability-name">${name}${sourceTag}</div>
          ${finalText ? `<div class="roster-ability-summary">${finalText.replace(/</g,'&lt;')}</div>` : ''}
        </div>
      `;
    }).join('');
    abilitiesBlock += `<div class="roster-abilities-list" style="${expanded ? '' : 'display:none;'}">${itemsHtml}</div>`;
  }

  const rosterEffName = effectiveUnitName(model, unit);
  card.innerHTML = `
    <div class="roster-card-row1">
      <div>
        <div class="roster-custom-name">${model.customName || rosterEffName}</div>
        ${model.customName ? `<div class="roster-unit-name">${rosterEffName}</div>` : (rosterEffName !== unit.name ? `<div class="roster-unit-name">de ${unit.name}</div>` : '')}
      </div>
      <div class="roster-cost">${costStr}</div>
    </div>
    ${progSummary}
    ${constraintsRow}
    ${kitDisplay}
    ${abilitiesBlock}
    <div class="roster-card-actions">
      <button class="btn btn-icon" data-action="edit" title="Editar nombre">✎</button>
      <button class="btn btn-icon" data-action="duplicate" title="Duplicar">⎘</button>
      <button class="btn btn-icon btn-danger" data-action="remove" title="Eliminar">✕</button>
    </div>
  `;

  card.addEventListener('click', (e) => {
    if (e.target.dataset.action) return;
    if (e.target.dataset.toggleAbilities) return;
    STATE.selectedModelUid = model.uid;
    renderRoster();
    renderDetail();
  });
  // Abilities toggle in roster card
  const abilitiesToggle = card.querySelector('[data-toggle-abilities]');
  if (abilitiesToggle) {
    abilitiesToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!STATE.rosterCardAbilitiesOpen) STATE.rosterCardAbilitiesOpen = {};
      STATE.rosterCardAbilitiesOpen[model.uid] = !STATE.rosterCardAbilitiesOpen[model.uid];
      renderRoster();
    });
  }
  card.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
    e.stopPropagation();
    confirmModal({
      title: 'Eliminar modelo',
      message: `¿Eliminar a ${model.customName || unit.name} de la banda?`,
      confirmText: 'Eliminar',
      onConfirm: () => {
        wb.models = wb.models.filter(m => m.uid !== model.uid);
        if (STATE.selectedModelUid === model.uid) STATE.selectedModelUid = null;
        persistWarband(wb);
        renderAll();
      }
    });
  });
  card.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const newName = prompt('Nombre personalizado:', model.customName || '');
    if (newName !== null) {
      model.customName = newName.trim() || null;
      persistWarband(wb);
      renderRoster();
      renderDetail();
    }
  });
  card.querySelector('[data-action="duplicate"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const check = canAddUnitWithWarning(wb, unit);
    if (!check.canAdd) {
      alert(check.warning || 'No se puede duplicar.');
      return;
    }
    if (check.warning) {
      // Banda Companion — warning informativo pero permite.
      console.warn('[duplicate]', check.warning);
    }
    const dup = JSON.parse(JSON.stringify(model));
    dup.uid = uid();
    dup.customName = null;
    wb.models.push(dup);
    persistWarband(wb);
    renderAll();
  });
  return card;
}

/**
 * Renders the detail panel for a Companion-imported model. Uses
 * companionStats/Equipment/Abilities/Keywords as authoritative data and
 * still exposes the progression editor for campaign tracking.
 *
 * Why a dedicated path: native renderDetail relies on getUnit() returning
 * a canonical unit, which fails for custom regional content (Highland
 * Lieutenant, etc.) or truly custom content without an alias. Without
 * this path, those models showed "Unidad no encontrada" and blocked
 * access to progression — the very value proposition of Forge post-pivot.
 */
function renderDetailCompanion(container, model, wb) {
  const stats = model.companionStats || {};
  const cost  = model.companionCost  || 0;
  const glory = model.companionGlory || 0;
  const cn    = model.customName || '';

  // Optional: detect canonical unit (alias-mapped). If present we can
  // enrich tooltips, but the displayed name and stats remain Companion's.
  const canonUnit = model.unitId ? getUnit(wb.factionId, model.unitId) : null;

  let html = '';

  // Custom name editor
  html += `
    <div class="detail-section">
      <div class="detail-label">Nombre personalizado</div>
      <input type="text" class="detail-name-input" id="detail-custom-name"
        value="${escapeHtml(cn)}"
        placeholder="${escapeHtml(model.name || '')}" />
    </div>`;

  // Stats — Companion data (post-resolution: includes upgrades/abilities)
  const customBadge = model.customContent
    ? `<span style="font-size:0.65em;padding:0.1em 0.4em;background:rgba(176,141,87,0.2);color:var(--gold);border-radius:2px;margin-left:0.5em;letter-spacing:0.05em;" title="Contenido custom o variante regional de Companion">CUSTOM</span>`
    : `<span style="font-size:0.65em;padding:0.1em 0.4em;background:rgba(176,141,87,0.12);color:var(--parchment-dim);border-radius:2px;margin-left:0.5em;letter-spacing:0.05em;" title="Modelo importado de Trench Companion">COMPANION</span>`;
  const costStr = `${cost ? cost + ' 👑' : ''}${cost && glory ? ' · ' : ''}${glory ? glory + ' ☼' : ''}`;
  html += `
    <div class="detail-section">
      <div class="detail-label">${escapeHtml(model.name || '')} ${customBadge} · ${costStr || '—'}</div>
      <div class="stat-block">
        <div class="stat-cell"><div class="label">Movement</div><div class="value">${escapeHtml(stats.move || '?')}</div></div>
        <div class="stat-cell"><div class="label">Ranged</div><div class="value">${escapeHtml(stats.ranged || '0')}</div></div>
        <div class="stat-cell"><div class="label">Melee</div><div class="value">${escapeHtml(stats.melee || '0')}</div></div>
        <div class="stat-cell"><div class="label">Armour</div><div class="value">${escapeHtml(stats.armour || '0')}</div></div>
      </div>
    </div>`;

  // Keywords (with tooltips from KEYWORD_LIBRARY when known)
  const kws = model.companionKeywords || [];
  if (kws.length) {
    html += `
      <div class="detail-section">
        <div class="detail-label">Keywords</div>
        <div class="keywords-row">
          ${kws.map(k => {
            const name = (k.name || '').toUpperCase();
            const tooltip = KEYWORD_LIBRARY[name] || '';
            const cls = (name === 'ELITE' || name === 'LEADER') ? 'special' : '';
            return `<span class="keyword-pill ${cls}" ${tooltip ? `title="${escapeHtml(tooltip)}"` : ''}>${escapeHtml(name)}</span>`;
          }).join('')}
        </div>
      </div>`;
  }

  // Equipment — Companion is authoritative (full list including non-weapons)
  const equip = model.companionEquipment || [];
  if (equip.length) {
    html += `
      <div class="detail-section">
        <div class="detail-label">Equipamiento</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
          ${equip.map(e => {
            const typeLabel = e.type === 'ranged weapon' ? '🏹' :
                              e.type === 'melee weapon' ? '⚔' :
                              e.type === 'shield' ? '🛡' :
                              e.type === 'armour' ? '🦺' :
                              e.type === 'grenade' ? '💣' : '🎒';
            return `<span style="display:inline-block;padding:0.2em 0.5em;background:rgba(127,107,67,0.15);border:1px solid rgba(127,107,67,0.3);border-radius:3px;font-size:0.8em;">${typeLabel} ${escapeHtml(e.name)}</span>`;
          }).join('')}
        </div>
        <button class="btn btn-sm btn-equip-wishlist" data-add-equip-wishlist="${model.uid}" title="Añade equipo para este modelo a la lista de la compra" style="margin-top:0.5rem;">
          🛒 + Equipo a wishlist
        </button>
      </div>`;
  } else {
    // Sin equipamiento aún — botón igual disponible.
    html += `
      <div class="detail-section">
        <div class="detail-label">Equipamiento</div>
        <div style="color:var(--parchment);opacity:0.7;font-size:0.85rem;">Sin equipo registrado.</div>
        <button class="btn btn-sm btn-equip-wishlist" data-add-equip-wishlist="${model.uid}" title="Añade equipo para este modelo a la lista de la compra" style="margin-top:0.5rem;">
          🛒 + Equipo a wishlist
        </button>
      </div>`;
  }

  // Abilities — Companion lists post-resolution names
  const abs = model.companionAbilities || [];
  if (abs.length) {
    html += `
      <div class="detail-section">
        <div class="detail-label">Habilidades</div>
        <div style="display:flex;flex-wrap:wrap;gap:0.4rem;">
          ${abs.map(a => {
            // Try to find a paraphrased description in our libraries
            const desc = (typeof ABILITY_LIBRARY !== 'undefined' && ABILITY_LIBRARY[a.name]) ||
                         (typeof KEYWORD_LIBRARY !== 'undefined' && KEYWORD_LIBRARY[a.name]) ||
                         '';
            const tt = desc ? `title="${escapeHtml(desc)}"` : '';
            return `<span style="display:inline-block;padding:0.2em 0.5em;background:rgba(176,141,87,0.12);font-size:0.8em;color:var(--gold);" ${tt}>★ ${escapeHtml(a.name)}</span>`;
          }).join('')}
        </div>
      </div>`;
  }

  // Companion source info — small, informative
  const sourceUrl = wb.companionSource && wb.companionSource['warband-url'];
  if (sourceUrl) {
    html += `
      <div class="detail-section" style="opacity:0.7;font-size:0.75rem;">
        <div class="detail-label">Origen</div>
        Banda importada de <a href="${escapeHtml(sourceUrl)}" target="_blank" rel="noopener" style="color:var(--gold);">Trench Companion</a>.
        Stats, coste y composición son autoridad de Companion. Forge gestiona la progresión de campaña.
      </div>`;
  }

  // P2/8 — shopping list toggle for Companion-imported models. When
  // the model's unitId resolves to a canon unit we surface the
  // available upgrade list with "+ Lista" / "✓ En lista" toggle
  // buttons. Companion-imported models often retain their unitId
  // mapping, so most cases work. Unmapped custom content shows a
  // graceful notice instead.
  if (canonUnit) {
    const allUpgrades = allAvailableUpgrades(canonUnit, wb);
    if (allUpgrades.length) {
      html += `
        <div class="detail-section" style="margin-top:1rem;">
          <div class="detail-label">Lista de la compra (upgrades canon)</div>
          <p style="color:var(--parchment-dim);font-size:0.75rem;margin:0.25rem 0;">
            Aparca aquí upgrades del unit canon para revisarlos en el
            Quartermaster. Comparación con tu equipo Companion no se
            hace — el toggle es manual.
          </p>
          <div class="upgrades-list">
            ${allUpgrades.map(up => {
              const onList = isInShoppingList(wb, model.uid, up.id);
              const costStr = `+${up.cost} ${up.currency}`;
              return `
                <div class="upgrade-card" style="background:rgba(127,107,67,0.05);">
                  <div class="upgrade-card-header">
                    <div class="upgrade-name">${escapeHtml(up.name)}</div>
                    <div class="upgrade-cost">${costStr}</div>
                  </div>
                  ${up.note ? `<div class="upgrade-note">${up.note.replace(/</g,'&lt;')}</div>` : ''}
                  <div style="margin-top:0.4rem;">
                    <button class="btn" data-shopping-toggle="${up.id}">
                      ${onList ? '✓ En lista' : '+ Lista de la compra'}
                    </button>
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }
  }

  // Progression editor — accessible for ALL Companion models
  html += `
    <div class="detail-section" style="margin-top:1.5rem;">
      <button class="btn btn-toggle" id="btn-toggle-prog" style="width:100%;text-align:left;">
        ${STATE.progressionExpanded ? '▾' : '▸'} Progresión de campaña
      </button>
      <div id="prog-editor" style="margin-top:0.5rem;${STATE.progressionExpanded ? '' : 'display:none;'}"></div>
    </div>`;

  // Notes
  html += `
    <div class="detail-section" style="margin-top:1.5rem;">
      <div class="detail-label">Notas del jugador</div>
      <textarea id="detail-notes" placeholder="XP, lesiones, hazañas, recordatorios de reglas…"
        style="width:100%;min-height:80px;background:var(--ink-black);border:1px solid var(--rust);color:var(--parchment);padding:0.5rem;font-family:var(--font-mono);font-size:0.78rem;">${escapeHtml(model.notes || '')}</textarea>
    </div>`;

  container.innerHTML = html;

  // Render progression editor if expanded
  if (STATE.progressionExpanded) {
    const progEl = document.getElementById('prog-editor');
    if (progEl) renderProgressionEditor(progEl, model, wb);
  }

  // Wire up
  document.getElementById('btn-toggle-prog')?.addEventListener('click', () => {
    STATE.progressionExpanded = !STATE.progressionExpanded;
    renderDetail();
  });
  document.getElementById('detail-custom-name')?.addEventListener('input', (e) => {
    model.customName = e.target.value.trim() || null;
    persistWarband(wb);
    renderRoster();
  });
  document.getElementById('detail-notes')?.addEventListener('input', (e) => {
    model.notes = e.target.value;
    persistWarband(wb);
  });
  // P2/8 — shopping toggle wire in Companion path.
  container.querySelectorAll('[data-shopping-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kitId = btn.dataset.shoppingToggle;
      toggleShoppingListEntry(wb, model.uid, kitId);
      persistWarband(wb);
      renderDetail();
    });
  });
}

function renderDetail() {
  const container = document.getElementById('detail-content');
  const wb = STATE.currentWarband;
  if (!wb || !STATE.selectedModelUid) {
    container.innerHTML = `
      <div class="detail-empty">
        Selecciona un modelo del roster para ver sus stats y editar su equipamiento.
      </div>`;
    return;
  }
  const model = wb.models.find(m => m.uid === STATE.selectedModelUid);
  if (!model) {
    container.innerHTML = `<div class="detail-empty">Modelo no encontrado.</div>`;
    return;
  }

  // Companion-aware path: if the model came from a Trench Companion JSON
  // import, use companionStats/Equipment/Abilities/Keywords as the source
  // of truth. This handles two cases:
  //   (a) Custom regional content (Highland Lieutenant, Iron Wall variants)
  //       where the alias lookup may have mapped to a wrong-ish canon unit
  //       (e.g. Highland Lieutenant → 'lieutenant' base) — we still show
  //       the Companion name and keywords the user actually has.
  //   (b) Truly custom content with no alias — without this path, the user
  //       would see "Unidad no encontrada" and lose access to progression.
  if (model.companionRef) {
    return renderDetailCompanion(container, model, wb);
  }

  const unit = getUnit(wb.factionId, model.unitId);
  if (!unit) {
    container.innerHTML = `<div class="detail-empty">Unidad no encontrada.</div>`;
    return;
  }
  const f = DATA.factions[wb.factionId];

  // Build sections
  let html = '';

  // Custom name editor
  html += `
    <div class="detail-section">
      <div class="detail-label">Nombre personalizado</div>
      <input type="text" class="detail-name-input" id="detail-custom-name"
        value="${(model.customName || '').replace(/"/g,'&quot;')}"
        placeholder="${unit.name}" />
    </div>`;

  // Stats
  if (unit.stats) {
    const effStats = effectiveStats(model, unit);
    const effName = effectiveUnitName(model, unit);
    const baseStats = unit.stats || {};
    const isOverridden = (key) => effStats[key] !== baseStats[key];
    html += `
      <div class="detail-section">
        <div class="detail-label">${effName}${effName !== unit.name ? ' <span class="upgraded-from">(de ' + unit.name + ')</span>' : ''} · ${unit.cost} ${unit.currency}${unit.costAlt ? ' (or ' + unit.costAlt + ')' : ''}</div>
        <div class="stat-block">
          <div class="stat-cell"><div class="label">Movement</div><div class="value${isOverridden('movement') ? ' upgraded-stat' : ''}">${effStats.movement}</div></div>
          <div class="stat-cell"><div class="label">Ranged</div><div class="value${isOverridden('ranged') ? ' upgraded-stat' : ''}">${effStats.ranged}</div></div>
          <div class="stat-cell"><div class="label">Melee</div><div class="value${isOverridden('melee') ? ' upgraded-stat' : ''}">${effStats.melee}</div></div>
          <div class="stat-cell"><div class="label">Armour</div><div class="value${isOverridden('armour') ? ' upgraded-stat' : ''}">${effStats.armour}</div></div>
          <div class="stat-cell"><div class="label">Base</div><div class="value${isOverridden('base') ? ' upgraded-stat' : ''}">${effStats.base}</div></div>
        </div>
      </div>`;
  }

  // Keywords (with tooltips from KEYWORD_LIBRARY) — effective set includes
  // any keywords added by active upgrades (e.g. STRONG from Janissary Veteran)
  const effKeywords = effectiveKeywords(model, unit);
  if (effKeywords.length) {
    html += `
      <div class="detail-section">
        <div class="detail-label">Keywords</div>
        <div class="keywords-row">
          ${effKeywords.map(k => {
            const tooltip = KEYWORD_LIBRARY[k] || '';
            const cls = (k === 'ELITE' || k === 'LEADER') ? 'special' : '';
            const isFromUpgrade = !(unit.keywords || []).includes(k);
            const upgradeMark = isFromUpgrade ? ' upgrade-added' : '';
            return `<span class="keyword-pill ${cls}${upgradeMark}" ${tooltip ? `title="${tooltip.replace(/"/g,'&quot;')}"` : ''}>${k}</span>`;
          }).join('')}
        </div>
      </div>`;
  }

  // Upgrades (e.g. Janissary Veteran for Yüzbaşí, or variant-added like Wrath of God)
  const allUpgrades = allAvailableUpgrades(unit, wb);
  if (allUpgrades.length) {
    const activeIds = model.upgrades || [];
    html += `
      <div class="detail-section">
        <div class="detail-label">Mejoras</div>
        <div class="upgrades-list">
          ${allUpgrades.map(up => {
            const isActive = activeIds.includes(up.id);
            const upCls = classifyUpgrade(up, model, unit, wb);
            const upBlocked = !isActive && upCls.state === 'disabled';
            const costStr = `+${up.cost} ${up.currency}`;
            const variantBadge = up._fromVariant
              ? `<span class="upgrade-variant-badge" title="Mejora de variante">⚜ variante</span>`
              : '';
            const onList = isInShoppingList(wb, model.uid, up.id);
            return `
              <div class="upgrade-card ${isActive ? 'active' : ''} ${up._fromVariant ? 'from-variant' : ''}" data-upgrade-id="${up.id}">
                <div class="upgrade-card-header">
                  <div class="upgrade-name">${up.name} ${variantBadge}</div>
                  <div class="upgrade-cost">${costStr}</div>
                </div>
                ${up.note ? `<div class="upgrade-note">${up.note.replace(/</g,'&lt;')}</div>` : ''}
                <div class="upgrade-effects">
                  ${(up.addsKeywords || []).map(k => `<span class="upgrade-tag keyword">+${k}</span>`).join('')}
                  ${(up.addsAbilities || []).map(a => `<span class="upgrade-tag ability">+${a}</span>`).join('')}
                </div>
                <div style="display:flex;gap:0.4rem;flex-wrap:wrap;margin-top:0.4rem;">
                  <button class="btn ${isActive ? 'btn-primary' : ''}" data-toggle-upgrade="${up.id}"${upBlocked ? ` disabled title="${upCls.reason.replace(/"/g,'&quot;')}"` : ''}>
                    ${isActive ? '✓ Activo' : 'Activar'}
                  </button>
                  ${upBlocked ? `<span class="upgrade-note">${upCls.reason.replace(/</g,'&lt;')}</span>` : ''}
                  ${!isActive ? `<button class="btn" data-shopping-toggle="${up.id}" title="Añade/quita este upgrade a la lista de la compra de la banda">
                    ${onList ? '✓ En lista' : '+ Lista de la compra'}
                  </button>` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>`;
  }

  // Abilities (paraphrased + user notes) — effective list includes upgrade abilities.
  // Companion-imported models: TC es fuente oficial. displayAbilitiesForCard
  // evita el bug Silahdar (alias yuzbasi inyectaba Mubarizun).
  const unitAbilities = displayAbilitiesForCard(model, unit).map(a => a.name);
  // Plus advancements bought via campaign progression base
  const baseAdvancements = (model.baseProgression && model.baseProgression.advancements) || [];
  if (unitAbilities.length || baseAdvancements.length) {
    html += `
      <div class="detail-section">
        <div class="detail-label">Habilidades</div>
        <div class="abilities-list" id="abilities-list"></div>
      </div>`;
  }

  // Cost variant for Mech Heavy Inf
  if (unit.costAlt && unitCostAltAllowed(wb, unit)) {
    html += `
      <div class="detail-section">
        <div class="detail-label">Variante de coste</div>
        <div style="display:flex;gap:0.4rem;">
          <button class="btn ${(!model.costVariant || model.costVariant==='base') ? 'btn-primary' : ''}" data-variant="base">${unit.cost} 👑 (Reinforced)</button>
          <button class="btn ${model.costVariant==='alt' ? 'btn-primary' : ''}" data-variant="alt">${unit.costAlt} 👑 (Machine)</button>
        </div>
      </div>`;
  }

  // Permanent equipment badge (Combat Engineers, MHI, Anchorite Shrine, etc.)
  const permEq = ((wb && getUnitWithVariant(wb, unit.id)) || unit).permanentEquipment;
  if (permEq && permEq.length) {
    html += `
      <div class="detail-section">
        <div class="detail-label">Equipo permanente</div>
        <div class="permanent-equipment">
          ${permEq.map(name => `<span class="perm-item">⚓ ${name}</span>`).join('')}
        </div>
      </div>`;
  }

  // Battlekit selector — only for non-mercenaries
  // Mercenarios sin selector, salvo los que compran armas (Scripture Guardian)
  const isMerc = unit.tier === undefined && !(unit.battlekitAccess && unit.battlekitAccess.onlyCategories);
  const bkNote = ((wb && getUnitWithVariant(wb, unit.id)) || unit).battlekitNote;
  if (!isMerc && bkNote) {
    html += `<div class="notice info">${bkNote}</div>`;
  }
  if (!isMerc) {
    const access = unitBattlekitAccess(wb, unit);

    // Forbidden: skip the picker entirely with a clean message
    if (access.forbidden) {
      html += `<div class="detail-label">Battlekit</div>`;
      html += `<div class="notice info" style="text-align:center;">⚓ Equipo fijo · Esta unidad no compra Battlekit adicional.</div>`;
    } else {
    // === Loadout summary at the top of battlekit ===
    const loadout = modelLoadoutSummary(wb, model, unit);
    const limits = getWeaponLimits(model, unit, wb);
    const slotChip = (label, count, max) => {
      const at = max && count >= max;
      return `<span class="slot-chip ${at ? 'full' : ''}">${label} <strong>${count}${max ? '/' + max : ''}</strong></span>`;
    };
    const cap = access.costCap;
    // Canonical maxes: melee/ranged from limits (default 2, reduced to 1 with
    // shield, custom if override); grenades=1 (one type); shield=1 (one shield).
    // Total cap (e.g. Amalgam=6) is shown via the loadout-cost line below.
    const meleeMax = limits.totalMax !== null ? limits.totalMax : limits.meleeMax;
    const rangedMax = limits.totalMax !== null ? limits.totalMax : limits.rangedMax;
    let loadoutBar = `
      <div class="loadout-summary">
        <div class="loadout-row">
          ${slotChip('⚔ Cuerpo a cuerpo', loadout.counts.melee, meleeMax)}
          ${slotChip('🎯 A distancia',    loadout.counts.ranged, rangedMax)}
          ${slotChip('💣 Granadas',       loadout.counts.grenades, 1)}
          ${slotChip('🛡 Escudo',         loadout.counts.shields, 1)}
          ${slotChip('⛨ Armadura',        loadout.counts.armour, 1)}
          ${slotChip('🪖 Cabeza',         loadout.hasHeadgear ? 1 : 0, 1)}
          ${slotChip('🎒 Equipo',         loadout.counts.equipment)}
        </div>
        <div class="loadout-cost">
          Battlekit: <strong>${loadout.battlekitCost} 👑</strong>${loadout.battlekitGlory ? ` · <strong>${loadout.battlekitGlory} ☼</strong>` : ''}
          ${cap ? ` · <span class="${(cap.currency==='👑'?loadout.battlekitCost:loadout.battlekitGlory) >= cap.max ? 'cap-full' : ''}">cap: ${(cap.currency==='👑'?loadout.battlekitCost:loadout.battlekitGlory)}/${cap.max} ${cap.currency}</span>` : ''}
        </div>
      </div>`;

    html += `<div class="detail-label">Battlekit (Compras legales para esta unidad)</div>`;
    html += loadoutBar;

    const cats = [
      ['ranged', 'Ranged Weapons'],
      ['melee', 'Melee Weapons'],
      ['grenades', 'Grenades'],
      ['shields', 'Shields'],
      ['armour', 'Armour'],
      ['equipment', 'Equipment'],
    ];
    // Append Anchorite-specific categories ONLY for the Anchorite Shrine
    if (unit && unit.id === 'anchorite-shrine') {
      cats.push(['anchoriteRanged', 'Anchorite Ranged Weapons']);
      cats.push(['anchoriteBattlekit', 'Anchorite Battlekit']);
    }

    let totalAvailable = 0;
    let categoryHTML = '';
    for (const [key, label] of cats) {
      const items = armouryItemsForWarband(wb, key);
      if (!items.length) continue;
      // First, classify all items in this category
      const classified = items.map(item => ({
        item,
        cls: classifyBattlekitItem(item, model, unit, wb),
      }));
      // Filter out hidden ones
      const visible = classified.filter(c => c.cls.state !== 'hidden');
      if (!visible.length) continue;

      const availCount = visible.filter(c =>
        c.cls.state === 'available' || c.cls.state === 'equipped').length;
      totalAvailable += availCount;

      categoryHTML += `<div class="battlekit-section">
        <h4>${label} <span class="bk-cat-count">${availCount} disp.</span></h4>`;
      for (const { item, cls } of visible) {
        const stateClass = cls.state; // 'available' | 'equipped' | 'disabled'
        const currencyClass = item.currency === '☼' ? 'glory' : '';
        const reasonHTML = cls.state === 'disabled'
          ? `<div class="bk-reason">${cls.reason}</div>`
          : '';
        categoryHTML += `
          <div class="battlekit-item ${stateClass}" data-kit="${item.id}" data-state="${cls.state}">
            <div class="bk-main">
              <div class="bk-line">
                <span class="bk-name">${item.name}</span>
                ${item.restriction ? `<span class="bk-restriction">${item.restriction}</span>` : ''}
              </div>
              ${reasonHTML}
            </div>
            <span class="bk-cost ${currencyClass}">${battlekitPurchaseCost(wb, item, model)} ${item.currency}</span>
          </div>`;
      }
      categoryHTML += `</div>`;
    }
    // Weapon Collections (House of Wisdom): other armouries
    for (const grp of foreignArmouryItems(wb)) {
      const visible = grp.items
        .map(item => ({ item, cls: classifyBattlekitItem(item, model, unit, wb) }))
        .filter(c => c.cls.state !== 'hidden');
      if (!visible.length) continue;
      const availCount = visible.filter(c =>
        c.cls.state === 'available' || c.cls.state === 'equipped').length;
      totalAvailable += availCount;
      categoryHTML += '<div class="battlekit-section"><h4>' + grp.label + ': ' + grp.name +
        ' <span class="bk-cat-count">máx. ' + grp.max + ' en la banda</span></h4>';
      for (const { item, cls } of visible) {
        const currencyClass = item.currency === '☼' ? 'glory' : '';
        categoryHTML +=
          '<div class="battlekit-item ' + cls.state + '" data-kit="' + item.id + '" data-state="' + cls.state + '">' +
            '<div class="bk-main"><div class="bk-line"><span class="bk-name">' + item.name + '</span>' +
            (item.restriction ? '<span class="bk-restriction">' + item.restriction + '</span>' : '') + '</div>' +
            (cls.state === 'disabled' ? '<div class="bk-reason">' + cls.reason + '</div>' : '') + '</div>' +
            '<span class="bk-cost ' + currencyClass + '">' + item.cost + ' ' + item.currency + '</span>' +
          '</div>';
      }
      categoryHTML += '</div>';
    }

    if (totalAvailable === 0 && !(model.battlekit || []).length) {
      html += `<div class="notice info">No hay equipo disponible para esta unidad. Probablemente es una unidad sin Battlekit (consulta sus reglas).</div>`;
    } else {
      html += categoryHTML;
    }
    } // end !forbidden
  } else {
    html += `<div class="notice info">Los mercenarios no usan Battlekit por defecto. Consulta sus reglas individuales.</div>`;
  }

  // ---- Progresión inicial (editable) ----
  const bp = model.baseProgression || null;
  const hasProg = bp && (
    (bp.xp || 0) > 0 ||
    (bp.kills || 0) > 0 ||
    (bp.advancements || []).length > 0 ||
    (bp.scars || []).length > 0 ||
    (bp.status && bp.status !== 'alive')
  );
  html += `
    <div class="detail-section" style="margin-top:1.5rem;">
      <div class="detail-label" style="display:flex;justify-content:space-between;align-items:center;">
        <span>Progresión inicial${hasProg ? ' <span style="color:var(--faithful-gold);font-weight:400;">●</span>' : ''}</span>
        <button class="btn btn-icon" id="btn-toggle-prog" style="font-size:0.6rem;">${STATE.progressionExpanded ? '▼ ocultar' : '▶ editar'}</button>
      </div>
      <div id="prog-editor" style="${STATE.progressionExpanded ? '' : 'display:none;'}"></div>
    </div>`;

  // Notes
  html += `
    <div class="detail-section" style="margin-top:1.5rem;">
      <div class="detail-label">Notas del jugador</div>
      <textarea id="detail-notes" placeholder="XP, lesiones, hazañas, recordatorios de reglas…"
        style="width:100%;min-height:80px;background:var(--ink-black);border:1px solid var(--rust);color:var(--parchment);padding:0.5rem;font-family:var(--font-mono);font-size:0.78rem;">${(model.notes || '').replace(/</g,'&lt;')}</textarea>
    </div>`;

  container.innerHTML = html;

  // Render abilities list (paraphrased + per-ability user notes)
  const abilitiesEl = document.getElementById('abilities-list');
  if (abilitiesEl) {
    renderAbilitiesList(abilitiesEl, model, unit, wb);
  }

  // Render progression editor if expanded
  if (STATE.progressionExpanded) {
    renderProgressionEditor(document.getElementById('prog-editor'), model, wb);
  }
  document.getElementById('btn-toggle-prog')?.addEventListener('click', () => {
    STATE.progressionExpanded = !STATE.progressionExpanded;
    renderDetail();
  });

  // Wire up
  document.getElementById('detail-custom-name').addEventListener('input', (e) => {
    model.customName = e.target.value.trim() || null;
    persistWarband(wb);
    renderRoster();
  });
  document.getElementById('detail-notes')?.addEventListener('input', (e) => {
    model.notes = e.target.value;
    persistWarband(wb);
  });
  container.querySelectorAll('.battlekit-item').forEach(it => {
    it.addEventListener('click', () => {
      const state = it.dataset.state;
      // Disabled items can't be added; equipped/available toggle freely
      if (state === 'disabled') return;
      const kid = it.dataset.kit;
      model.battlekit = model.battlekit || [];
      const idx = model.battlekit.indexOf(kid);
      if (idx >= 0) model.battlekit.splice(idx, 1);
      else model.battlekit.push(kid);
      persistWarband(wb);
      renderAll();
    });
  });
  container.querySelectorAll('[data-variant]').forEach(btn => {
    btn.addEventListener('click', () => {
      model.costVariant = btn.dataset.variant;
      persistWarband(wb);
      renderAll();
    });
  });
  // Fase 6.2 — Shopping list toggle on upgrade cards. Persists + re-renders.
  container.querySelectorAll('[data-shopping-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const kitId = btn.dataset.shoppingToggle;
      toggleShoppingListEntry(wb, model.uid, kitId);
      persistWarband(wb);
      renderDetail();
    });
  });
  container.querySelectorAll('[data-toggle-upgrade]').forEach(btn => {
    btn.addEventListener('click', () => {
      const upId = btn.dataset.toggleUpgrade;
      if (!model.upgrades) model.upgrades = [];
      // Find the upgrade definition (could be from unit OR from variant)
      const allUps = allAvailableUpgrades(unit, wb);
      const upgradeDef = allUps.find(u => u.id === upId);
      const idx = model.upgrades.indexOf(upId);
      if (idx >= 0) {
        // Already active: deactivate it
        model.upgrades.splice(idx, 1);
      } else {
        if (upgradeDef && classifyUpgrade(upgradeDef, model, unit, wb).state === 'disabled') return;
        // Activating: if this upgrade has a mutuallyExclusiveGroup,
        // deactivate any other upgrade in the same group first.
        if (upgradeDef && upgradeDef.mutuallyExclusiveGroup) {
          const group = upgradeDef.mutuallyExclusiveGroup;
          const siblingIds = allUps
            .filter(u => u.id !== upId && u.mutuallyExclusiveGroup === group)
            .map(u => u.id);
          model.upgrades = model.upgrades.filter(id => !siblingIds.includes(id));
        }
        model.upgrades.push(upId);
      }
      persistWarband(wb);
      renderAll();
    });
  });
}

/**
 * Render the editable "initial progression" panel for a model.
 * Lets the user import a warband from paper or fix mistakes mid-campaign:
 * XP, kills, advancement pills, scar pills, status.
 */
/**
 * Render abilities list for a model: each ability is a card with
 * name, paraphrased summary, and a textarea for the user's own notes.
 * Includes both unit abilities and advancements bought via base progression.
 */
function renderAbilitiesList(container, model, unit, wb) {
  // Effective abilities = base unit abilities + abilities added by active upgrades.
  // Companion-imported models: la lista canon viene del JSON de TC; los
  // upgrades de Forge no aplican (su variant rules ya están en la lista).
  const hasCompanion = !!(model.companionStats || (Array.isArray(model.companionAbilities) && model.companionAbilities.length));
  const baseAdvancements = (model.baseProgression && model.baseProgression.advancements) || [];

  // Sources: 'unit' (innate / canon TC), 'upgrade' (from active upgrade en
  // bandas nativas), 'advancement' (★ progression).
  const items = [];
  if (hasCompanion) {
    const companionList = displayAbilitiesForCard(model, unit);
    for (const a of companionList) items.push({ name: a.name, source: 'unit' });
  } else {
    const baseAbilities = unit.abilities || [];
    const upgradeAdded = [];
    for (const up of activeUpgrades(model, unit, wb)) {
      for (const a of (up.addsAbilities || [])) {
        if (!baseAbilities.includes(a) && !upgradeAdded.includes(a)) {
          upgradeAdded.push(a);
        }
      }
    }
    for (const name of baseAbilities) items.push({ name, source: 'unit' });
    for (const name of upgradeAdded) items.push({ name, source: 'upgrade' });
  }
  for (const adv of baseAdvancements) {
    items.push({ name: adv.name, source: 'advancement' });
  }

  if (!items.length) {
    container.innerHTML = `<div class="abilities-empty">Esta unidad no tiene habilidades especiales registradas.</div>`;
    return;
  }

  // Ensure abilityNotes object exists on the model
  if (!model.abilityNotes) model.abilityNotes = {};

  let html = '';
  for (let i = 0; i < items.length; i++) {
    const { name, source } = items[i];
    const lib = ABILITY_LIBRARY[name];
    const summary = lib ? lib.summary : '';
    const type = lib ? lib.type : null;
    const expanded = (STATE.expandedAbilities || {})[name] === true;
    const userNote = (model.abilityNotes[name] || '').replace(/</g, '&lt;');
    const typeIcon = type === 'action' ? '⚡' : type === 'campaign' ? '🗓' : type === 'passive' ? '◊' : '';
    let sourceTag = '';
    if (source === 'advancement') {
      sourceTag = `<span class="ability-source">★ ascenso</span>`;
    } else if (source === 'upgrade') {
      sourceTag = `<span class="ability-source upgrade-source">⊕ mejora</span>`;
    }

    html += `
      <div class="ability-card ${source}" data-ability-key="${name.replace(/"/g,'&quot;')}">
        <div class="ability-card-header" data-toggle="${i}">
          <div class="ability-name">
            ${typeIcon ? `<span class="ability-type">${typeIcon}</span>` : ''}
            ${name}
            ${sourceTag}
          </div>
          <button class="ability-expand" data-i="${i}">${expanded ? '▼' : '▶'}</button>
        </div>
        <div class="ability-body" id="ability-body-${i}" style="${expanded ? '' : 'display:none;'}">
          ${summary ? `<div class="ability-summary">${summary}</div>` : '<div class="ability-summary ability-summary-missing">(Sin paráfrasis breve · consulta el reglamento)</div>'}
          <label class="ability-note-label">Tus notas:</label>
          <textarea
            class="ability-note"
            data-name="${name.replace(/"/g,'&quot;')}"
            placeholder="Pega aquí el texto del reglamento o tus apuntes…"
          >${userNote}</textarea>
        </div>
      </div>
    `;
  }
  container.innerHTML = html;

  // Wire up: toggle expand
  if (!STATE.expandedAbilities) STATE.expandedAbilities = {};
  container.querySelectorAll('[data-toggle]').forEach(h => {
    h.addEventListener('click', () => {
      const i = parseInt(h.dataset.toggle, 10);
      const name = items[i].name;
      STATE.expandedAbilities[name] = !STATE.expandedAbilities[name];
      const body = container.querySelector('#ability-body-' + i);
      const btn  = container.querySelector(`[data-i="${i}"]`);
      if (STATE.expandedAbilities[name]) {
        body.style.display = '';
        if (btn) btn.textContent = '▼';
      } else {
        body.style.display = 'none';
        if (btn) btn.textContent = '▶';
      }
    });
  });
  // Wire up: textarea persists
  container.querySelectorAll('.ability-note').forEach(ta => {
    ta.addEventListener('input', (e) => {
      const name = ta.dataset.name;
      model.abilityNotes[name] = e.target.value;
      persistWarband(wb);
    });
    // Click on textarea shouldn't bubble up to header toggle
    ta.addEventListener('click', e => e.stopPropagation());
  });
}


function renderProgressionEditor(container, model, wb) {
  if (!model.baseProgression) {
    model.baseProgression = { xp: 0, kills: 0, advancements: [], scars: [], status: 'alive' };
  }
  const bp = model.baseProgression;
  // Ensure arrays exist
  bp.advancements = bp.advancements || [];
  bp.scars = bp.scars || [];
  bp.gloriousDeeds = bp.gloriousDeeds || [];

  const earnedAdv = advancementsEarned(bp.xp || 0);
  const next = nextXpThreshold(bp.xp || 0);

  // Canon constraints from CAMPAIGN_TABLES
  const xpCap = xpCapFor(wb.factionId, model.unitId);
  const hasXpCap = xpCap !== Infinity;
  const cannotPromote = !canBePromoted(wb.factionId, model.unitId);
  const overCap = hasXpCap && (bp.xp || 0) > xpCap;
  const scarCount = (bp.scars || []).filter(s => s.source === 'trauma').length;
  const unfit = scarCount >= unfitScarThreshold(model);

  // Build a constraint banner if relevant
  let banner = '';
  if (cannotPromote || hasXpCap || unfit) {
    const lines = [];
    if (cannotPromote) lines.push('⛔ <strong>No puede ascender</strong> a ELITE (canon)');
    if (hasXpCap)      lines.push(`⚠ <strong>Limited Potential</strong>: máx ${xpCap} XP${overCap ? ' <span style="color:var(--fallen-blood-bright);">(¡superado!)</span>' : ''}`);
    if (unfit)         lines.push(`💀 <strong>Unfit for Duty</strong>: ${scarCount} Battle Scars (canon: 3 = retirado)`);
    banner = `<div style="background:rgba(193,60,48,0.15);border:1px solid var(--fallen-blood);
      border-radius:3px;padding:0.5rem 0.7rem;margin-bottom:0.5rem;
      font-size:0.78rem;color:var(--parchment-bright);line-height:1.5;">
      ${lines.join('<br>')}
    </div>`;
  }

  let html = `
    <div class="prog-editor">
      ${banner}
      <div class="prog-editor-row">
        <label>XP inicial</label>
        <input type="number" min="0" max="999" id="bp-xp" value="${bp.xp || 0}" />
        <span class="prog-editor-hint">${earnedAdv} ascensos · ${next ? 'próx. en ' + next : 'max'}${hasXpCap ? ` · cap ${xpCap}` : ''}</span>
      </div>
      <div class="prog-editor-row">
        <label>Kills</label>
        <input type="number" min="0" max="999" id="bp-kills" value="${bp.kills || 0}" />
      </div>
      <div class="prog-editor-row">
        <label>Status</label>
        <select id="bp-status">
          <option value="alive"      ${bp.status==='alive'?'selected':''}>Vivo</option>
          <option value="recovering" ${bp.status==='recovering'?'selected':''}>Recuperándose</option>
          <option value="captured"   ${bp.status==='captured'?'selected':''}>Capturado</option>
          <option value="dead"       ${bp.status==='dead'?'selected':''}>Muerto</option>
        </select>
      </div>

      <div class="prog-editor-section">
        <div class="prog-editor-label">Ascensos (★)</div>
        <div class="prog-pills" id="bp-adv-pills"></div>
        <div class="prog-editor-row" style="margin-top:0.4rem;">
          <select id="bp-adv-preset">
            <option value="">— elegir preset —</option>
            ${CAMPAIGN_TABLES.advancements.filter(a => a.id !== 'custom').map(a =>
              `<option value="${a.name}">${a.name}</option>`).join('')}
          </select>
          <input type="text" id="bp-adv-custom" placeholder="o escribe libre…" />
          <button class="btn btn-icon" id="bp-adv-add">+ Añadir</button>
        </div>
        <button class="btn-roll-advance" id="bp-adv-roll" style="margin-top:0.5rem;">
          🎲 Tirar Advancement Roll (2 Skill Tables)
        </button>
      </div>

      <div class="prog-editor-section">
        <div class="prog-editor-label">Cicatrices (⚕)</div>
        <div class="prog-pills" id="bp-scar-pills"></div>
        <div class="prog-editor-row" style="margin-top:0.4rem;">
          <select id="bp-scar-preset">
            <option value="">— elegir preset —</option>
            ${CAMPAIGN_TABLES.statDownOptions.map(s =>
              `<option value="${s.name}">${s.name}</option>`).join('')}
            <option value="Old Battle Wound">Old Battle Wound</option>
            <option value="Light Wound">Light Wound</option>
          </select>
          <input type="text" id="bp-scar-custom" placeholder="o escribe libre…" />
          <button class="btn btn-icon" id="bp-scar-add">+ Añadir</button>
        </div>
        <button class="btn-roll-advance" id="bp-trauma-roll" style="margin-top:0.5rem;">
          🎲 Tirar Trauma Roll (D66)
        </button>
      </div>

      <div class="prog-editor-section">
        <div class="prog-editor-label">Glorious Deeds (☼)</div>
        <div class="prog-pills" id="bp-deeds-pills"></div>
        <div class="prog-editor-row" style="margin-top:0.4rem;">
          <input type="text" id="bp-deed-name" placeholder="Nombre de la gesta…" style="flex:1;"
            list="canonical-deeds-list" autocomplete="off" />
          <datalist id="canonical-deeds-list">
            ${(CAMPAIGN_TABLES.canonicalGloriousDeeds || []).map(d =>
              `<option value="${d.name}">${d.summary}</option>`
            ).join('')}
          </datalist>
          <input type="number" id="bp-deed-game" min="0" max="20" placeholder="Game"
            value="${wb.gameNumber || ''}" style="width:55px;" title="Número de partida (opcional)" />
          <button class="btn btn-icon" id="bp-deed-add">+ Añadir</button>
          <button class="btn btn-icon" id="bp-deed-canon" title="Lista canónica de Glorious Deeds" style="font-size:1rem;">📖</button>
        </div>
        <div class="prog-editor-hint" style="margin-top:0.3rem;font-size:0.7rem;color:var(--parchment-dim);">
          Cada Glorious Deed da 1 ☼ a la banda, +1 dado al Promotion Pool y, si es ELITE, +1 XP extra (máx. 1 por partida).
        </div>
      </div>

      <div class="prog-editor-actions">
        ${(() => {
          // Show a Promote button for eligible Troops, or an "Unpromote" for those already ELITE-via-promotion
          const u = getUnit(wb.factionId, model.unitId);
          if (!u) return '';
          const isPromoted = !!(bp.promotedToElite);
          const isInnateElite = u.tier === 'elite';
          const canPromote = u.tier === 'troops' && canBePromoted(wb.factionId, model.unitId);
          if (isInnateElite) return '';
          if (isPromoted) {
            return `<button class="btn" id="bp-unpromote" title="Revertir promoción a ELITE">↩ Quitar ELITE</button>`;
          }
          if (canPromote) {
            return `<button class="btn-roll-advance" id="bp-promote-quick"
              style="margin:0;width:auto;padding:0.45rem 0.7rem;font-size:0.7rem;">
              ★ Ascender a ELITE
            </button>`;
          }
          return '';
        })()}
        <button class="btn btn-danger" id="bp-reset">↺ Resetear progresión</button>
      </div>
    </div>
  `;
  container.innerHTML = html;

  // Render pills
  function renderPills() {
    const advEl = container.querySelector('#bp-adv-pills');
    const scarEl = container.querySelector('#bp-scar-pills');
    const deedsEl = container.querySelector('#bp-deeds-pills');
    advEl.innerHTML = bp.advancements.length
      ? bp.advancements.map((a, i) =>
          `<span class="adv-pill removable">★ ${a.name}<button class="pill-remove" data-adv-i="${i}" title="Quitar">×</button></span>`
        ).join('')
      : '<span class="prog-editor-hint">Ninguno</span>';
    scarEl.innerHTML = bp.scars.length
      ? bp.scars.map((s, i) =>
          `<span class="scar-pill removable">⚕ ${s.name}<button class="pill-remove" data-scar-i="${i}" title="Quitar">×</button></span>`
        ).join('')
      : '<span class="prog-editor-hint">Ninguna</span>';
    if (deedsEl) {
      deedsEl.innerHTML = bp.gloriousDeeds.length
        ? bp.gloriousDeeds.map((d, i) =>
            `<span class="deed-pill removable">☼ ${d.name}${d.game ? ` <span style="opacity:0.6;">(G${d.game})</span>` : ''}<button class="pill-remove" data-deed-i="${i}" title="Quitar">×</button></span>`
          ).join('')
        : '<span class="prog-editor-hint">Ninguna</span>';
    }
    advEl.querySelectorAll('[data-adv-i]').forEach(b => {
      b.addEventListener('click', () => {
        bp.advancements.splice(parseInt(b.dataset.advI, 10), 1);
        persistWarband(wb);
        renderProgressionEditor(container, model, wb);
        renderRoster();
      });
    });
    scarEl.querySelectorAll('[data-scar-i]').forEach(b => {
      b.addEventListener('click', () => {
        bp.scars.splice(parseInt(b.dataset.scarI, 10), 1);
        persistWarband(wb);
        renderProgressionEditor(container, model, wb);
        renderRoster();
      });
    });
    if (deedsEl) {
      deedsEl.querySelectorAll('[data-deed-i]').forEach(b => {
        b.addEventListener('click', () => {
          bp.gloriousDeeds.splice(parseInt(b.dataset.deedI, 10), 1);
          persistWarband(wb);
          renderProgressionEditor(container, model, wb);
          renderRoster();
        });
      });
    }
  }
  renderPills();

  // Bindings
  container.querySelector('#bp-xp').addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    if (Number.isFinite(v) && v >= 0) {
      bp.xp = v;
      persistWarband(wb);
      // Re-render to update threshold hint
      const hint = container.querySelector('.prog-editor-hint');
      if (hint) {
        const ea = advancementsEarned(v);
        const nx = nextXpThreshold(v);
        hint.textContent = `${ea} ascensos · ${nx ? 'próx. en ' + nx : 'max'}`;
      }
    }
  });
  container.querySelector('#bp-kills').addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10);
    if (Number.isFinite(v) && v >= 0) { bp.kills = v; persistWarband(wb); }
  });
  container.querySelector('#bp-status').addEventListener('change', (e) => {
    bp.status = e.target.value;
    persistWarband(wb);
    renderRoster();
  });
  container.querySelector('#bp-adv-add').addEventListener('click', () => {
    const preset = container.querySelector('#bp-adv-preset').value;
    const custom = container.querySelector('#bp-adv-custom').value.trim();
    const name = custom || preset;
    if (!name) { alert('Selecciona un preset o escribe el nombre'); return; }
    // If from preset, find its id (so we can apply the mechanical effect).
    // Custom text goes in as a free-form name with no id (no mechanical effect).
    const presetDef = preset
      ? CAMPAIGN_TABLES.advancements.find(a => a.name === preset)
      : null;
    const entry = { name, source: 'base' };
    if (presetDef && presetDef.id !== 'custom') entry.id = presetDef.id;
    bp.advancements.push(entry);
    container.querySelector('#bp-adv-preset').value = '';
    container.querySelector('#bp-adv-custom').value = '';
    persistWarband(wb);
    renderPills();
    renderRoster();
  });
  container.querySelector('#bp-scar-add').addEventListener('click', () => {
    const preset = container.querySelector('#bp-scar-preset').value;
    const custom = container.querySelector('#bp-scar-custom').value.trim();
    const name = custom || preset;
    if (!name) { alert('Selecciona un preset o escribe el nombre'); return; }
    // Look up preset id from statDownOptions
    const presetDef = preset
      ? CAMPAIGN_TABLES.statDownOptions.find(s => s.name === preset)
      : null;
    const entry = { name, source: 'base' };
    if (presetDef) entry.id = presetDef.id;
    bp.scars.push(entry);
    container.querySelector('#bp-scar-preset').value = '';
    container.querySelector('#bp-scar-custom').value = '';
    persistWarband(wb);
    renderPills();
    renderRoster();
  });
  container.querySelector('#bp-reset').addEventListener('click', () => {
    confirmModal({
      title: 'Resetear progresión',
      message: `¿Eliminar XP, kills, ascensos y cicatrices iniciales de ${model.customName || '(este modelo)'}?`,
      confirmText: 'Resetear',
      onConfirm: () => {
        delete model.baseProgression;
        persistWarband(wb);
        renderDetail();
        renderRoster();
      }
    });
  });

  // Skill Tables roller
  container.querySelector('#bp-adv-roll').addEventListener('click', () => {
    openAdvancementRollModal(model, wb, (entry) => {
      bp.advancements.push(entry);
      persistWarband(wb);
      renderProgressionEditor(container, model, wb);
      renderRoster();
    });
  });

  // Trauma D66 roller
  container.querySelector('#bp-trauma-roll').addEventListener('click', () => {
    openTraumaRollModal(model, wb, (entry, roll) => {
      // Decide what to do based on the kind of trauma:
      //   - death       → set status to 'dead'
      //   - capture     → set status to 'captured'
      //   - recovery    → no scar (just informational)
      //   - positive    → if mechanicalEffect is gain-keyword, add as a positive advancement
      //   - scar / lost-* → add as a scar
      if (!entry) return;
      if (entry.kind === 'death') {
        bp.status = 'dead';
        bp.scars.push({ name: `Muerto (D66 ${roll.value} - ${entry.name})`, source: 'trauma' });
      } else if (entry.kind === 'capture') {
        bp.status = 'captured';
        bp.scars.push({ name: `Capturado (D66 ${roll.value})`, source: 'trauma' });
      } else if (entry.kind === 'recovery') {
        // Full Recovery: no scar, no advancement, just a note
        // (We could add a one-shot "recovered" pill, but it would be visual noise.)
      } else if (entry.kind === 'positive') {
        // 64 Hardened gives NEGATE FEAR; 65 Bitter Lessons gives D3 XP; 66 Prominent Scar gives a buff.
        // Treat them as advancements (★) since they are not penalties.
        const adv = { name: entry.name, source: 'trauma', traumaRoll: roll.value };
        if (entry.mechanicalEffect && entry.mechanicalEffect.startsWith('gain-keyword:')) {
          const kw = entry.mechanicalEffect.split(':')[1];
          const idMap = { 'NEGATE FEAR':'fearless', 'TOUGH':'tough', 'LEADER':'leader' };
          const legacyId = idMap[kw];
          if (legacyId) adv.id = legacyId;
          adv.grantsKeyword = kw;
        }
        bp.advancements.push(adv);
      } else {
        // scar / lost-game / lost-equipment / etc.
        const scar = { name: `${entry.name} (D66 ${roll.value})`, source: 'trauma' };
        if (entry.mechanicalEffect) scar.id = entry.mechanicalEffect;
        bp.scars.push(scar);
      }
      persistWarband(wb);
      renderProgressionEditor(container, model, wb);
      renderRoster();
    });
  });

  // Glorious Deeds: add button.
  // Per canon (page 98): each Glorious Deed performed by a model adds 1 ☼ to
  // the band's pool, +1 D6 to the Promotion Pool, and (if ELITE) +1 XP extra
  // (max 1 extra per model per game). The deed's name is informational; the
  // (optional) game number lets the user track the campaign timeline.
  const deedAddBtn = container.querySelector('#bp-deed-add');
  const deedCanonBtn = container.querySelector('#bp-deed-canon');
  if (deedCanonBtn) {
    deedCanonBtn.addEventListener('click', () => {
      openCanonicalDeedsPicker(model, wb, container, (chosenName) => {
        const nameEl = container.querySelector('#bp-deed-name');
        if (nameEl) nameEl.value = chosenName;
        // Auto-trigger the add button so the user gets a one-click flow
        deedAddBtn?.click();
      });
    });
  }
  if (deedAddBtn) {
    deedAddBtn.addEventListener('click', () => {
      const nameEl = container.querySelector('#bp-deed-name');
      const gameEl = container.querySelector('#bp-deed-game');
      const name = (nameEl?.value || '').trim();
      if (!name) {
        alert('Indica el nombre de la gesta (ej. "Killer Instinct", "Trophy Hunter"...)');
        return;
      }
      const gameVal = parseInt(gameEl?.value, 10);
      const entry = { name };
      if (Number.isFinite(gameVal) && gameVal > 0) entry.game = gameVal;
      bp.gloriousDeeds.push(entry);
      // Auto-grant: +1 ☼ to band's Glory pool (canon "Each time you carry out
      // a Glorious Deed in a campaign, your Warband gains 1 ☼")
      wb.startingGlory = (wb.startingGlory || 0) + 1;
      // Auto-grant: +1 XP extra for ELITE (max 1 extra per game). We use a
      // per-game guard: track which games we've already granted bonus XP for,
      // and skip if this game already gave the bonus.
      const isElite = isModelElite(model, wb);
      if (isElite && gameVal) {
        bp.eliteXpBonusGames = bp.eliteXpBonusGames || [];
        if (!bp.eliteXpBonusGames.includes(gameVal)) {
          bp.eliteXpBonusGames.push(gameVal);
          bp.xp = (bp.xp || 0) + 1;
        }
      }
      // Reset inputs
      if (nameEl) nameEl.value = '';
      // Keep gameNumber pre-filled for fast multi-deed entry
      persistWarband(wb);
      renderProgressionEditor(container, model, wb);
      renderRoster();
    });
  }

  // Quick-promote button (single-model promotion without the dice modal — useful
  // when the user just wants to mark this Troop as ELITE manually).
  const quickPromoteBtn = container.querySelector('#bp-promote-quick');
  if (quickPromoteBtn) {
    quickPromoteBtn.addEventListener('click', () => {
      const eliteCount = countEliteInWarband(wb);
      if (eliteCount >= CAMPAIGN_TABLES.promotionRules.maxElites) {
        alert(`Ya tienes ${eliteCount} modelos ELITE en la banda. El máximo canónico es ${CAMPAIGN_TABLES.promotionRules.maxElites}.`);
        return;
      }
      confirmModal({
        title: 'Ascender a ELITE',
        message: `¿Ascender a ${model.customName || getUnit(wb.factionId, model.unitId)?.name} a ELITE? Empezará con 0 XP (canon).`,
        confirmText: 'Ascender',
        onConfirm: () => {
          promoteModel(model);
          persistWarband(wb);
          renderProgressionEditor(container, model, wb);
          renderRoster();
          renderDetail();
        }
      });
    });
  }
  const unpromoteBtn = container.querySelector('#bp-unpromote');
  if (unpromoteBtn) {
    unpromoteBtn.addEventListener('click', () => {
      confirmModal({
        title: 'Quitar ELITE',
        message: `¿Revertir la promoción de ${model.customName || getUnit(wb.factionId, model.unitId)?.name}? Volverá a ser Troop.`,
        confirmText: 'Revertir',
        onConfirm: () => {
          if (model.baseProgression) delete model.baseProgression.promotedToElite;
          persistWarband(wb);
          renderProgressionEditor(container, model, wb);
          renderRoster();
          renderDetail();
        }
      });
    });
  }
}


