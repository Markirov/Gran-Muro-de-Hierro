/* ======================================================================
   ADVANCEMENT / TRAUMA ROLLER
   In-app dice rollers for the canonical campaign tables. The state of
   each roll lives in a transient closure inside open*Modal — nothing
   persists until the user confirms their choice.
   ====================================================================== */

/**
 * Animate a die element rolling to a final value.
 *
 * Adds the `.rolling` class (CSS shake animation) and rapidly updates the
 * displayed number to a random face, then settles on `finalValue` and
 * adds the `.settled` class (scale-pop + optional glow if value is 6).
 *
 * Returns a Promise that resolves when the animation completes, so callers
 * can chain ".then(showResult)".
 *
 * If the user prefers reduced motion, the function still works but the
 * CSS animations are no-ops; the value just snaps in.
 *
 * @param {HTMLElement} el     The die element (.die or .promo-die-mini)
 * @param {number} finalValue  The number to land on (1-6 for D6, etc.)
 * @param {number} [duration]  Total animation time in ms (default 700)
 * @param {number} [tickRate]  ms between random face updates (default 60)
 * @returns {Promise<void>}
 */
function animateDieRoll(el, finalValue, duration = 700, tickRate = 60) {
  if (!el) return Promise.resolve();
  // Honor reduced motion: just set value and add settled class
  const reduced = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    el.textContent = String(finalValue);
    el.dataset.result = String(finalValue);
    el.classList.add('settled');
    return Promise.resolve();
  }
  el.classList.remove('settled');
  el.classList.add('rolling');
  // Don't reset dataset.result here — caller may set it after settle
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      if (elapsed >= duration) {
        // Land on the final value
        el.classList.remove('rolling');
        el.textContent = String(finalValue);
        el.dataset.result = String(finalValue);
        el.classList.add('settled');
        resolve();
      } else {
        // Random face (D6 by default; if final is bigger, use 1..6 still)
        const cap = Math.min(6, Math.max(1, finalValue));
        // Show 1-6 random for visual effect; the actual range doesn't matter much
        const face = 1 + Math.floor(Math.random() * 6);
        el.textContent = String(face);
        setTimeout(tick, tickRate);
      }
    };
    tick();
  });
}

/**
 * Animate multiple dice simultaneously. Returns a Promise that resolves
 * when ALL dice have settled. Each die may have its own final value.
 *
 * @param {Array<{el: HTMLElement, value: number}>} dice
 * @param {number} [duration]
 * @returns {Promise<void>}
 */
function animateDiceRoll(dice, duration = 700) {
  return Promise.all(dice.map(d => animateDieRoll(d.el, d.value, duration)));
}

/** Roll 2D6 and return { d1, d2, sum }. */
function roll2D6() {
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  return { d1, d2, sum: d1 + d2 };
}

/** Roll a D66 and return { tens, units, value }. */
function rollD66() {
  const tens = 1 + Math.floor(Math.random() * 6);
  const units = 1 + Math.floor(Math.random() * 6);
  const value = tens * 10 + units;
  return { tens, units, value };
}

/**
 * Open the Canonical Glorious Deeds picker modal.
 *
 * Shows the canonical list (CAMPAIGN_TABLES.canonicalGloriousDeeds) grouped
 * by category — Universal (apply to most scenarios) → Common patterns →
 * Scenario-specific. Clicking an entry calls `onPick(name)` and closes the
 * modal.
 *
 * The user can still type custom deed names directly in the input — this
 * picker is a quick-fill helper, not a constraint.
 */
function openCanonicalDeedsPicker(model, wb, container, onPick) {
  const content = document.getElementById('canonical-deeds-list-content');
  if (!content) return;
  const deeds = CAMPAIGN_TABLES.canonicalGloriousDeeds || [];
  const byCat = { universal: [], common: [], scenario: [] };
  for (const d of deeds) {
    (byCat[d.category] || byCat.common).push(d);
  }
  const catLabel = {
    universal: 'Universales',
    common: 'Patrones comunes',
    scenario: 'Específicas de escenario',
  };
  const catHint = {
    universal: 'Estas gestas aplican en (casi) todos los escenarios canónicos.',
    common: 'Patrones de gesta que aparecen recurrentemente en los escenarios.',
    scenario: 'Gestas asociadas a escenarios concretos (Trench Raid, Hold the Line, etc.).',
  };
  let html = '';
  for (const cat of ['universal', 'common', 'scenario']) {
    const list = byCat[cat];
    if (!list || !list.length) continue;
    html += `<div class="canon-deed-section">
      <div class="canon-deed-section-title">${catLabel[cat]}</div>
      <div class="canon-deed-section-hint">${catHint[cat]}</div>`;
    for (const d of list) {
      html += `
        <button class="canon-deed-row" data-deed-name="${d.name.replace(/"/g, '&quot;')}">
          <div class="canon-deed-name">${d.name}</div>
          <div class="canon-deed-summary">${d.summary}</div>
        </button>`;
    }
    html += `</div>`;
  }
  // Footer: explicit "custom" reminder
  html += `<div class="canon-deed-footer">
    También puedes escribir un nombre personalizado en el campo de la pantalla anterior si tu escenario tiene gestas únicas.
  </div>`;
  content.innerHTML = html;
  content.querySelectorAll('.canon-deed-row').forEach(b => {
    b.addEventListener('click', () => {
      const name = b.dataset.deedName;
      closeModal('modal-canonical-deeds');
      if (typeof onPick === 'function') onPick(name);
    });
  });
  openModal('modal-canonical-deeds');
}

/**
 * Resolve the Skill granted by a 2D6 Advancement Roll, applying the canon
 * skip rule for skills the model already knows (next lower, then next
 * higher non-Patron entry — Digital Rulebook p.104).
 *
 * When patronAllowed is false (free context, canon-extended Fase 9), a
 * Patron Skill result (2/12) is treated as blocked and skipped to the
 * next non-Patron entry instead of returning the Patron Skill.
 *
 * Pure: no DOM, no state. Returns the resolved skill entry or null.
 */
