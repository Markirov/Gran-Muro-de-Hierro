/* ======================================================================
   POST-BATTLE WIZARD
   ====================================================================== */

let WIZARD = null;  // active wizard state

/* Fase 4.1 — Wizard skeleton with context.
 *
 * The wizard now serves two contexts:
 *   - 'campaign': battles registered against a campaign. Requires
 *     STATE.currentCampaign with at least one warband. Old behaviour.
 *   - 'free':     battles started via the free-battle wizard. Requires
 *     an LIVE_FREE_BATTLE object (passed in via opts.lfb). Scenario
 *     and the single participant are pre-filled from the lfb.
 *
 * Back-compat: startWizard() with no args defaults to campaign mode,
 * which is what the existing UI buttons in campaign mode invoke.
 */
function startWizard(opts) {
  opts = opts || {};
  const context = opts.context || 'campaign';
  if (context !== 'campaign' && context !== 'free') {
    alert('Contexto de wizard desconocido: ' + context);
    return;
  }

  let lfb = null;
  let preParticipants = [];
  let preScenario = '';

  if (context === 'campaign') {
    const c = STATE.currentCampaign;
    if (!c || !c.warbandIds.length) {
      alert('Necesitas una campaña con al menos una banda.');
      return;
    }
  } else {
    // Free context: require an lfb. Pre-fill scenario + one participant.
    lfb = opts.lfb || null;
    if (!lfb || !lfb.warbandId) {
      alert('Necesitas una partida libre activa.');
      return;
    }
    preScenario = lfb.scenarioId || '';
    const wb = (typeof loadWarband === 'function') ? loadWarband(lfb.warbandId) : null;
    if (wb) {
      preParticipants = [{
        warbandId: wb.id,
        result: 'draw',
        gloryEarned: 0,
        ducatsEarned: 0,
        modelOutcomes: wb.models.map(m => ({
          modelUid: m.uid,
          participated: true,
          outOfAction: false,
          kills: 0,
          feats: 0,
          injury: null,
          advancementsChosen: [],
        })),
      }];
    } else {
      // Warband not loadable (test stub, deleted band). Empty participants
      // is acceptable; the participants step will still let the user pick.
      preParticipants = [{ warbandId: lfb.warbandId, result:'draw', gloryEarned:0, ducatsEarned:0, modelOutcomes:[] }];
    }
  }

  // Step list. El paso "Resultados" (ducados/glory manuales) se eliminó:
  // canon, el dinero proviene del Looting de Exploración (rollTotal×10) y
  // la gloria de los Glorious Deeds — no hay recompensa fija por victoria.
  // El resultado win/draw/loss (que habilita el re-roll de Exploración si
  // ganaste) se captura ahora en el paso Exploration. Los Glorious Deeds
  // del escenario se asignan en el paso Modelos.
  // Orden: Setup → Modelos → Trauma → Promotions/XP → Exploration →
  // Quartermaster → Resumen.
  const ALL_STEPS = [
    { id: 'setup',         label: 'Setup' },
    { id: 'modelos',       label: 'Modelos' },
    { id: 'trauma',        label: 'Trauma' },
    { id: 'promotions-xp', label: 'Promotions / XP' },
    { id: 'exploration',   label: 'Exploration' },
    { id: 'quartermaster', label: 'Quartermaster' },
    { id: 'resumen',       label: 'Resumen' },
  ];
  let steps = ALL_STEPS.slice();
  if (context === 'free') {
    // Free battles bring scenario + participant pre-baked in LIVE_FREE_BATTLE,
    // so the setup step has nothing to capture.
    steps = steps.filter(s => s.id !== 'setup');
  }

  WIZARD = {
    step: 0,
    context,
    lfb,
    steps,
    battle: {
      id: 'btl_' + Date.now().toString(36),
      date: new Date().toISOString().slice(0, 10),
      scenario: preScenario,
      notes: '',
      participants: preParticipants,
      // Fase 4.5 — per-warband exploration rolls performed in the
      // Exploration step. Each entry: { warbandId, dice, rollTotal,
      // result:{kind,entry,lootDucats}, chosenOptionId? }. Persisted
      // into the saved battle in Fase 4.7.
      discoveries: [],
    },
  };
  openModal('modal-wizard');
  renderWizardStep();
}

/* Per-step skip eligibility. Skipping advances the wizard without
 * invoking the step's collect logic — useful for steps that are
 * data-driven and may have nothing to record (e.g., no casualties to
 * resolve in Lesiones). Setup is required because every downstream
 * step depends on its values. Fase 4.2+ will refine these as the step
 * labels migrate to the canon order (Trauma/Promotions/Exploration/QM).
 */
function canSkipWizardStep(step) {
  if (!WIZARD) return false;
  if (typeof step !== 'number' || step < 0 || step >= WIZARD.steps.length) return false;
  const id = WIZARD.steps[step].id;
  // Setup captures scenario/date/participants — required for every
  // downstream step. Resumen is the final review and skipping it would
  // mean saving without showing what's about to be persisted. Every
  // other step is data-driven and safely skippable when empty.
  if (id === 'setup' || id === 'resumen') return false;
  return true;
}