function resolveAdvancementSkill(tableId, rolledValue, alreadyKnown, patronAllowed) {
  const table = CAMPAIGN_TABLES.skillTables[tableId];
  if (!table) return null;
  const known = new Set(alreadyKnown || []);
  const get = (r) => table.entries.find(e => e.roll === r);
  const allow = patronAllowed !== false;  // default: allow Patron
  const entry = get(rolledValue);
  if (!entry) return null;
  if (entry.name === 'Patron Skill' && allow) return entry;  // user picks from Patron list
  const blocked = (entry.name === 'Patron Skill' && !allow) || known.has(entry.name);
  if (!blocked) return entry;
  // Blocked (known, or Patron in free): try next lower, then next higher.
  for (let r = rolledValue - 1; r >= 3; r--) {
    const e = get(r);
    if (e && e.name !== 'Patron Skill' && !known.has(e.name)) return e;
  }
  for (let r = rolledValue + 1; r <= 11; r++) {
    const e = get(r);
    if (e && e.name !== 'Patron Skill' && !known.has(e.name)) return e;
  }
  return entry;  // all blocked: fall back to the rolled entry
}

/**
 * Open the Advancement Roll modal for a model.
 * Workflow (canon page 105-106):
 *   1. Pick 2 of the 4 Skill Tables.
 *   2. Roll 2D6 on each → get a Skill on each table.
 *   3. Pick one of the 2 Skills to learn.
 * The chosen Skill is added as an advancement on the model.
 *
 * opts.context: 'free' disables Patron Skill results (canon-extended
 * Fase 9 — in free battles the Patron does not intervene). A rolled
 * Patron Skill (2/12) then falls through the skip-rule to the next
 * non-Patron skill instead of opening the Patron picker.
 */