function skipWizardStep() {
  if (!WIZARD) return;
  if (!canSkipWizardStep(WIZARD.step)) return;
  if (WIZARD.step >= WIZARD.steps.length - 1) {
    // Skipping the final step is a no-op: we don't auto-save without
    // having gone through the explicit Next/Guardar action.
    return;
  }
  WIZARD.step++;
  WIZARD.modelSlideIdx = 0;
  renderWizardStep();
}
function closeWizard() {
  WIZARD = null;
  closeModal('modal-wizard');
}
function renderWizardStep() {
  if (!WIZARD) return;
  const stepsEl = document.getElementById('wizard-steps');
  stepsEl.innerHTML = WIZARD.steps.map((step, i) => {
    const cls = i === WIZARD.step ? 'active' : (i < WIZARD.step ? 'completed' : '');
    return `<div class="wizard-step ${cls}">${i+1}. ${step.label}</div>`;
  }).join('');

  const body = document.getElementById('wizard-body');
  body.innerHTML = '';
  const stepObj = WIZARD.steps[WIZARD.step];
  if (stepObj) {
    switch (stepObj.id) {
      case 'setup':          renderWizardSetup(body); break;
      case 'modelos':        renderWizardModels(body); break;
      case 'trauma':         renderWizardInjuries(body); break;
      case 'promotions-xp':  renderWizardAdvancements(body); break;
      case 'exploration':    renderWizardExploration(body); break;
      case 'quartermaster':  renderWizardQuartermaster(body); break;
      case 'resumen':        renderWizardSummary(body); break;
    }
  }

  document.getElementById('wizard-prev').style.visibility = WIZARD.step > 0 ? 'visible' : 'hidden';
  document.getElementById('wizard-next').textContent = WIZARD.step === WIZARD.steps.length - 1 ? '💾 Guardar batalla' : 'Siguiente →';
  // Fase 4.1 — Skip button visibility tracks canSkipWizardStep. Skipping
  // the final step is intentionally disallowed to avoid silent saves.
  const skipBtn = document.getElementById('wizard-skip');
  if (skipBtn) {
    const showSkip = canSkipWizardStep(WIZARD.step) && WIZARD.step < WIZARD.steps.length - 1;
    skipBtn.style.display = showSkip ? '' : 'none';
  }
}

/* --- Step 0: Setup --- */
function renderWizardSetup(body) {
  const c = STATE.currentCampaign;
  body.innerHTML = `
    <h4>Setup de Batalla</h4>
    <label>Fecha</label>
    <input type="date" id="wiz-date" value="${WIZARD.battle.date}" />
    <label>Escenario</label>
    <select id="wiz-scenario-select" class="outcome-input" style="width:100%;">
      ${Object.entries(SCENARIOS_CATALOG).map(([key, s]) =>
        `<option value="${key}" ${WIZARD.battle.scenario===key?'selected':''}>${s.name}${(s.deeds&&s.deeds.length)?` · ${s.deeds.length} Deeds`:''}</option>`
      ).join('')}
      <option value="__custom__" ${!SCENARIOS_CATALOG[WIZARD.battle.scenario]?'selected':''}>— Personalizado (texto libre) —</option>
    </select>
    <input type="text" id="wiz-scenario-custom" value="${SCENARIOS_CATALOG[WIZARD.battle.scenario]?'':(WIZARD.battle.scenario||'')}" placeholder="Nombre del escenario personalizado…"
      style="margin-top:0.3rem;display:${SCENARIOS_CATALOG[WIZARD.battle.scenario]?'none':'block'};" />
    <p style="font-family:var(--font-mono);font-size:0.62rem;color:var(--parchment-dim);margin:0.2rem 0 0;">
      Elegir un escenario canon carga sus Glorious Deeds en el paso Resultados.
    </p>
    <label>Notas (opcional)</label>
    <textarea id="wiz-notes" placeholder="Cómo se desarrolló la batalla, momentos memorables…">${WIZARD.battle.notes||''}</textarea>
    <label>Bandas que participaron</label>
    <div id="wiz-participants" style="display:flex;flex-direction:column;gap:0.3rem;margin-top:0.4rem;"></div>
  `;
  const partsEl = document.getElementById('wiz-participants');
  for (const wid of c.warbandIds) {
    const wb = loadWarband(wid);
    if (!wb) continue;
    const f = DATA.factions[wb.factionId];
    const checked = WIZARD.battle.participants.find(p => p.warbandId === wid);
    const row = el('label', 'outcome-checkbox', `
      <input type="checkbox" data-wid="${wid}" ${checked ? 'checked' : ''} />
      ${wb.name || '?'} <span style="color:var(--parchment-dim);">(${f ? f.shortName : '?'} · ${wb.models.length} modelos)</span>
    `);
    partsEl.appendChild(row);
  }
  // Scenario select: toggle the custom text input visibility.
  const scenSel = document.getElementById('wiz-scenario-select');
  const scenCustom = document.getElementById('wiz-scenario-custom');
  if (scenSel && scenCustom) {
    scenSel.addEventListener('change', () => {
      scenCustom.style.display = scenSel.value === '__custom__' ? 'block' : 'none';
    });
  }
}
function collectWizardSetup() {
  const c = STATE.currentCampaign;
  WIZARD.battle.date = document.getElementById('wiz-date').value;
  const scenSel = document.getElementById('wiz-scenario-select');
  const scenCustom = document.getElementById('wiz-scenario-custom');
  if (scenSel) {
    WIZARD.battle.scenario = scenSel.value === '__custom__'
      ? (scenCustom ? scenCustom.value.trim() : '')
      : scenSel.value;
  }
  WIZARD.battle.notes = document.getElementById('wiz-notes').value;
  // Update participants list (preserve existing entries' data)
  const checkedWids = Array.from(document.querySelectorAll('#wiz-participants input:checked')).map(x => x.dataset.wid);
  const existing = WIZARD.battle.participants;
  WIZARD.battle.participants = checkedWids.map(wid => {
    const e = existing.find(p => p.warbandId === wid);
    if (e) return e;
    const wb = loadWarband(wid);
    // Canon: sin recompensa fija por resultado. El dinero proviene del
    // Looting de Exploración y la gloria de los Glorious Deeds.
    return {
      warbandId: wid,
      result: 'draw',
      gloryEarned: 0,
      ducatsEarned: 0,
      modelOutcomes: wb.models.map(m => ({
        modelUid: m.uid,
        participated: true,
        outOfAction: false,
        kills: 0,
        feats: 0,
        injury: null,
        advancementsChosen: [],
      })),
    };
  });
  if (WIZARD.battle.participants.length < 1) {
    alert('Selecciona al menos una banda que haya participado.');
    return false;
  }
  return true;
}

/* --- Step 1: Per-warband result + ducats + glory --- */
/* Win/Draw/Loss selector per participant. Canon: el resultado no otorga
 * dinero (eso es el Looting de Exploración) — solo decide si ganaste, lo
 * que habilita un re-roll extra de Exploración (p.112) y alimenta el
 * récord W/L/D de campaña. Se muestra en el paso Exploration. */
function appendWizardResultSelector(body) {
  const wrap = el('div', 'detail-section');
  let html = `<div class="detail-label">Resultado de la batalla</div>
    <div style="font-size:0.68rem;color:var(--parchment-dim);margin-bottom:0.4rem;">
      No da dinero (el dinero viene del Looting de abajo). Ganar habilita un re-roll extra de Exploración.
    </div>`;
  for (const part of WIZARD.battle.participants) {
    const wb = (typeof loadWarband === 'function') ? loadWarband(part.warbandId) : null;
    html += `<div style="margin-top:0.4rem;">
      <div style="font-size:0.8rem;margin-bottom:0.25rem;">${wb && wb.name ? wb.name : part.warbandId}</div>
      <div style="display:flex;gap:0.4rem;flex-wrap:wrap;">
        <button type="button" class="btn ${part.result==='win'?'btn-primary':''}"  data-result-wid="${part.warbandId}" data-result="win">🏆 Victoria</button>
        <button type="button" class="btn ${part.result==='draw'?'btn-primary':''}" data-result-wid="${part.warbandId}" data-result="draw">⚖ Empate</button>
        <button type="button" class="btn ${part.result==='loss'?'btn-danger':''}"  data-result-wid="${part.warbandId}" data-result="loss">💀 Derrota</button>
      </div>
    </div>`;
  }
  wrap.innerHTML = html;
  body.appendChild(wrap);
  body.querySelectorAll('[data-result-wid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const part = WIZARD.battle.participants.find(p => p.warbandId === btn.dataset.resultWid);
      if (part) part.result = btn.dataset.result;
      renderWizardStep();
    });
  });
}

/* Scenario-specific Glorious Deeds (canon p.97). Una lista global por
 * participante: cada deed asignado a un modelo contribuye +1 ☼ a la banda,
 * +1 D6 al Promotion Pool, y +1 XP si lo hizo un ELITE. Se asigna en el
 * paso Modelos (qué hizo cada modelo). Solo aparece si el escenario tiene
 * Glorious Deeds en SCENARIOS_CATALOG. */
function appendWizardScenarioDeeds(body) {
  const scenarioEntry = SCENARIOS_CATALOG[WIZARD.battle.scenario] || null;
  const scenarioDeeds = (scenarioEntry && Array.isArray(scenarioEntry.deeds)) ? scenarioEntry.deeds : [];
  if (!scenarioDeeds.length) return;

  for (const part of WIZARD.battle.participants) {
    const wb = loadWarband(part.warbandId);
    if (!wb) continue;
    if (!part.deeds || typeof part.deeds !== 'object') part.deeds = {};
    const deedGlory = participantDeedCount(part);
    const models = wb.models || [];
    const block = el('div', 'detail-section');
    block.innerHTML = `
      <div class="wiz-deeds">
        <div style="font-weight:700;color:var(--gold);font-size:0.82rem;">🏆 Glorious Deeds — ${scenarioEntry.name} <span style="font-weight:400;color:var(--parchment-dim);">(${wb.name||'?'})</span></div>
        <div style="font-size:0.68rem;color:var(--parchment-dim);margin-bottom:0.4rem;">
          Cada Deed cumplido: +1 ☼ a la banda · +1 dado al Promotion Pool · +1 XP si lo hizo un ELITE. Asigna el modelo que lo cumplió.
        </div>
        ${scenarioDeeds.map((d) => {
          const assigned = part.deeds[d.name] || '';
          return `
            <div style="display:flex;gap:0.5rem;align-items:flex-start;margin-top:0.3rem;">
              <select data-deed-wid="${part.warbandId}" data-deed-name="${(d.name||'').replace(/"/g,'&quot;')}" class="outcome-input" style="min-width:150px;">
                <option value="">— no cumplido —</option>
                ${models.map(m => {
                  const u = getUnit(wb.factionId, m.unitId);
                  const nm = m.customName || (u ? u.name : m.uid);
                  return `<option value="${m.uid}" ${assigned===m.uid?'selected':''}>${nm}</option>`;
                }).join('')}
              </select>
              <div style="font-size:0.72rem;">
                <strong>${d.name}</strong>${d.awardsLeaderXP ? ' <span style="color:var(--gold);" title="Suele cumplirlo el Leader">★</span>' : ''}
                <div style="color:var(--parchment-dim);">${d.desc||''}</div>
              </div>
            </div>`;
        }).join('')}
        <div style="margin-top:0.5rem;font-size:0.8rem;">
          Glory por Deeds: <strong style="color:var(--gold);">+${deedGlory} ☼</strong>
        </div>
      </div>`;
    body.appendChild(block);
  }

  body.querySelectorAll('[data-deed-wid]').forEach(sel => {
    sel.addEventListener('change', () => {
      const part = WIZARD.battle.participants.find(p => p.warbandId === sel.dataset.deedWid);
      if (!part) return;
      if (!part.deeds || typeof part.deeds !== 'object') part.deeds = {};
      if (sel.value) part.deeds[sel.dataset.deedName] = sel.value;
      else delete part.deeds[sel.dataset.deedName];
      recomputeFeatsFromDeeds(part);
      renderWizardStep();
    });
  });
}