function openAdvancementRollModal(model, wb, onApply, opts) {
  opts = opts || {};
  const patronAllowed = opts.context !== 'free';
  const state = {
    pickedTables: [],   // up to 2 of: melee, ranged, stealth, wildcard
    rolls: {},          // { tableId: {d1,d2,sum} }
    rolledSkills: {},   // { tableId: skillEntry }
    chosenTable: null,  // which of the 2 the user picked
  };
  const subtitle = document.getElementById('adv-roll-subtitle');
  if (subtitle) {
    const u = getUnit(wb.factionId, model.unitId);
    subtitle.textContent = `Tirada de ascenso para ${model.customName || u?.name || 'modelo'}.`;
  }
  const content = document.getElementById('adv-roll-content');

  const resolveSkill = (tableId, rolledValue, alreadyKnown) =>
    resolveAdvancementSkill(tableId, rolledValue, alreadyKnown, patronAllowed);

  function renderStep1() {
    const tables = Object.entries(CAMPAIGN_TABLES.skillTables);
    let html = '<div class="roller-step">';
    html += '<div class="roller-step-title">1. Elige 2 Skill Tables</div>';
    html += '<div class="table-picker">';
    for (const [id, t] of tables) {
      const sel = state.pickedTables.includes(id);
      const disabled = !sel && state.pickedTables.length >= 2;
      html += `<button class="table-pick-btn" data-table="${id}"
        data-selected="${sel}" data-disabled="${disabled}"
        ${disabled ? 'disabled' : ''}>
          ${t.name}<br><span style="font-weight:400;color:var(--parchment);font-size:0.7rem;">${t.summary}</span>
        </button>`;
    }
    html += '</div>';
    html += `<button class="btn-roll-advance" id="btn-do-roll"
      ${state.pickedTables.length === 2 ? '' : 'disabled style="opacity:0.4;cursor:not-allowed;"'}>
      🎲 Tirar 2D6 en cada tabla</button>`;
    html += '</div>';
    content.innerHTML = html;
    content.querySelectorAll('.table-pick-btn').forEach(b => {
      b.addEventListener('click', () => {
        const id = b.dataset.table;
        const i = state.pickedTables.indexOf(id);
        if (i >= 0) state.pickedTables.splice(i, 1);
        else if (state.pickedTables.length < 2) state.pickedTables.push(id);
        renderStep1();
      });
    });
    const btnRoll = content.querySelector('#btn-do-roll');
    if (btnRoll) {
      btnRoll.addEventListener('click', () => {
        const knownAdvNames = (model.baseProgression?.advancements || []).map(a => a.name);
        for (const id of state.pickedTables) {
          state.rolls[id] = roll2D6();
          state.rolledSkills[id] = resolveSkill(id, state.rolls[id].sum, knownAdvNames);
        }
        renderStep2();
      });
    }
  }

  function renderStep2() {
    let html = '<div class="roller-step">';
    html += '<div class="roller-step-title">2. Resultados — elige 1 Skill</div>';
    state.pickedTables.forEach((id, tableIdx) => {
      const t = CAMPAIGN_TABLES.skillTables[id];
      const r = state.rolls[id];
      const skill = state.rolledSkills[id];
      const isChosen = state.chosenTable === id;
      // Render dice with placeholder; animation will fill them via data-final
      html += `
        <div class="dice-roll" data-table-row="${id}" style="margin-top:0.6rem;">
          <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--parchment);width:120px;">${t.name}</span>
          <span class="die" data-table="${id}" data-die-pos="d1" data-final="${r.d1}">·</span><span class="die" data-table="${id}" data-die-pos="d2" data-final="${r.d2}">·</span>
          <span class="die-total" data-table="${id}" style="opacity:0.3;">= ?</span>
        </div>
        <div class="skill-result" data-table="${id}" data-selected="${isChosen}" style="opacity:0;transition:opacity 0.3s ease;pointer-events:none;">
          <div class="skill-from">${t.name} · 2D6 = ${r.sum}</div>
          <div class="skill-name">${skill ? skill.name : '(sin resultado)'}</div>
          <div class="skill-summary">${skill ? skill.summary : ''}</div>
        </div>
      `;
    });
    html += '</div>';
    html += `<div class="advancement-actions">
      <button class="btn" id="btn-adv-back">← Re-elegir tablas</button>
      <button class="btn btn-primary" id="btn-adv-apply"
        ${state.chosenTable ? '' : 'disabled style="opacity:0.4;cursor:not-allowed;"'}>
        Aplicar ascenso</button>
    </div>`;
    content.innerHTML = html;

    // Bind skill-result click handler (delegated to enable later)
    const bindSkillClicks = () => {
      content.querySelectorAll('.skill-result').forEach(b => {
        // Only allow clicks once revealed
        if (b.style.pointerEvents === 'none') return;
        b.addEventListener('click', () => {
          state.chosenTable = b.dataset.table;
          renderStep2();
        });
      });
    };

    content.querySelector('#btn-adv-back').addEventListener('click', () => {
      state.rolls = {};
      state.rolledSkills = {};
      state.chosenTable = null;
      renderStep1();
    });
    content.querySelector('#btn-adv-apply').addEventListener('click', () => {
      const tableId = state.chosenTable;
      const skill = state.rolledSkills[tableId];
      if (!skill) return;
      // Patron Skill (2D6 = 2 or 12): branch into the Patron picker
      // (canon p.86-93) instead of applying the generic "Patron Skill".
      if (skill.name === 'Patron Skill' && patronAllowed) {
        renderPatronStep(tableId);
        return;
      }
      applyChosenSkill(tableId, skill);
    });

    // Animate the dice in cascade per table — only on the FIRST render
    // (when the user just clicked "Tirar"). On subsequent re-renders (after
    // picking a skill), the animation has already played; just snap dice
    // to their final values immediately.
    const tables = state.pickedTables;
    const skipAnimation = !!state.chosenTable;  // true on re-render after pick

    tables.forEach((id, tableIdx) => {
      const r = state.rolls[id];
      const d1 = content.querySelector(`.die[data-table="${id}"][data-die-pos="d1"]`);
      const d2 = content.querySelector(`.die[data-table="${id}"][data-die-pos="d2"]`);
      const total = content.querySelector(`.die-total[data-table="${id}"]`);
      const skillBlock = content.querySelector(`.skill-result[data-table="${id}"]`);

      const finalize = () => {
        if (total) {
          total.textContent = `= ${r.sum}`;
          total.style.opacity = '1';
        }
        if (skillBlock) {
          skillBlock.style.opacity = '1';
          skillBlock.style.pointerEvents = '';
          skillBlock.addEventListener('click', () => {
            state.chosenTable = id;
            renderStep2();
          });
        }
      };

      if (skipAnimation) {
        // Snap immediately
        if (d1) { d1.textContent = String(r.d1); d1.dataset.result = String(r.d1); d1.classList.add('settled'); }
        if (d2) { d2.textContent = String(r.d2); d2.dataset.result = String(r.d2); d2.classList.add('settled'); }
        finalize();
      } else {
        setTimeout(() => {
          if (!d1 || !d2) return;
          animateDiceRoll([
            { el: d1, value: r.d1 },
            { el: d2, value: r.d2 },
          ], 600).then(finalize);
        }, tableIdx * 250);
      }
    });
  }

  // Build the advancement entry from a non-Patron skill and apply it.
  function applyChosenSkill(tableId, skill) {
    const entry = {
      name: skill.name,
      source: 'roll',
      skillTable: tableId,
      rolled: state.rolls[tableId] ? state.rolls[tableId].sum : null,
    };
    if (skill.mechanicalEffect) {
      if (skill.mechanicalEffect.startsWith('gain-keyword:')) {
        const kw = skill.mechanicalEffect.split(':')[1];
        const idMap = { 'NEGATE FEAR':'fearless', 'TOUGH':'tough', 'LEADER':'leader' };
        const legacyId = idMap[kw];
        if (legacyId) entry.id = legacyId;
        entry.grantsKeyword = kw;
      } else {
        entry.id = skill.mechanicalEffect;
      }
    }
    onApply(entry);
    closeModal('modal-advancement');
  }

  // Patron Skill picker (canon p.86-93). Lists the Patron Skills the
  // warband may take. If the band already has a Patron set (wb.patronId),
  // only that Patron's skills are shown; otherwise every Patron eligible
  // for the faction is shown grouped, and picking one sets wb.patronId.
  function renderPatronStep(tableId) {
    const fid = wb.factionId;
    const fixed = wb.patronId ? patronById(wb.patronId) : null;
    const patrons = fixed ? [fixed] : patronsForFaction(fid);
    let html = '<div class="roller-step">';
    html += '<div class="roller-step-title">3. Patron Skill — elige una habilidad de tu Patron</div>';
    if (!patrons.length) {
      html += `<div class="notice info" style="margin-top:0.6rem;">
        No hay Patrones canon para esta facción (${fid || '?'}). Puedes registrar el ascenso como "Patron Skill" genérico.
      </div>`;
      html += `<div class="advancement-actions">
        <button class="btn" id="btn-patron-back">← Volver</button>
        <button class="btn btn-primary" id="btn-patron-generic">Aplicar genérico</button>
      </div></div>`;
      content.innerHTML = html;
      content.querySelector('#btn-patron-back').addEventListener('click', renderStep2);
      content.querySelector('#btn-patron-generic').addEventListener('click', () => {
        onApply({ name: 'Patron Skill', source: 'roll', skillTable: tableId,
                  rolled: state.rolls[tableId] ? state.rolls[tableId].sum : null,
                  patronSkill: true });
        closeModal('modal-advancement');
      });
      return;
    }
    if (!fixed) {
      html += `<div style="font-size:0.72rem;color:var(--parchment-dim);margin:0.3rem 0 0.6rem;">
        Tu banda aún no tiene Patron asignado. Al elegir una Skill se fijará el Patron de la banda (canon: un Patron por banda).
      </div>`;
    }
    for (const p of patrons) {
      html += `<div class="patron-group" style="margin-top:0.5rem;">
        <div style="font-weight:700;color:var(--gold);font-size:0.85rem;">${p.name}
          <span style="font-weight:400;color:var(--parchment-dim);font-size:0.7rem;">· ${p.note}</span></div>
        <div class="patron-skill-list" style="display:flex;flex-direction:column;gap:0.25rem;margin-top:0.3rem;">
          ${p.skills.map(s => `
            <div class="patron-skill-opt" data-patron="${p.id}" data-skill="${s.name.replace(/"/g,'&quot;')}"
                 style="cursor:pointer;padding:0.35rem 0.5rem;border:1px solid var(--border);border-radius:4px;">
              <strong style="font-size:0.8rem;">${s.name}</strong>
              <div style="font-size:0.7rem;color:var(--parchment);">${s.summary}</div>
            </div>`).join('')}
        </div>
      </div>`;
    }
    html += `<div class="advancement-actions" style="margin-top:0.6rem;">
      <button class="btn" id="btn-patron-back">← Volver</button>
    </div></div>`;
    content.innerHTML = html;
    content.querySelector('#btn-patron-back').addEventListener('click', renderStep2);
    content.querySelectorAll('.patron-skill-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        const patronId = opt.dataset.patron;
        const skillName = opt.dataset.skill;
        // Fix the warband's Patron if not already set, and persist.
        if (!wb.patronId) {
          wb.patronId = patronId;
          try { if (typeof persistWarband === 'function') persistWarband(wb); } catch (e) {}
        }
        onApply({
          name: skillName,
          source: 'roll',
          skillTable: tableId,
          rolled: state.rolls[tableId] ? state.rolls[tableId].sum : null,
          patronSkill: true,
          patronId,
        });
        closeModal('modal-advancement');
      });
    });
  }

  renderStep1();
  openModal('modal-advancement');
}