/* --- Step 2: Per-model outcomes --- */
function renderWizardModels(body) {
  const c = STATE.currentCampaign;
  // Detect mobile viewport for slide-by-slide pagination
  const isMobile = window.innerWidth <= 768;

  // Build a flat list of "rows": { wb, model, unit, out, ms, isDead, recovering }
  const rows = [];
  for (const part of WIZARD.battle.participants) {
    const wb = loadWarband(part.warbandId);
    if (!wb) continue;
    for (const m of wb.models) {
      const u = getUnit(wb.factionId, m.unitId);
      const out = part.modelOutcomes.find(o => o.modelUid === m.uid);
      if (!out) continue;
      const ms = (c.warbandStates[part.warbandId] || emptyWarbandState()).modelStates[m.uid];
      const isDead = ms && ms.status === 'dead';
      const recovering = ms && ms.status === 'recovering' && ms.recoversNextBattles > 0;
      rows.push({ wb, model: m, unit: u, out, ms, isDead, recovering, warbandId: part.warbandId });
    }
  }

  if (isMobile && rows.length > 1) {
    return renderWizardModelsMobile(body, rows);
  }

  // Desktop: original table-style layout
  body.innerHTML = `<h4>Resultados por Modelo</h4>
    <p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment-dim);">
      XP (ELITE, canon p.103): +1 por participar y sobrevivir · +1 si hizo ≥1 Glorious Deed (cap). Kills se anotan pero no dan XP.
    </p>`;
  // Group by warband
  const byWarband = {};
  for (const r of rows) {
    if (!byWarband[r.warbandId]) byWarband[r.warbandId] = { wb: r.wb, rows: [] };
    byWarband[r.warbandId].rows.push(r);
  }
  for (const wid of Object.keys(byWarband)) {
    const grp = byWarband[wid];
    const block = el('div', 'detail-section');
    block.innerHTML = `<div class="detail-label">${grp.wb.name||'?'}</div>`;
    for (const r of grp.rows) {
      const { model: m, unit: u, out, isDead, recovering } = r;
      const row = el('div', 'outcome-row' + (isDead?' dead':'') + (out.outOfAction?' ooa':''));
      row.innerHTML = `
        <div>
          <div class="outcome-name">${m.customName || (u?u.name:'?')}</div>
          <div class="outcome-meta">${u?u.name:'?'}${isDead?' · MUERTO':''}${recovering?' · RECUPERÁNDOSE':''}</div>
        </div>
        <label class="outcome-checkbox" title="¿Participó en la batalla?">
          <input type="checkbox" data-uid="${m.uid}" data-wid="${r.warbandId}" data-field="participated" ${out.participated?'checked':''} ${isDead?'disabled':''} /> Particip.
        </label>
        <label class="outcome-checkbox" title="¿Quedó Out of Action?">
          <input type="checkbox" data-uid="${m.uid}" data-wid="${r.warbandId}" data-field="ooa" ${out.outOfAction?'checked':''} ${isDead?'disabled':''} /> OOA
        </label>
        <div style="display:flex;gap:0.3rem;align-items:center;">
          <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--parchment-dim);">K:</span>
          <input type="number" min="0" max="20" class="outcome-input" data-uid="${m.uid}" data-wid="${r.warbandId}" data-field="kills" value="${out.kills||0}" ${isDead?'disabled':''} />
          <span style="font-family:var(--font-mono);font-size:0.6rem;color:var(--parchment-dim);margin-left:0.3rem;">F:</span>
          <input type="number" min="0" max="10" class="outcome-input" data-uid="${m.uid}" data-wid="${r.warbandId}" data-field="feats" value="${out.feats||0}" ${isDead?'disabled':''} />
        </div>
      `;
      block.appendChild(row);
    }
    body.appendChild(block);
  }
  // Live-update bindings
  body.querySelectorAll('input[data-uid]').forEach(inp => {
    inp.addEventListener('change', () => {
      const wid = inp.dataset.wid;
      const uid_ = inp.dataset.uid;
      const field = inp.dataset.field;
      const part = WIZARD.battle.participants.find(p => p.warbandId === wid);
      const out = part.modelOutcomes.find(o => o.modelUid === uid_);
      if (field === 'participated') out.participated = inp.checked;
      else if (field === 'ooa')      out.outOfAction = inp.checked;
      else                           out[field] = parseInt(inp.value, 10) || 0;
      // Re-render to update OOA visual state
      if (field === 'ooa' || field === 'participated') renderWizardStep();
    });
  });
  // Scenario Glorious Deeds (global list + asignar modelo). Drives feats.
  appendWizardScenarioDeeds(body);
}

/**
 * Mobile version: shows one model at a time with large tappable controls.
 * Stores the current index in WIZARD.modelSlideIdx so the user can navigate
 * back/forward within the step without losing position.
 */
function renderWizardModelsMobile(body, rows) {
  if (typeof WIZARD.modelSlideIdx !== 'number' || WIZARD.modelSlideIdx >= rows.length) {
    WIZARD.modelSlideIdx = 0;
  }
  const idx = WIZARD.modelSlideIdx;
  const r = rows[idx];
  const { model: m, unit: u, out, isDead, recovering, warbandId, wb } = r;
  body.innerHTML = `
    <h4>Resultados por Modelo</h4>
    <div class="wiz-slide-nav">
      <button type="button" class="btn btn-icon" id="wiz-slide-prev" ${idx === 0 ? 'disabled' : ''}>‹</button>
      <div class="wiz-slide-counter">
        <span class="wiz-slide-num">${idx + 1}</span><span class="wiz-slide-total"> / ${rows.length}</span>
      </div>
      <button type="button" class="btn btn-icon" id="wiz-slide-next" ${idx >= rows.length - 1 ? 'disabled' : ''}>›</button>
    </div>
    <div class="wiz-slide-progress">
      <div class="wiz-slide-bar" style="width:${((idx + 1) / rows.length) * 100}%"></div>
    </div>

    <div class="wiz-model-card${isDead ? ' dead' : ''}${out.outOfAction ? ' ooa' : ''}">
      <div class="wiz-model-band">${wb.name || '?'}</div>
      <div class="wiz-model-name">${m.customName || (u ? u.name : '?')}</div>
      <div class="wiz-model-unit">${u ? u.name : '?'}${isDead ? ' · MUERTO' : ''}${recovering ? ' · RECUPERÁNDOSE' : ''}</div>

      <div class="wiz-model-fields">
        <label class="wiz-field-toggle">
          <input type="checkbox" data-uid="${m.uid}" data-wid="${warbandId}" data-field="participated" ${out.participated ? 'checked' : ''} ${isDead ? 'disabled' : ''} />
          <span class="wiz-field-label">Participó en la batalla</span>
        </label>

        <label class="wiz-field-toggle wiz-field-ooa">
          <input type="checkbox" data-uid="${m.uid}" data-wid="${warbandId}" data-field="ooa" ${out.outOfAction ? 'checked' : ''} ${isDead ? 'disabled' : ''} />
          <span class="wiz-field-label">Quedó Out of Action</span>
        </label>

        <div class="wiz-field-num">
          <span class="wiz-field-label">Kills</span>
          <div class="wiz-num-stepper">
            <button type="button" class="wiz-num-btn" data-uid="${m.uid}" data-wid="${warbandId}" data-field="kills" data-delta="-1" ${isDead ? 'disabled' : ''}>−</button>
            <input type="number" min="0" max="20" class="outcome-input wiz-num-input" data-uid="${m.uid}" data-wid="${warbandId}" data-field="kills" value="${out.kills || 0}" ${isDead ? 'disabled' : ''} />
            <button type="button" class="wiz-num-btn" data-uid="${m.uid}" data-wid="${warbandId}" data-field="kills" data-delta="+1" ${isDead ? 'disabled' : ''}>+</button>
          </div>
        </div>

        <div class="wiz-field-num">
          <span class="wiz-field-label">Hazañas (Glorious Deeds)</span>
          <div class="wiz-num-stepper">
            <button type="button" class="wiz-num-btn" data-uid="${m.uid}" data-wid="${warbandId}" data-field="feats" data-delta="-1" ${isDead ? 'disabled' : ''}>−</button>
            <input type="number" min="0" max="10" class="outcome-input wiz-num-input" data-uid="${m.uid}" data-wid="${warbandId}" data-field="feats" value="${out.feats || 0}" ${isDead ? 'disabled' : ''} />
            <button type="button" class="wiz-num-btn" data-uid="${m.uid}" data-wid="${warbandId}" data-field="feats" data-delta="+1" ${isDead ? 'disabled' : ''}>+</button>
          </div>
        </div>
      </div>

      <div class="wiz-xp-preview">
        XP esperado: <strong>${computeModelXPGain(out, m, wb)}</strong>
        <span class="wiz-xp-formula">(ELITE: +1 superv. + 1 si Deed)</span>
      </div>
    </div>
  `;

  // Update value handler — same as desktop but always re-render slide
  const updateOutcome = (uid, wid, field, value) => {
    const part = WIZARD.battle.participants.find(p => p.warbandId === wid);
    const o = part.modelOutcomes.find(x => x.modelUid === uid);
    if (field === 'participated') o.participated = !!value;
    else if (field === 'ooa')      o.outOfAction = !!value;
    else                           o[field] = parseInt(value, 10) || 0;
  };

  body.querySelectorAll('input[data-uid]').forEach(inp => {
    const handler = () => {
      const v = inp.type === 'checkbox' ? inp.checked : inp.value;
      updateOutcome(inp.dataset.uid, inp.dataset.wid, inp.dataset.field, v);
      // Re-render the slide to update the XP preview & visual state
      renderWizardModels(body);
    };
    inp.addEventListener('change', handler);
    if (inp.type === 'number') inp.addEventListener('input', handler);
  });

  body.querySelectorAll('.wiz-num-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const uid = btn.dataset.uid;
      const wid = btn.dataset.wid;
      const field = btn.dataset.field;
      const delta = parseInt(btn.dataset.delta, 10);
      const part = WIZARD.battle.participants.find(p => p.warbandId === wid);
      const o = part.modelOutcomes.find(x => x.modelUid === uid);
      const min = 0, max = field === 'kills' ? 20 : 10;
      const newV = Math.max(min, Math.min(max, (o[field] || 0) + delta));
      o[field] = newV;
      renderWizardModels(body);
    });
  });

  // Slide navigation
  const prev = body.querySelector('#wiz-slide-prev');
  const next = body.querySelector('#wiz-slide-next');
  if (prev) prev.addEventListener('click', () => {
    if (WIZARD.modelSlideIdx > 0) {
      WIZARD.modelSlideIdx--;
      renderWizardModels(body);
    }
  });
  if (next) next.addEventListener('click', () => {
    if (WIZARD.modelSlideIdx < rows.length - 1) {
      WIZARD.modelSlideIdx++;
      renderWizardModels(body);
    }
  });
  // Scenario Glorious Deeds below the per-model slide (drives feats).
  appendWizardScenarioDeeds(body);
}
function collectWizardModels() { return true; /* all bound live */ }