/**
 * Open the Trauma Roll modal for a model.
 * Workflow (canon page 100):
 *   1. Roll D66 (1D6 tens, 1D6 units)
 *   2. Look up the trauma in the Trauma Table
 *   3. Apply (or re-roll if a Skill or Glory Item permits it)
 */
/* ----------------------------------------------------------------------
   HOUSE RULES MODAL — Custom Trauma D66 editor
   ---------------------------------------------------------------------- */

function openHouseRulesModal() {
  const c = STATE.currentCampaign;
  if (!c) return;
  renderHouseRulesContent();
  openModal('modal-house-rules');
}

function renderHouseRulesContent() {
  const c = STATE.currentCampaign;
  const content = document.getElementById('house-rules-content');
  if (!c || !content) return;

  // Build a row for every entry in the canon Trauma table, in order.
  // Mark which rows have an active override.
  const rows = CAMPAIGN_TABLES.traumaTable.map(canon => {
    const override = (c.houseRules && c.houseRules.traumaOverrides &&
                      c.houseRules.traumaOverrides[canon.roll]) || null;
    return { canon, override };
  });

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin:0 0 0.6rem;font-size:0.78em;color:var(--parchment-dim);">
      <div>${listTraumaOverrides(c).length} de ${rows.length} entradas modificadas</div>
      <div style="font-style:italic;">Pulsa "Editar" para personalizar una entrada.</div>
    </div>
  `;

  for (const { canon, override } of rows) {
    const active = override !== null;
    const display = active ? override : canon;
    html += `
      <div class="house-rule-row" data-roll="${canon.roll}" style="
        padding:0.55rem 0.7rem;
        margin-bottom:0.5rem;
        border-left:3px solid ${active ? 'var(--gold)' : 'rgba(127,107,67,0.3)'};
        background:${active ? 'rgba(176,141,87,0.08)' : 'rgba(127,107,67,0.05)'};
      ">
        <div style="display:flex;align-items:flex-start;gap:0.5rem;">
          <div style="font-family:var(--font-mono);font-size:0.85em;color:var(--gold);min-width:3em;">${canon.roll}</div>
          <div style="flex:1;">
            <div style="font-weight:bold;">
              ${escapeHtml(display.name)}
              <span class="trauma-result-kind" data-kind="${display.kind}" style="font-size:0.65em;margin-left:0.4em;">${display.kind}</span>
              ${active ? `<span class="trauma-result-kind" data-kind="custom" style="background:rgba(176,141,87,0.25);color:var(--gold);font-size:0.65em;margin-left:0.3em;">⚙ House Rule</span>` : ''}
            </div>
            <div style="font-size:0.78em;margin-top:0.2em;color:var(--parchment);">${escapeHtml(display.detail || '')}</div>
            ${active ? `<div style="font-size:0.7em;margin-top:0.2em;color:var(--parchment-dim);font-style:italic;">Canon: ${escapeHtml(canon.name)}</div>` : ''}
          </div>
          <div style="display:flex;flex-direction:column;gap:0.25rem;">
            <button class="btn btn-edit-rule" data-roll="${canon.roll}" style="font-size:0.7em;padding:0.25em 0.6em;">${active ? '✎ Editar' : '✎ Modificar'}</button>
            ${active ? `<button class="btn btn-reset-rule" data-roll="${canon.roll}" style="font-size:0.7em;padding:0.25em 0.6em;color:var(--parchment-dim);">↺ Canon</button>` : ''}
          </div>
        </div>
        <div class="rule-edit-form" data-roll="${canon.roll}" style="display:none;margin-top:0.6rem;padding-top:0.6rem;border-top:1px dashed rgba(127,107,67,0.3);">
          <label style="display:block;font-size:0.78em;margin-bottom:0.3rem;">
            Nombre:
            <input type="text" class="rule-name" value="${escapeHtml(display.name)}" style="width:100%;padding:0.3em;font-family:var(--font-mono);font-size:0.85em;">
          </label>
          <label style="display:block;font-size:0.78em;margin-bottom:0.3rem;">
            Tipo:
            <select class="rule-kind" style="font-family:var(--font-mono);">
              <option value="death" ${display.kind==='death'?'selected':''}>death</option>
              <option value="capture" ${display.kind==='capture'?'selected':''}>capture</option>
              <option value="scar" ${display.kind==='scar'?'selected':''}>scar</option>
              <option value="recovery" ${display.kind==='recovery'?'selected':''}>recovery</option>
              <option value="lost-equipment" ${display.kind==='lost-equipment'?'selected':''}>lost-equipment</option>
            </select>
          </label>
          <label style="display:block;font-size:0.78em;margin-bottom:0.3rem;">
            Detalle:
            <textarea class="rule-detail" rows="3" style="width:100%;padding:0.3em;font-family:var(--font-mono);font-size:0.78em;">${escapeHtml(display.detail || '')}</textarea>
          </label>
          <div style="display:flex;gap:0.4rem;justify-content:flex-end;">
            <button class="btn btn-cancel-rule" data-roll="${canon.roll}" style="font-size:0.78em;">Cancelar</button>
            <button class="btn btn-primary btn-save-rule" data-roll="${canon.roll}" style="font-size:0.78em;">Guardar</button>
          </div>
        </div>
      </div>
    `;
  }
  content.innerHTML = html;

  // Bind edit buttons
  content.querySelectorAll('.btn-edit-rule').forEach(btn => {
    btn.addEventListener('click', () => {
      const roll = btn.dataset.roll;
      // Coerce numeric-looking roll keys to numbers (canon table uses ints)
      const rollKey = /^\d+$/.test(roll) ? parseInt(roll, 10) : roll;
      const form = content.querySelector(`.rule-edit-form[data-roll="${roll}"]`);
      if (form) form.style.display = '';
      btn.style.display = 'none';
    });
  });
  content.querySelectorAll('.btn-cancel-rule').forEach(btn => {
    btn.addEventListener('click', () => {
      const roll = btn.dataset.roll;
      const form = content.querySelector(`.rule-edit-form[data-roll="${roll}"]`);
      const editBtn = content.querySelector(`.btn-edit-rule[data-roll="${roll}"]`);
      if (form) form.style.display = 'none';
      if (editBtn) editBtn.style.display = '';
    });
  });
  content.querySelectorAll('.btn-save-rule').forEach(btn => {
    btn.addEventListener('click', () => {
      const roll = btn.dataset.roll;
      const rollKey = /^\d+$/.test(roll) ? parseInt(roll, 10) : roll;
      const form = content.querySelector(`.rule-edit-form[data-roll="${roll}"]`);
      if (!form) return;
      const name = form.querySelector('.rule-name').value.trim();
      const kind = form.querySelector('.rule-kind').value;
      const detail = form.querySelector('.rule-detail').value.trim();
      if (!name) {
        alert('El nombre no puede estar vacío.');
        return;
      }
      setTraumaOverride(STATE.currentCampaign, rollKey, { name, kind, detail });
      persistCampaign(STATE.currentCampaign);
      renderHouseRulesContent();
      // Update count badge in the campaign center
      const countEl = document.getElementById('house-rules-count');
      if (countEl) countEl.textContent = listTraumaOverrides(STATE.currentCampaign).length;
    });
  });
  content.querySelectorAll('.btn-reset-rule').forEach(btn => {
    btn.addEventListener('click', () => {
      const roll = btn.dataset.roll;
      const rollKey = /^\d+$/.test(roll) ? parseInt(roll, 10) : roll;
      if (!confirm('¿Restaurar la entrada canon? La House Rule se perderá.')) return;
      removeTraumaOverride(STATE.currentCampaign, rollKey);
      persistCampaign(STATE.currentCampaign);
      renderHouseRulesContent();
      const countEl = document.getElementById('house-rules-count');
      if (countEl) countEl.textContent = listTraumaOverrides(STATE.currentCampaign).length;
    });
  });
}

function openTraumaRollModal(model, wb, onApply) {
  const state = { roll: null, entry: null };
  const subtitle = document.getElementById('trauma-subtitle');
  if (subtitle) {
    const u = getUnit(wb.factionId, model.unitId);
    subtitle.textContent = `Trauma para ${model.customName || u?.name || 'modelo'}.`;
  }
  const content = document.getElementById('trauma-content');

  function render() {
    let html = '<div class="roller-step">';
    if (!state.roll) {
      html += '<div class="roller-step-title">Tira el D66</div>';
      html += `<button class="btn-roll-advance" id="btn-do-trauma">🎲 Tirar 2D6 (decenas + unidades)</button>`;
    } else {
      const r = state.roll;
      html += '<div class="roller-step-title">Resultado</div>';
      // Mark "critical-bad" results (Dead=11, Captured=12) so they pulse red
      const isBad = r.value === 11 || r.value === 12;
      const tensClass = isBad ? ' data-result="critical-bad"' : '';
      const unitsClass = isBad ? ' data-result="critical-bad"' : '';
      html += `
        <div class="dice-roll" style="margin-bottom:0.6rem;">
          <span style="font-family:var(--font-mono);font-size:0.72rem;color:var(--parchment);width:80px;">D66</span>
          <span class="die" id="trauma-die-tens"${tensClass}>${r.tens}</span>
          <span style="font-family:var(--font-mono);">·</span>
          <span class="die" id="trauma-die-units"${unitsClass}>${r.units}</span>
          <span class="die-total">= ${r.value}</span>
        </div>
      `;
      if (state.entry) {
        const e = state.entry;
        const customBadge = e.isCustom
          ? `<span class="trauma-result-kind" data-kind="custom" style="background:rgba(176,141,87,0.25);color:var(--gold);" title="Esta entrada está modificada por las House Rules de tu campaña.">⚙ House Rule</span>`
          : '';
        const canonNote = (e.isCustom && e.canonOriginal)
          ? `<div style="margin-top:0.4em;font-size:0.7em;color:var(--parchment-dim);font-style:italic;">Canon original: <strong>${escapeHtml(e.canonOriginal.name)}</strong></div>`
          : '';
        html += `
          <div class="trauma-result dice-result-reveal">
            <div class="trauma-result-name">
              ${escapeHtml(e.name)}
              <span class="trauma-result-kind" data-kind="${e.kind}">${e.kind}</span>
              ${customBadge}
            </div>
            <div class="trauma-result-roll">D66 ${e.roll}</div>
            <div class="trauma-result-detail">${e.detail}</div>
            ${canonNote}
          </div>
        `;
      } else {
        html += '<p class="dice-result-reveal" style="color:var(--parchment);">Sin entrada para esta tirada.</p>';
      }
    }
    html += '</div>';
    if (state.roll) {
      html += `<div class="trauma-actions">
        <button class="btn" id="btn-trauma-reroll">↺ Re-tirar</button>
        <button class="btn btn-primary" id="btn-trauma-apply">Aplicar resultado</button>
      </div>`;
    }
    content.innerHTML = html;

    if (!state.roll) {
      content.querySelector('#btn-do-trauma').addEventListener('click', () => {
        // Roll first (logical), then animate the dice elements to those values
        state.roll = rollD66();
        state.entry = getEffectiveTrauma(state.roll.value, STATE.currentCampaign);
        render();  // Renders dice with final values + applies .settled-friendly DOM
        // Now animate them: re-grab elements and roll
        const tensEl = content.querySelector('#trauma-die-tens');
        const unitsEl = content.querySelector('#trauma-die-units');
        if (tensEl && unitsEl) {
          // The settle markup will be re-applied by animateDieRoll
          tensEl.classList.remove('settled');
          unitsEl.classList.remove('settled');
          animateDiceRoll([
            { el: tensEl, value: state.roll.tens },
            { el: unitsEl, value: state.roll.units },
          ], 700);
        }
      });
    } else {
      // After result is shown, also animate dice on first paint (in case user
      // navigated away and came back). Skip if already settled.
      const tensEl = content.querySelector('#trauma-die-tens');
      const unitsEl = content.querySelector('#trauma-die-units');
      if (tensEl && !tensEl.classList.contains('settled')) {
        animateDiceRoll([
          { el: tensEl, value: state.roll.tens },
          { el: unitsEl, value: state.roll.units },
        ], 700);
      }

      content.querySelector('#btn-trauma-reroll').addEventListener('click', () => {
        state.roll = rollD66();
        state.entry = getEffectiveTrauma(state.roll.value, STATE.currentCampaign);
        render();
        // Animate again on re-roll
        const t = content.querySelector('#trauma-die-tens');
        const u = content.querySelector('#trauma-die-units');
        if (t && u) {
          t.classList.remove('settled');
          u.classList.remove('settled');
          animateDiceRoll([
            { el: t, value: state.roll.tens },
            { el: u, value: state.roll.units },
          ], 700);
        }
      });
      content.querySelector('#btn-trauma-apply').addEventListener('click', () => {
        onApply(state.entry, state.roll);
        closeModal('modal-trauma');
      });
    }
  }

  render();
  openModal('modal-trauma');
}

/**
 * Open the Promotion Step modal for a warband (canon page 104).
 * Workflow:
 *   1. Build the Promotion Pool: 1D6 base + 1D6 per Glorious Deed
 *      (user enters Glorious Deeds count; can also adjust manually for
 *      Skills/Glory Items that grant extra dice).
 *   2. Assign dice to eligible Troops, respecting the canon assignment rule:
 *      cannot assign a 3rd die to the same model until all eligible Troops
 *      have at least 2 dice each, etc.
 *   3. Roll the assigned dice for each model in turn. As soon as a model
 *      rolls a 6, it is promoted and remaining dice for that model stop.
 *   4. Apply: promoted models gain ELITE.
 *
 * Constraints:
 *   - Maximum 6 ELITE in the warband (skip the step entirely if already at 6).
 *   - After 5 consecutive non-6 dice across the whole pool, the 6th roll
 *     auto-succeeds (canon: "the next roll, the 6th one, is automatically
 *     considered to be a 6").
 */
function openPromotionModal(wb, onApply) {
  const eligible = eligibleForPromotion(wb);
  const eliteCount = countEliteInWarband(wb);
  const eliteSlotsLeft = Math.max(0, CAMPAIGN_TABLES.promotionRules.maxElites - eliteCount);

  // Pre-fill Glorious Deeds from the current game's tally if the band is
  // tied to a campaign game; otherwise from the entire band tally.
  // Canon: pool = 1 + 1 per Glorious Deed performed in the GAME just played.
  // Pass the campaign so feats recorded in the wizard are also counted.
  const presetDeeds = wb.gameNumber
    ? countGloriousDeeds(wb, wb.gameNumber, STATE.currentCampaign)
    : countGloriousDeeds(wb, undefined, STATE.currentCampaign);

  const state = {
    gloriousDeeds: presetDeeds,
    extraDice: 0,
    poolSize: 1,
    assignments: {},  // model.uid → number of dice assigned
    rolledOrder: [],  // order in which models were rolled (for display)
    rollsByModel: {}, // model.uid → array of die results
    promotedUids: new Set(),
    consecutiveFails: 0,  // global non-6 streak for the auto-success rule
    phase: 'config', // 'config' → 'assign' → 'rolling' → 'done'
  };
  // Recompute pool based on inputs
  const recomputePool = () => {
    state.poolSize = promotionPoolSize(state.gloriousDeeds, wb) + state.extraDice;
  };
  recomputePool();

  const subtitle = document.getElementById('promotion-subtitle');
  if (subtitle) {
    subtitle.textContent = `${eligible.length} Troops elegibles · ${eliteCount}/6 ELITE actuales · ${eliteSlotsLeft} plazas libres.`;
  }
  const content = document.getElementById('promotion-content');

  // Total assigned dice
  const totalAssigned = () => Object.values(state.assignments).reduce((a,b)=>a+(b||0), 0);

  // Validate canonical assignment constraint:
  //   "cannot assign a 3rd dice to the same model until all Troop models
  //   have at least 2 dice each"
  // Equivalent: max(assigned) - min(assigned) ≤ 1 across eligible Troops.
  const eligibleUids = eligible.map(e => e.uid);
  const canIncrement = (uid) => canIncrementPromotionDice(uid, state.assignments, eligibleUids, state.poolSize);
  const canDecrement = (uid) => (state.assignments[uid] || 0) > 0;

  function renderConfig() {
    let html = `
      <div class="roller-step">
        <div class="roller-step-title">1. Promotion Pool</div>
        <div class="promo-pool-config">
          <label>Glorious Deeds:</label>
          <input type="number" id="pp-deeds" min="0" max="20" value="${state.gloriousDeeds}" />
          <label style="margin-left:1rem;">Dados extra (Skills/Glory):</label>
          <input type="number" id="pp-extra" min="0" max="20" value="${state.extraDice}" />
        </div>
        <div class="promo-pool-summary">
          <strong>Pool total:</strong> ${state.poolSize} dado${state.poolSize===1?'':'s'}
          <span style="opacity:0.7;">(1 base + ${state.gloriousDeeds} Glorious Deed${state.gloriousDeeds===1?'':'s'}${state.extraDice ? ' + ' + state.extraDice + ' extra' : ''})</span>
          <br>
          <strong>ELITE actuales:</strong> ${eliteCount} / ${CAMPAIGN_TABLES.promotionRules.maxElites}
          ${eliteSlotsLeft === 0 ? ' <span style="color:var(--fallen-blood-bright);">— máximo alcanzado, sin promociones posibles</span>' : ''}
          <br>
          <strong>Troops elegibles:</strong> ${eligible.length}
        </div>
        <button class="btn-roll-advance" id="pp-next"
          ${eligible.length === 0 || eliteSlotsLeft === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
          Continuar a la asignación →
        </button>
      </div>
    `;
    content.innerHTML = html;
    content.querySelector('#pp-deeds').addEventListener('input', (e) => {
      state.gloriousDeeds = Math.max(0, parseInt(e.target.value, 10) || 0);
      recomputePool();
      renderConfig();
    });
    content.querySelector('#pp-extra').addEventListener('input', (e) => {
      state.extraDice = Math.max(0, parseInt(e.target.value, 10) || 0);
      recomputePool();
      renderConfig();
    });
    const btnNext = content.querySelector('#pp-next');
    if (btnNext && !btnNext.disabled) {
      btnNext.addEventListener('click', () => {
        // Initialize assignments to 0
        state.assignments = {};
        for (const e of eligible) state.assignments[e.uid] = 0;
        state.phase = 'assign';
        renderAssign();
      });
    }
  }

  function renderAssign() {
    const remaining = state.poolSize - totalAssigned();
    let html = `
      <div class="roller-step">
        <div class="roller-step-title">2. Asignación de dados</div>
        <div class="promo-pool-summary">
          <strong>Pool restante:</strong> ${remaining} / ${state.poolSize}
          <br>
          <span style="opacity:0.85;font-size:0.75rem;">Regla canon: no puedes asignar un 3er dado a un modelo hasta que todos los Troops tengan 2; ni un 4º hasta que todos tengan 3, y así sucesivamente.</span>
        </div>
    `;
    for (const m of eligible) {
      const u = getUnit(wb.factionId, m.unitId);
      const xp = m.baseProgression?.xp || 0;
      const advs = (m.baseProgression?.advancements || []).length;
      const assigned = state.assignments[m.uid] || 0;
      html += `
        <div class="promo-troop-row">
          <div>
            <div class="promo-troop-name">${m.customName || u?.name || '?'}</div>
            <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment);opacity:0.7;">
              ${u?.name || ''} · ${xp} XP · ${advs}★
            </div>
          </div>
          <div class="promo-assigned-count">
            <button class="pp-dec" data-uid="${m.uid}" ${!canDecrement(m.uid) ? 'disabled' : ''}>−</button>
            <span style="min-width:1.8rem;text-align:center;font-weight:700;">${assigned}</span>
            <button class="pp-inc" data-uid="${m.uid}" ${!canIncrement(m.uid) ? 'disabled' : ''}>+</button>
          </div>
          <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment);opacity:0.6;">
            dado${assigned===1?'':'s'}
          </div>
        </div>
      `;
    }
    html += `
        <div class="promo-actions">
          <button class="btn" id="pp-back">← Volver</button>
          <button class="btn btn-primary" id="pp-roll" ${totalAssigned() === 0 ? 'disabled style="opacity:0.4;cursor:not-allowed;"' : ''}>
            🎲 Tirar Promotion Dice
          </button>
        </div>
      </div>
    `;
    content.innerHTML = html;
    content.querySelectorAll('.pp-inc').forEach(b => {
      b.addEventListener('click', () => {
        const uid = b.dataset.uid;
        if (canIncrement(uid)) {
          state.assignments[uid] = (state.assignments[uid] || 0) + 1;
          renderAssign();
        }
      });
    });
    content.querySelectorAll('.pp-dec').forEach(b => {
      b.addEventListener('click', () => {
        const uid = b.dataset.uid;
        if (canDecrement(uid)) {
          state.assignments[uid] = Math.max(0, (state.assignments[uid] || 0) - 1);
          renderAssign();
        }
      });
    });
    content.querySelector('#pp-back').addEventListener('click', () => {
      state.phase = 'config';
      renderConfig();
    });
    const btnRoll = content.querySelector('#pp-roll');
    if (btnRoll && !btnRoll.disabled) {
      btnRoll.addEventListener('click', () => {
        rollAllDice();
        state.phase = 'done';
        renderResults();
      });
    }
  }

  // Roll all assigned dice using the pure rollPromotionDice helper.
  function rollAllDice() {
    const maxAllowed = CAMPAIGN_TABLES.promotionRules.maxElites - eliteCount;
    const autoSuccessAfter = CAMPAIGN_TABLES.promotionRules.autoSuccessAfterFails;
    const result = rollPromotionDice(eligible, state.assignments, maxAllowed, autoSuccessAfter);
    state.rollsByModel = result.rollsByUid;
    state.rolledOrder = result.rolledOrder;
    state.promotedUids = result.promotedUids;
    state.consecutiveFails = result.consecutiveFails;
  }

  function renderResults() {
    const promotedList = [];
    let html = `<div class="roller-step"><div class="roller-step-title">3. Resultados</div>`;
    for (const uid of state.rolledOrder) {
      const m = eligible.find(e => e.uid === uid);
      if (!m) continue;
      const u = getUnit(wb.factionId, m.unitId);
      const results = state.rollsByModel[uid] || [];
      const promoted = state.promotedUids.has(uid);
      if (promoted) promotedList.push(m);
      // Render dice with placeholder values; the animation will set the real
      // ones via animateDieRoll. The data-result is set during the animation.
      html += `
        <div class="promo-troop-row" data-uid="${uid}" data-promoted="${promoted}" data-pending-promoted="${promoted}">
          <div>
            <div class="promo-troop-name">${m.customName || u?.name || '?'}</div>
            <div style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment);opacity:0.7;">
              ${u?.name || ''}
            </div>
          </div>
          <div class="promo-troop-rolled-dice">
            ${results.map((r, i) => `<span class="promo-die-mini" data-die-idx="${i}" data-final="${r.value}" data-auto="${r.auto}">·</span>`).join('')}
          </div>
          <div class="promo-troop-verdict" style="font-family:var(--font-mono);font-size:0.75rem;font-weight:700;color:var(--parchment-dim);opacity:0.4;">
            …
          </div>
        </div>
      `;
    }
    // Banner is hidden until animation completes
    html += `<div class="promo-result-banner promo-banner-pending" style="opacity:0;transition:opacity 0.3s ease 0.1s;">${
      promotedList.length === 0
        ? 'Ninguna promoción. La banda mantiene su composición actual.'
        : `<strong>${promotedList.length}</strong> modelo${promotedList.length===1?'':'s'} ascendido${promotedList.length===1?'':'s'} a ELITE. Empiezan con 0 XP (canon: ganan +1 XP al final del Experience Step por sobrevivir).`
    }</div>`;
    html += `<div class="promo-actions">
      <button class="btn" id="pp-redo">↺ Re-tirar</button>
      <button class="btn btn-primary" id="pp-apply" disabled style="opacity:0.4;cursor:not-allowed;">Aplicar promociones</button>
    </div></div>`;
    content.innerHTML = html;
    content.querySelector('#pp-redo').addEventListener('click', () => {
      rollAllDice();
      renderResults();
    });
    content.querySelector('#pp-apply').addEventListener('click', () => {
      onApply(promotedList);
      closeModal('modal-promotion');
    });

    // Animate the dice with a staggered cascade per model — each row's dice
    // start rolling 200ms after the previous row's row, so the user sees a
    // nice flow rather than all dice rolling at once. Verdict + banner fade
    // in only after all rolls have settled.
    const rows = [...content.querySelectorAll('.promo-troop-row')];
    const tasks = [];
    rows.forEach((row, rowIdx) => {
      const dice = [...row.querySelectorAll('.promo-die-mini')];
      // Schedule each row's animation
      tasks.push(new Promise((resolve) => {
        setTimeout(() => {
          // Animate all dice in this row in parallel; resolve when all done.
          const dicePromises = dice.map(dieEl => {
            const final = parseInt(dieEl.dataset.final, 10);
            return animateDieRoll(dieEl, final, 600);
          });
          Promise.all(dicePromises).then(() => {
            // Reveal the verdict for this row
            const verdict = row.querySelector('.promo-troop-verdict');
            const isPromoted = row.dataset.pendingPromoted === 'true';
            if (verdict) {
              verdict.textContent = isPromoted ? '★ ASCIENDE' : 'no asciende';
              verdict.style.color = isPromoted ? 'var(--faithful-gold)' : 'var(--parchment)';
              verdict.style.opacity = '1';
              verdict.style.transition = 'opacity 0.3s ease';
            }
            resolve();
          });
        }, rowIdx * 220);  // stagger: 220ms between rows
      }));
    });
    // After all dice settle, reveal banner + enable Apply button
    Promise.all(tasks).then(() => {
      const banner = content.querySelector('.promo-banner-pending');
      if (banner) banner.style.opacity = '1';
      const applyBtn = content.querySelector('#pp-apply');
      if (applyBtn) {
        applyBtn.disabled = false;
        applyBtn.style.opacity = '';
        applyBtn.style.cursor = '';
      }
    });
  }

  if (eligible.length === 0 || eliteSlotsLeft === 0) {
    // Render config but with disabled next button — gives the user a clear message.
  }
  renderConfig();
  openModal('modal-promotion');
}

/**
 * Open the Reinforcements Step modal (canon page 112).
 *
 * The user is shown:
 *   - Current band size and total cost
 *   - Threshold for the upcoming game
 *   - Computed available budget (threshold − current cost)
 *   - The canonical penalties they're about to accept (Arsenal lost,
 *     Strongbox to 0, no Exploration / Quartermaster).
 *
 * On confirmation, applyReinforcementsStep() is called: gameNumber is
 * advanced, budgetTotal is set to the next threshold, Arsenal cleared,
 * Strongbox zeroed. The user then adds the new models from the catalogue
 * normally — the increased budgetTotal naturally enforces the limit.
 */
function openReinforcementsModal(wb, onApply) {
  const subtitle = document.getElementById('reinforcements-subtitle');
  const content = document.getElementById('reinforcements-content');
  if (!content) return;

  const currentGame = wb.gameNumber || 1;
  // The "next game" defaults to current + 1, but the user can adjust if they
  // want to call reinforcements going into game N+1.
  let nextGame = Math.min(12, currentGame + 1);

  function render() {
    const calc = calculateReinforcementsBudget(wb, nextGame);
    if (subtitle) {
      subtitle.textContent = `Game ${currentGame} → Game ${nextGame}.  Esta acción es irreversible y descarta el Arsenal y el Strongbox 👑.`;
    }

    let html = `
      <div class="roller-step">
        <div class="roller-step-title">1. Game al que avanzas</div>
        <div class="promo-pool-config">
          <label>Próximo Game:</label>
          <select id="rf-next-game">
            ${CAMPAIGN_TABLES.warbandThresholdByGame.map(r => `
              <option value="${r.game}" ${r.game === nextGame ? 'selected' : ''}>
                Game ${r.game} — ${r.threshold} 👑 · ${r.fieldStrength} mod.
              </option>
            `).join('')}
          </select>
        </div>
        <div class="promo-pool-summary">
          <strong>Coste actual de la banda:</strong> ${calc.currentTotalCost} 👑
          (${calc.currentModelCount} modelo${calc.currentModelCount===1?'':'s'})<br>
          <strong>Threshold Game ${calc.nextGame}:</strong> ${calc.threshold} 👑
          · Field Strength máx ${calc.fieldStrength} modelos<br>
          <strong style="color:${calc.underThreshold ? 'var(--faithful-gold)' : 'var(--fallen-blood-bright)'};">
            Presupuesto disponible: ${calc.availableBudget} 👑
          </strong>
          ${calc.underThreshold
            ? ` · Plazas libres de modelos: ${calc.modelSlotsLeft}`
            : ' — banda ya en/por encima del threshold, no se necesitan refuerzos'}
        </div>
      </div>

      <div class="roller-step">
        <div class="roller-step-title">2. Penalizaciones canon</div>
        <div style="background:rgba(193,60,48,0.15);border:1px solid var(--fallen-blood);
          border-radius:3px;padding:0.6rem 0.8rem;font-size:0.78rem;
          color:var(--parchment-bright);line-height:1.6;">
          ⚠ <strong>Arsenal descartado</strong>: cualquier Battlekit guardado se pierde.<br>
          ⚠ <strong>Strongbox 👑 → 0</strong>: todos tus ducados acumulados se gastan en favores.<br>
          ⚠ <strong>Sin Exploration Step</strong> en este ciclo.<br>
          ⚠ <strong>Sin Quartermaster Step</strong> en este ciclo.<br>
          ⚠ <strong>👑 no gastados se pierden</strong>: cualquier 👑 que sobre tras reclutar se descarta.
        </div>
      </div>

      <div class="roller-step">
        <div class="roller-step-title">3. Tras confirmar</div>
        <div class="promo-pool-summary" style="font-size:0.75rem;">
          • La banda avanzará a <strong>Game ${calc.nextGame}</strong>.<br>
          • El presupuesto se ajustará a <strong>${calc.threshold} 👑</strong>.<br>
          • Añade los nuevos modelos desde el catálogo normalmente.
          El budget activo respetará automáticamente el threshold.<br>
          • Después, exporta el roster para la próxima partida.
        </div>
      </div>

      <div class="promo-actions">
        <button class="btn" data-close>Cancelar</button>
        <button class="btn btn-primary" id="rf-confirm"
          ${calc.underThreshold ? '' : 'disabled style="opacity:0.4;cursor:not-allowed;"'}>
          📯 Confirmar Reinforcements
        </button>
      </div>
    `;
    content.innerHTML = html;

    // Re-render on next-game change
    const sel = content.querySelector('#rf-next-game');
    if (sel) {
      sel.addEventListener('change', () => {
        nextGame = parseInt(sel.value, 10);
        render();
      });
    }
    const btnConfirm = content.querySelector('#rf-confirm');
    if (btnConfirm && !btnConfirm.disabled) {
      btnConfirm.addEventListener('click', () => {
        applyReinforcementsStep(wb, nextGame);
        onApply(wb);
        closeModal('modal-reinforcements');
      });
    }
  }

  render();
  openModal('modal-reinforcements');
}