/* --- Step 3: Injuries (only for OOA models) --- */
/* Fase 4.3 — Pure helper. Returns true iff any participant has at
 * least one modelOutcome marked (participated && outOfAction). Used
 * both by the Trauma step to detect "nothing to roll" and by future
 * subphases to gate similar data-driven steps.
 */
function wizardHasCasualties(w) {
  if (!w || !w.battle || !Array.isArray(w.battle.participants)) return false;
  for (const part of w.battle.participants) {
    if (!part || !Array.isArray(part.modelOutcomes)) continue;
    for (const o of part.modelOutcomes) {
      if (o && o.outOfAction && o.participated !== false) return true;
    }
  }
  return false;
}

function renderWizardInjuries(body) {
  // T1 — D66 Trauma migration. Per OoA model: roll D66 button + canon
  // result + manual override (full traumaTable list). Stores
  // out.injury with { id, name, detail, kind, roll }. Downstream
  // checks honour canon ids ('head-wound' → cannotGainXp,
  // 'bitter-lessons' → +1 XP).
  body.innerHTML = `<h4>Trauma — Tirada D66 canon</h4>
    <p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment-dim);">
      Para cada modelo Out-of-Action, lanza 2D6 (decenas y unidades) y aplica el resultado en la tabla canon (p.117), o elige manualmente. Rangos 41-63 = Full Recovery.
    </p>`;
  if (!wizardHasCasualties(WIZARD)) {
    body.innerHTML += `<div class="notice info" style="margin-top:1rem;">
      Ningún modelo quedó Out-of-Action en esta batalla. No hay traumas que tirar.
      <div style="margin-top:0.75rem;">
        <button class="btn btn-primary" id="wiz-trauma-skip" type="button">↷ Saltar al siguiente paso</button>
      </div>
    </div>`;
    const skipBtn = body.querySelector('#wiz-trauma-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => { if (typeof skipWizardStep === 'function') skipWizardStep(); });
    return;
  }

  for (const part of WIZARD.battle.participants) {
    const wb = loadWarband(part.warbandId);
    if (!wb) continue;
    for (const out of part.modelOutcomes) {
      if (!out.outOfAction || out.participated === false) continue;
      const m = wb.models.find(x => x.uid === out.modelUid);
      if (!m) continue;
      const u = getUnit(wb.factionId, m.unitId);
      const card = el('div', 'injury-card');
      const selectedId = out.injury ? out.injury.id : null;
      const rolledVal = out.injury && typeof out.injury.roll === 'number' ? out.injury.roll : null;
      const traumaTable = CAMPAIGN_TABLES.traumaTable || [];
      const scratchAvailable = canUseScratchReroll(m, out);
      const scratchUsed = modelHasSkill(m, "'Tis But a Scratch") && out.scratchRerollUsed === true;
      card.innerHTML = `
        <div class="injury-card-row">
          <div>
            <div class="outcome-name">${m.customName || (u?u.name:'?')}</div>
            <div class="outcome-meta">${wb.name||'?'} · ${u?u.name:'?'}${scratchUsed ? ' · 🎲 Scratch usado' : ''}</div>
          </div>
          <div style="display:flex;align-items:center;gap:0.4rem;">
            ${rolledVal !== null ? `<span class="d6-roll" style="font-family:var(--font-mono);font-size:0.85rem;">D66 ${rolledVal}</span>` : ''}
            <button class="d6-btn" data-roll-uid="${out.modelUid}" data-roll-wid="${part.warbandId}" title="Tirar D66">🎲 D66</button>
            ${scratchAvailable && rolledVal !== null ? `
              <button class="d6-btn" data-scratch-uid="${out.modelUid}" data-scratch-wid="${part.warbandId}" title="'Tis But a Scratch — re-roll D66 (1 vez)">🔄 Scratch</button>
            ` : ''}
          </div>
        </div>
        ${out.injury ? `<div style="margin-top:0.5rem;padding:0.4rem;background:rgba(127,107,67,0.1);">
          <strong>${out.injury.name}</strong>${typeof out.injury.roll === 'number' ? ` <span style="color:var(--parchment-dim);">(D66 ${out.injury.roll})</span>` : ''}
          ${out.injury.detail ? `<div style="font-size:0.8rem;color:var(--parchment);margin-top:0.25rem;">${out.injury.detail}</div>` : ''}
        </div>` : ''}
        <div style="margin-top:0.5rem;font-size:0.75rem;color:var(--parchment-dim);">Elegir manualmente:</div>
        <div class="injury-result-options" style="display:flex;flex-wrap:wrap;gap:0.3rem;">
          ${traumaTable.map(inj => `
            <div class="injury-opt ${selectedId===inj.id?'selected':''}" data-inj="${inj.id}" data-uid="${out.modelUid}" data-wid="${part.warbandId}" title="${inj.detail || ''}">
              ${inj.roll}. ${inj.name}
            </div>
          `).join('')}
        </div>
      `;
      body.appendChild(card);
    }
  }

  body.querySelectorAll('.d6-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const isScratch = !!btn.dataset.scratchUid;
      const wid = isScratch ? btn.dataset.scratchWid : btn.dataset.rollWid;
      const uid_ = isScratch ? btn.dataset.scratchUid : btn.dataset.rollUid;
      const part = WIZARD.battle.participants.find(p => p.warbandId === wid);
      const outo = part.modelOutcomes.find(o => o.modelUid === uid_);
      if (isScratch) {
        const wbHere = loadWarband(wid);
        const modelHere = wbHere && wbHere.models.find(x => x.uid === uid_);
        if (!canUseScratchReroll(modelHere, outo)) return;
        outo.scratchRerollUsed = true;
      }
      const roll = rollD66();
      const entry = lookupTraumaEntry(roll.value);
      if (!entry) return;
      outo.injury = {
        id: entry.id || (typeof entry.roll === 'number' ? 'r' + entry.roll : 'r' + roll.value),
        name: entry.name,
        detail: entry.detail || '',
        kind: entry.kind,
        roll: roll.value,
      };
      renderWizardStep();
    });
  });
  body.querySelectorAll('[data-inj]').forEach(opt => {
    opt.addEventListener('click', () => {
      const wid = opt.dataset.wid, uid_ = opt.dataset.uid;
      const part = WIZARD.battle.participants.find(p => p.warbandId === wid);
      const outo = part.modelOutcomes.find(o => o.modelUid === uid_);
      const entry = (CAMPAIGN_TABLES.traumaTable || []).find(i => i.id === opt.dataset.inj);
      if (!entry) return;
      outo.injury = {
        id: entry.id,
        name: entry.name,
        detail: entry.detail || '',
        kind: entry.kind,
        roll: typeof entry.roll === 'number' ? entry.roll : null,
      };
      renderWizardStep();
    });
  });
}
function collectWizardInjuries() { return true; }

/* --- Step: Promotions / XP (canon id 'promotions-xp') ---
 * Reuses the wizard helpers added in Fase 4.4 so the same step works
 * for both campaign and free contexts. Campaign reads current XP from
 * computed warbandStates; free reads from each model's baseProgression.
 */
function renderWizardAdvancements(body) {
  body.innerHTML = `<h4>Promotions / XP</h4>
    <p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment-dim);">
      Cuando un modelo cruza un umbral de XP (${CAMPAIGN_TABLES.xpThresholds.join(', ')}) puede tomar un ascenso.
    </p>`;

  // Early-exit when nothing crosses a threshold: show a clear notice
  // with a fast-track skip button. Matches the Trauma step pattern.
  if (!wizardHasAdvancements(WIZARD)) {
    body.innerHTML += `<div class="notice info" style="margin-top:1rem;">
      Ningún modelo cruzó un umbral de XP en esta batalla.
      <div style="margin-top:0.75rem;">
        <button class="btn btn-primary" id="wiz-promo-skip" type="button">↷ Saltar al siguiente paso</button>
      </div>
    </div>`;
    const skipBtn = body.querySelector('#wiz-promo-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        if (typeof skipWizardStep === 'function') skipWizardStep();
      });
    }
    return;
  }

  // Build the per-context XP lookup. In campaign mode pull from
  // warbandStates; in free mode the helper falls back to baseProgression.
  const ctx = { context: WIZARD.context || 'campaign' };
  if (ctx.context === 'campaign') {
    const c = STATE.currentCampaign;
    ctx.warbandStates = c ? (c.warbandStates || {}) : {};
  }

  for (const part of WIZARD.battle.participants) {
    const wb = loadWarband(part.warbandId);
    if (!wb) continue;
    for (const out of part.modelOutcomes) {
      if (out.participated === false) continue;
      const before = getCurrentModelXP(wb, out.modelUid, ctx);
      const modelObj = wb.models.find(x => x.uid === out.modelUid);
      const xpGain = computeModelXPGain(out, modelObj, wb);
      const after = before + xpGain;
      const earnedBefore = advancementsEarned(before);
      const earnedAfter  = advancementsEarned(after);
      if (earnedAfter <= earnedBefore) continue;
      const m = wb.models.find(x => x.uid === out.modelUid);
      const u = getUnit(wb.factionId, m.unitId);
      const newAdvances = earnedAfter - earnedBefore;
      // Pre-allocate array
      out.advancementsChosen = out.advancementsChosen || [];
      while (out.advancementsChosen.length < newAdvances) out.advancementsChosen.push(null);
      out.advancementsChosen.length = newAdvances;
      const card = el('div', 'adv-card');
      card.innerHTML = `
        <div class="injury-card-row">
          <div>
            <div class="outcome-name">${m.customName || (u?u.name:'?')}</div>
            <div class="outcome-meta">${wb.name||'?'} · XP ${before}→${after} · ${newAdvances} ascenso(s)</div>
          </div>
        </div>
        ${Array.from({length: newAdvances}).map((_, idx) => {
          const sel = out.advancementsChosen[idx];
          // Canon Advancement Roll (p.104): the player rolls 2D6 on each
          // of 2 chosen Skill Tables and picks one result. Patron Skill
          // (2/12) branches into the Patron picker (p.86-93).
          return `
            <div style="margin-top:0.5rem;">
              <label>Ascenso ${idx+1}</label>
              ${sel ? `
                <div class="adv-chosen" style="display:flex;align-items:center;gap:0.5rem;justify-content:space-between;padding:0.4rem 0.5rem;border:1px solid var(--gold);border-radius:4px;">
                  <span><strong>${sel.name}</strong>${sel.skillTable ? ` <span style="color:var(--parchment-dim);font-size:0.7rem;">(${(CAMPAIGN_TABLES.skillTables[sel.skillTable]||{}).name||sel.skillTable}${typeof sel.rolled==='number'?` · 2D6=${sel.rolled}`:''})</span>` : ''}${sel.patronSkill ? ' <span style="color:var(--gold);font-size:0.7rem;">★ Patron</span>' : ''}</span>
                  <button class="btn" data-adv-roll data-idx="${idx}" data-uid="${out.modelUid}" data-wid="${part.warbandId}" style="font-size:0.7rem;padding:0.2rem 0.5rem;">🎲 Re-tirar</button>
                </div>
              ` : `
                <button class="btn btn-primary" data-adv-roll data-idx="${idx}" data-uid="${out.modelUid}" data-wid="${part.warbandId}" style="margin-top:0.3rem;">🎲 Tirar ascenso (2 tablas · 2D6)</button>
              `}
            </div>
          `;
        }).join('')}
      `;
      body.appendChild(card);
    }
  }

  // Each slot opens the canon Advancement Roll modal. The chosen Skill
  // entry is stored into out.advancementsChosen[idx]. The modal handles
  // the 2-table pick, the 2D6 rolls, the skip-rule for known skills, and
  // the Patron Skill picker.
  body.querySelectorAll('[data-adv-roll]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wid = btn.dataset.wid, uid_ = btn.dataset.uid, idx = parseInt(btn.dataset.idx, 10);
      const wbHere = loadWarband(wid);
      if (!wbHere) return;
      const modelHere = wbHere.models.find(x => x.uid === uid_);
      if (!modelHere) return;
      openAdvancementRollModal(modelHere, wbHere, (entry) => {
        const part = WIZARD.battle.participants.find(p => p.warbandId === wid);
        const out = part.modelOutcomes.find(o => o.modelUid === uid_);
        out.advancementsChosen[idx] = entry;
        renderWizardStep();
      }, { context: WIZARD.context || 'campaign' });
    });
  });
}
function collectWizardAdvancements() {
  // Validate all advancement slots filled
  for (const part of WIZARD.battle.participants) {
    for (const out of part.modelOutcomes) {
      if (!out.advancementsChosen) continue;
      for (const a of out.advancementsChosen) {
        if (!a) {
          alert('Hay ascensos sin elegir. Completa todos antes de guardar.');
          return false;
        }
      }
    }
  }
  return true;
}

function saveBattleFromWizard() {
  const c = STATE.currentCampaign;
  c.battles.push(WIZARD.battle);
  refreshAllWarbandStates(c);
  persistCampaign(c);
  // Fase 6.5 — sum earnings across participants and toast for the
  // primary warband (first participant). Campaign multi-warband
  // battles get a single toast — keeps the post-battle pulse simple.
  const totalDucats = (WIZARD.battle.participants || []).reduce((acc, p) => acc + (p.ducatsEarned || 0), 0);
  const firstPart = (WIZARD.battle.participants || [])[0];
  const wb = firstPart ? loadWarband(firstPart.warbandId) : null;
  closeWizard();
  renderCampaignMode();
  if (wb) showToast(postBattleToastSummary(wb, totalDucats));
}


