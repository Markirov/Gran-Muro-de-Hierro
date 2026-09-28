/* ======================================================================
   FASE 4.2 — PLACEHOLDER STEPS (exploration, quartermaster, resumen)

   These steps appear in the wizard's canon order but their bodies are
   stubs that will be filled in by subsequent subphases:
     - Exploration   (Fase 4.5): canon Common/Rare/Legendary tables.
     - Quartermaster (Fase 4.6): integrates the standalone QM modal flow.
     - Resumen       (Fase 4.7): final review + save path (campaign + free).
   The collect handlers all return true so the wizard advances cleanly
   while these steps are still empty.
   ====================================================================== */

function renderWizardExploration(body) {
  body.innerHTML = `<h4>Exploration</h4>
    <p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment-dim);">
      Tira los dados de Exploration: el Looting da <strong>rollTotal × 10 👑</strong>
      (la fuente canon de dinero). Marca el resultado de la batalla — si ganaste
      tienes un re-roll extra.
    </p>`;
  // Win/Draw/Loss — afecta al re-roll extra (canon p.112) y al récord de campaña.
  appendWizardResultSelector(body);
  const ctxs = getWizardExplorationContexts(WIZARD);
  if (!ctxs.length) {
    body.innerHTML += `<div class="notice info" style="margin-top:1rem;">
      No hay participantes con datos de Exploration. Salta este paso.
    </div>`;
    return;
  }

  // Ensure discoveries array exists (Fase 4.5 init may be missing on
  // older WIZARD shapes that pre-date this field).
  if (!Array.isArray(WIZARD.battle.discoveries)) WIZARD.battle.discoveries = [];

  for (const ctx of ctxs) {
    const wb = loadWarband(ctx.warbandId);
    const existing = WIZARD.battle.discoveries.find(d => d.warbandId === ctx.warbandId);
    const card = el('div', 'detail-section');
    let inner = `
      <div class="detail-label">${wb ? (wb.name || ctx.warbandId) : ctx.warbandId}</div>
      <div style="font-size:0.85rem;color:var(--parchment-dim);margin-bottom:0.5rem;">
        ${ctx.dice} dado${ctx.dice === 1 ? '' : 's'} · tabla
        <strong>${ctx.tableName}</strong>
        · ${ctx.alreadyDiscovered.length} descubrimiento${ctx.alreadyDiscovered.length === 1 ? '' : 's'} previo${ctx.alreadyDiscovered.length === 1 ? '' : 's'}
      </div>`;

    if (!existing) {
      inner += `<button class="btn btn-primary" type="button" data-roll-wid="${ctx.warbandId}">🎲 Tirar dados</button>`;
    } else {
      const r = existing;
      // Cada D6 como span animado .expl-die. Glyphs ⚀⚁⚂⚃⚄⚅. Cuando
      // se re-renderiza el wizard tras una tirada, los spans se
      // insertan nuevos en el DOM y disparan el keyframe one-shot.
      const dieGlyphs = ['⚀','⚁','⚂','⚃','⚄','⚅'];
      const diceStr = r.dice.map(d => `<span class="expl-die">${dieGlyphs[d - 1] || '?'}</span>`).join('<span class="expl-die-sep">+</span>')
                   + `<span class="expl-die-total">= ${r.rollTotal}</span>`;
      let resultBlock = '';
      if (r.result.kind === 'pillaged') {
        resultBlock = `<div style="margin-top:0.5rem;">
          <strong>Sin descubrimiento</strong> · solo loot · +${r.result.lootDucats} 👑
          ${r.result.reason === 'rediscovery' ? ` <span style="color:var(--parchment-dim);">(ya saqueado y sin variantes)</span>` : ''}
        </div>`;
      } else if (r.result.kind === 'discovery' || r.result.kind === 'fork') {
        const e = r.result.entry;
        const hasOptions = Array.isArray(e.options) && e.options.length > 0;
        const pickedId = r.chosenOptionId || null;
        const picked = pickedId && hasOptions ? e.options.find(o => o.id === pickedId) : null;
        resultBlock = `<div style="margin-top:0.5rem;">
          <strong>${r.result.kind === 'fork' ? 'Variante: ' : ''}${e.name}</strong>
          <span style="color:var(--parchment-dim);"> · +${r.result.lootDucats} 👑</span>
          ${e.narrative ? `<div style="margin-top:0.25rem;font-size:0.85rem;font-style:italic;color:var(--parchment);">${e.narrative}</div>` : ''}
          ${picked ? `
            <div style="margin-top:0.4rem;font-size:0.85rem;color:var(--gold);">
              ✓ Elegido: <strong>${picked.label}</strong> — ${picked.description || ''}
            </div>` : ''}
          ${(() => {
            // Fase 5.5 — surface resolver button when the chosen option needs one.
            const eff = picked && picked.effect;
            if (!eff || eff.kind !== 'grant-xp-to-elites') return '';
            const resolved = r.chosenOption && Array.isArray(r.chosenOption.resolvedTargets) && r.chosenOption.resolvedTargets.length > 0;
            return `<div style="margin-top:0.4rem;font-size:0.85rem;">
              ${resolved
                ? `<span style="color:var(--gold);">✓ ${r.chosenOption.resolvedTargets.length} ELITE${r.chosenOption.resolvedTargets.length === 1 ? '' : 's'} marcado${r.chosenOption.resolvedTargets.length === 1 ? '' : 's'} para +${eff.xp} XP.</span>`
                : `<span style="color:var(--fallen-blood-bright);">⚠ Falta asignar ${eff.maxModels || 1} ELITE${(eff.maxModels || 1) === 1 ? '' : 's'} (+${eff.xp} XP cada uno).</span>`}
              <div style="margin-top:0.3rem;">
                <button class="btn" type="button" data-resolve-grant-xp-wid="${ctx.warbandId}">
                  ${resolved ? '↺ Cambiar selección' : '🎯 Elegir ELITES'}
                </button>
              </div>
            </div>`;
          })()}
          ${(() => {
            // P2/4 — surface resolver button for choose-battlekit.
            const eff = picked && picked.effect;
            if (!eff || eff.kind !== 'choose-battlekit') return '';
            const kw = (eff.filter && eff.filter.keyword) || '';
            const resolvedKit = r.chosenOption && r.chosenOption.resolvedKit;
            return `<div style="margin-top:0.4rem;font-size:0.85rem;">
              ${resolvedKit
                ? `<span style="color:var(--gold);">✓ Elegido battlekit: <strong>${resolvedKit.name}</strong>.</span>`
                : `<span style="color:var(--fallen-blood-bright);">⚠ Falta elegir battlekit (keyword: ${kw || '—'}).</span>`}
              <div style="margin-top:0.3rem;">
                <button class="btn" type="button" data-resolve-choose-bk-wid="${ctx.warbandId}">
                  ${resolvedKit ? '↺ Cambiar selección' : '🎯 Elegir battlekit'}
                </button>
              </div>
            </div>`;
          })()}
          ${hasOptions ? `
            <div style="margin-top:0.4rem;">
              <button class="btn" type="button" data-pick-option-wid="${ctx.warbandId}">
                ${picked ? '↺ Cambiar opción' : '🎯 Elegir opción'}
              </button>
            </div>` : ''}
        </div>`;
      }
      const rerollStatus = wizardRerollStatus(existing);
      const won = wizardWonForWarband(WIZARD, ctx.warbandId);
      inner += `<div style="margin-top:0.5rem;font-family:var(--font-mono);font-size:0.85rem;">Dados: ${diceStr}</div>
        ${resultBlock}
        <div style="margin-top:0.5rem;display:flex;gap:0.4rem;flex-wrap:wrap;">
          <button class="btn" type="button" data-roll-wid="${ctx.warbandId}">↺ Tirar de nuevo (limpio)</button>
          ${rerollStatus.generalAvailable
            ? `<button class="btn" type="button" data-reroll-kind="general" data-reroll-wid="${ctx.warbandId}" title="Canon: 1 re-roll por batalla">↻ Re-roll general (1)</button>`
            : `<span style="font-size:0.75rem;color:var(--parchment-dim);align-self:center;">re-roll general usado</span>`}
          ${won
            ? (rerollStatus.winAvailable
                ? `<button class="btn" type="button" data-reroll-kind="win" data-reroll-wid="${ctx.warbandId}" title="Canon: 1 re-roll extra por haber ganado">🏆 Re-roll victoria (1)</button>`
                : `<span style="font-size:0.75rem;color:var(--parchment-dim);align-self:center;">re-roll victoria usado</span>`)
            : ''}
        </div>`;
    }
    card.innerHTML = inner;
    body.appendChild(card);
  }

  body.querySelectorAll('[data-roll-wid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wid = btn.dataset.rollWid;
      const ctx = ctxs.find(c => c.warbandId === wid);
      if (!ctx) return;
      const rolled = rollWizardExploration(ctx);
      const existingIdx = WIZARD.battle.discoveries.findIndex(d => d.warbandId === wid);
      const entry = { warbandId: wid, tableName: ctx.tableName, ...rolled };
      if (existingIdx >= 0) WIZARD.battle.discoveries[existingIdx] = entry;
      else                  WIZARD.battle.discoveries.push(entry);
      renderWizardStep();
    });
  });

  // Fase 5.1 — wire "Elegir opción" buttons to the picker modal.
  body.querySelectorAll('[data-pick-option-wid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wid = btn.dataset.pickOptionWid;
      const disc = WIZARD.battle.discoveries.find(d => d.warbandId === wid);
      const ctx = ctxs.find(c => c.warbandId === wid);
      if (!disc || !ctx) return;
      openExplorationOptionPicker(disc, ctx.factionId);
    });
  });

  // Fase 5.5 — wire grant-xp-to-elites resolver buttons.
  body.querySelectorAll('[data-resolve-grant-xp-wid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wid = btn.dataset.resolveGrantXpWid;
      const disc = WIZARD.battle.discoveries.find(d => d.warbandId === wid);
      if (!disc) return;
      const wb = (typeof loadWarband === 'function') ? loadWarband(wid) : null;
      if (!wb) {
        alert('No se puede abrir el resolver: banda no encontrada.');
        return;
      }
      openGrantXpEliteResolver(disc, wb);
    });
  });

  // P2/4 — wire choose-battlekit resolver buttons.
  body.querySelectorAll('[data-resolve-choose-bk-wid]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wid = btn.dataset.resolveChooseBkWid;
      const disc = WIZARD.battle.discoveries.find(d => d.warbandId === wid);
      if (!disc) return;
      const wb = (typeof loadWarband === 'function') ? loadWarband(wid) : null;
      if (!wb) {
        alert('No se puede abrir el resolver: banda no encontrada.');
        return;
      }
      openChooseBattlekitResolver(disc, wb);
    });
  });

  // Fase 5.2 — wire re-roll buttons (general + win).
  body.querySelectorAll('[data-reroll-kind]').forEach(btn => {
    btn.addEventListener('click', () => {
      const wid = btn.dataset.rerollWid;
      const kind = btn.dataset.rerollKind;
      const ctx = ctxs.find(c => c.warbandId === wid);
      if (!ctx) return;
      applyWizardExplorationReroll(WIZARD, ctx, kind);
      renderWizardStep();
    });
  });
}
function collectWizardExploration() { return true; }

/* Fase 5.1 — Exploration option picker modal launcher.
 *
 * Renders the discovery's options (canon list, possibly with faction
 * restrictions) and stores the player's pick on the discovery record.
 * Options disallowed by the warband's faction are shown but disabled
 * so the player still sees what could have been available.
 */
/* BACKLOG P2/4 — choose-battlekit resolver modal launcher. */
function openChooseBattlekitResolver(disc, wb) {
  if (!disc || !disc.chosenOption || !disc.chosenOption.effect) return;
  const effect = disc.chosenOption.effect;
  if (effect.kind !== 'choose-battlekit') return;
  const keyword = (effect.filter && effect.filter.keyword) || '';
  const items = wb && wb.factionId ? getFactionArmouryByKeyword(wb.factionId, keyword) : [];
  const subtitle = document.getElementById('choose-bk-subtitle');
  if (subtitle) {
    subtitle.textContent = keyword
      ? `Filtra por keyword: ${keyword}. Elige uno para añadirlo al Arsenal de tu banda.`
      : 'Elige un battlekit para añadirlo al Arsenal.';
  }
  const list = document.getElementById('choose-bk-list');
  list.innerHTML = '';
  if (!items.length) {
    list.innerHTML = `<div class="notice info">
      Tu faction no tiene battlekits con la keyword "${keyword}". Este efecto no se puede aplicar.
    </div>`;
  } else {
    const preselected = disc.chosenOption.resolvedKit && disc.chosenOption.resolvedKit.id;
    for (const it of items) {
      const isSelected = preselected === it.id;
      const row = el('div', 'detail-section');
      row.style.cursor = 'pointer';
      row.style.borderLeft = isSelected ? '3px solid var(--gold)' : '';
      row.innerHTML = `
        <div class="detail-label">${it.name}</div>
        <div style="font-size:0.85rem;color:var(--parchment);">
          ${it.cost || 0} ${it.currency || '👑'} · ${it._category || ''}
          ${Array.isArray(it.weaponKeywords) ? `<br><span style="color:var(--parchment-dim);font-size:0.75rem;">${it.weaponKeywords.join(' · ')}</span>` : ''}
        </div>
      `;
      row.addEventListener('click', () => {
        resolveChooseBattlekit(disc, it);
        closeModal('modal-choose-battlekit');
        renderWizardStep();
      });
      list.appendChild(row);
    }
  }
  openModal('modal-choose-battlekit');
}

/* Fase 5.5 — Grant-XP-to-elites resolver modal launcher. */
function openGrantXpEliteResolver(disc, wb) {
  if (!disc || !disc.chosenOption || !disc.chosenOption.effect) return;
  const effect = disc.chosenOption.effect;
  if (effect.kind !== 'grant-xp-to-elites') return;
  const max = effect.maxModels || 1;
  const xp  = effect.xp || 1;
  const elites = getEliteModels(wb);
  const subtitle = document.getElementById('grant-xp-subtitle');
  if (subtitle) {
    subtitle.textContent = `Selecciona hasta ${max} modelo${max === 1 ? '' : 's'} ELITE para recibir +${xp} XP cada uno.`;
  }
  const list = document.getElementById('grant-xp-list');
  list.innerHTML = '';
  if (!elites.length) {
    list.innerHTML = `<div class="notice info">La banda no tiene modelos ELITE. Este efecto no se puede aplicar.</div>`;
  } else {
    const preselected = new Set((disc.chosenOption.resolvedTargets || []));
    for (const m of elites) {
      const u = (typeof getUnit === 'function' && wb.factionId) ? getUnit(wb.factionId, m.unitId) : null;
      const label = m.customName || (u ? u.name : (m.name || m.uid));
      const row = el('label', 'outcome-checkbox');
      row.innerHTML = `
        <input type="checkbox" data-grant-uid="${m.uid}" ${preselected.has(m.uid) ? 'checked' : ''} />
        ${label}
      `;
      list.appendChild(row);
    }
  }
  // Confirm handler: read checked uids (cap respected by helper).
  const confirmBtn = document.getElementById('btn-grant-xp-confirm');
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
  newBtn.addEventListener('click', () => {
    const checked = Array.from(document.querySelectorAll('#grant-xp-list input[data-grant-uid]:checked'))
      .map(inp => inp.dataset.grantUid);
    if (checked.length > max) {
      alert(`Selecciona como máximo ${max} modelo${max === 1 ? '' : 's'}.`);
      return;
    }
    resolveGrantXpToEliteTargets(disc, checked);
    closeModal('modal-grant-xp-elites');
    renderWizardStep();
  });
  openModal('modal-grant-xp-elites');
}

function openExplorationOptionPicker(disc, factionId) {
  if (!disc || !disc.result || !disc.result.entry) return;
  const entry = disc.result.entry;
  const options = Array.isArray(entry.options) ? entry.options : [];

  document.getElementById('explopt-title').textContent =
    (disc.result.kind === 'fork' ? 'Variante: ' : '') + (entry.name || 'Elegir opción');
  document.getElementById('explopt-narrative').textContent = entry.narrative || '';

  const list = document.getElementById('explopt-options');
  list.innerHTML = '';
  for (const opt of options) {
    const allowed = optionIsAllowedFor(opt, factionId);
    const isSelected = disc.chosenOptionId === opt.id;
    const row = el('div', 'detail-section');
    row.style.cursor = allowed ? 'pointer' : 'not-allowed';
    row.style.opacity = allowed ? '1' : '0.45';
    row.style.borderLeft = isSelected ? '3px solid var(--gold)' : '';
    const restrictionNote = (!allowed && opt.restriction && Array.isArray(opt.restriction.factionsAllowed))
      ? `<div style="font-size:0.75rem;color:var(--fallen-blood-bright);margin-top:0.2rem;">
           Restringido a: ${opt.restriction.factionsAllowed.join(', ')}
         </div>` : '';
    row.innerHTML = `
      <div class="detail-label">${opt.label || opt.id}</div>
      <div style="font-size:0.85rem;color:var(--parchment);">${opt.description || ''}</div>
      ${restrictionNote}
    `;
    if (allowed) {
      row.addEventListener('click', () => {
        pickExplorationOption(disc, opt.id);
        closeModal('modal-exploration-option');
        renderWizardStep();
      });
    }
    list.appendChild(row);
  }

  openModal('modal-exploration-option');
}

function renderWizardQuartermaster(body) {
  const isFree = WIZARD.context === 'free';
  const summary = summarizeWizardLoot(WIZARD);

  // Free context: AUTO-credit this battle's income to the strongbox as soon
  // as the player reaches the QM step (idempotent via WIZARD.incomeApplied),
  // so the money is immediately spendable in one step — no extra click. The
  // save path won't re-credit (addFreeBattle skipStrongboxCredit).
  if (isFree && !WIZARD.incomeApplied) {
    creditWizardFreeIncome();
  }

  body.innerHTML = `<h4>Quartermaster</h4>
    <p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment-dim);">
      ${isFree
        ? 'Los ingresos de esta batalla (Looting + Glorious Deeds) ya están en el strongbox de la banda. Ábrelo para gastarlos ahora.'
        : 'Resumen de ingresos por banda. Abre el Quartermaster para gastar; los cambios se reflejan en campaign.finances.'}
    </p>`;
  if (!summary.length) {
    body.innerHTML += `<div class="notice info" style="margin-top:1rem;">
      Sin participantes que recibir ingresos.
    </div>`;
    return;
  }
  for (const row of summary) {
    const wb = (typeof loadWarband === 'function') ? loadWarband(row.warbandId) : null;
    const wbName = wb && wb.name ? wb.name : row.warbandId;
    const bal = wb ? getWarbandBalance(wb, isFree ? null : STATE.currentCampaign) : { ducados:0, glory:0 };
    const card = el('div', 'detail-section');
    let inner = `
      <div class="detail-label">${wbName}</div>
      <div style="font-size:0.85rem;margin-top:0.25rem;">
        Ingresos de esta batalla: <strong style="color:var(--gold);">${row.totalDucats} 👑</strong>
        ${row.gloryEarned ? ` <strong>+ ${row.gloryEarned} ☼</strong>` : ''}
        <span style="color:var(--parchment-dim);"> (Looting ${row.lootDucats} 👑${row.deedGlory ? ` · Deeds ${row.deedGlory} ☼` : ''})</span>
      </div>`;
    if (isFree) {
      inner += `
        <div style="font-size:0.95rem;margin-top:0.4rem;border-top:1px solid var(--parchment-dim);padding-top:0.4rem;">
          Saldo del strongbox: <strong style="color:var(--gold);">${bal.ducados} 👑 · ${bal.glory} ☼</strong>
        </div>
        <div style="margin-top:0.5rem;">
          <button class="btn btn-primary" type="button" data-open-free-qm-wid="${row.warbandId}">🛒 Abrir Quartermaster (gastar)</button>
        </div>
        <div style="margin-top:0.4rem;font-size:0.75rem;color:var(--gold);">
          ⚠ Ingresos ya acreditados. El importe se conserva aunque retrocedas y cambies la Exploración (no se recalcula).
        </div>`;
    } else {
      inner += `<div style="margin-top:0.5rem;">
        <button class="btn" type="button" data-open-qm-wid="${row.warbandId}">🛒 Abrir Quartermaster</button>
        <span style="margin-left:0.5rem;font-size:0.8rem;color:var(--parchment-dim);">
          (el Looting de esta batalla se aplica al guardar)
        </span>
      </div>`;
    }
    card.innerHTML = inner;
    body.appendChild(card);
  }

  if (!isFree) {
    body.querySelectorAll('[data-open-qm-wid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wid = btn.dataset.openQmWid;
        const c = STATE.currentCampaign;
        const wb = loadWarband(wid);
        if (!c || !wb || typeof openQuartermaster !== 'function') return;
        openQuartermaster(c, wb);
      });
    });
  } else {
    body.querySelectorAll('[data-open-free-qm-wid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const wb = loadWarband(btn.dataset.openFreeQmWid);
        if (!wb || typeof openQuartermaster !== 'function') return;
        openQuartermaster(null, wb);  // income already credited on step entry
      });
    });
  }
}

/* Credit the current free battle's income (Looting ducats + glory) to the
 * warband's strongbox, once. Idempotent: sets WIZARD.incomeApplied so the
 * save path skips re-crediting. Returns the credited {ducados, glory}. */
function creditWizardFreeIncome() {
  if (!WIZARD || WIZARD.context !== 'free' || WIZARD.incomeApplied) return { ducados:0, glory:0 };
  const part = (WIZARD.battle.participants || [])[0];
  if (!part || !part.warbandId) return { ducados:0, glory:0 };
  const wb = (typeof loadWarband === 'function') ? loadWarband(part.warbandId) : null;
  if (!wb) return { ducados:0, glory:0 };
  const fb = wizardBattleToFreeBattle(WIZARD, { wb });
  if (!wb.strongbox || typeof wb.strongbox !== 'object') wb.strongbox = { ducados: 0, glory: 0 };
  const d = typeof fb.loot  === 'number' ? fb.loot  : 0;
  const g = typeof fb.glory === 'number' ? fb.glory : 0;
  wb.strongbox.ducados += d;
  wb.strongbox.glory   += g;
  WIZARD.incomeApplied = true;
  WIZARD.creditedIncome = { ducados: d, glory: g, warbandId: wb.id };
  if (typeof persistWarband === 'function') persistWarband(wb);
  return { ducados: d, glory: g };
}

/* Reverse the auto-credited free income — used when the player cancels the
 * wizard after reaching the QM step, so the strongbox doesn't keep money
 * for a battle that was never saved. Purchases made in the meantime stay
 * debited (the player chose to spend), so this only removes the credit. */
function reverseWizardFreeIncome() {
  if (!WIZARD || !WIZARD.incomeApplied || !WIZARD.creditedIncome) return;
  const ci = WIZARD.creditedIncome;
  const wb = (typeof loadWarband === 'function') ? loadWarband(ci.warbandId) : null;
  if (!wb) return;
  if (!wb.strongbox || typeof wb.strongbox !== 'object') wb.strongbox = { ducados: 0, glory: 0 };
  wb.strongbox.ducados -= (ci.ducados || 0);
  wb.strongbox.glory   -= (ci.glory   || 0);
  WIZARD.incomeApplied = false;
  WIZARD.creditedIncome = null;
  if (typeof persistWarband === 'function') persistWarband(wb);
}
function collectWizardQuartermaster() { return true; }

function renderWizardSummary(body) {
  body.innerHTML = `<h4>Resumen</h4>
    <p style="font-family:var(--font-mono);font-size:0.7rem;color:var(--parchment-dim);">
      Revisa lo registrado antes de guardar. En partida libre se aplican los
      cambios a la banda (XP, ascensos, scars, descubrimientos) y se añade
      la batalla a su historial. En campaña la batalla se persiste en la
      campaña activa como hasta ahora.
    </p>`;

  const isFree = WIZARD.context === 'free';
  const loot = summarizeWizardLoot(WIZARD);

  // Per-participant block
  for (const part of WIZARD.battle.participants) {
    const wb = (typeof loadWarband === 'function') ? loadWarband(part.warbandId) : null;
    const wbName = wb && wb.name ? wb.name : part.warbandId;
    const card = el('div', 'detail-section');
    const resultIcon = part.result === 'win' ? '🏆' : part.result === 'draw' ? '⚖' : (part.result === 'loss' ? '💀' : '?');
    const lootRow = loot.find(l => l.warbandId === part.warbandId) || { totalDucats:0, gloryEarned:0 };

    const traumas = (part.modelOutcomes || []).filter(o => o.outOfAction && o.injury);
    const xpRows  = (part.modelOutcomes || [])
      .map(o => {
        const mObj = wb && wb.models ? wb.models.find(x => x.uid === o.modelUid) : null;
        return { uid: o.modelUid, gain: computeModelXPGain(o, mObj, wb) };
      })
      .filter(r => r.gain > 0);
    const advs = [];
    for (const o of (part.modelOutcomes || [])) {
      if (Array.isArray(o.advancementsChosen)) {
        for (const a of o.advancementsChosen) if (a) advs.push({ uid: o.modelUid, adv: a });
      }
    }
    const disc = (WIZARD.battle.discoveries || []).find(d => d.warbandId === part.warbandId);

    let inner = `
      <div class="detail-label">${wbName} ${resultIcon}</div>
      <div style="font-size:0.85rem;color:var(--parchment-dim);">
        Escenario: ${SCENARIOS_CATALOG[WIZARD.battle.scenario] ? SCENARIOS_CATALOG[WIZARD.battle.scenario].name : (WIZARD.battle.scenario || '—')}
      </div>
      <div style="font-size:0.9rem;margin-top:0.4rem;">
        Total a aplicar: <strong style="color:var(--gold);">${lootRow.totalDucats} 👑</strong>
        ${lootRow.gloryEarned ? `<strong> + ${lootRow.gloryEarned} ☼</strong>${lootRow.deedGlory ? ` <span style="color:var(--parchment-dim);font-size:0.78rem;">(${lootRow.baseGlory} base + ${lootRow.deedGlory} deeds)</span>` : ''}` : ''}
      </div>`;

    if (xpRows.length) {
      inner += `<div style="margin-top:0.4rem;font-size:0.85rem;">
        <strong>XP ganado:</strong> ${xpRows.map(r => {
          const m = wb && wb.models.find(x => x.uid === r.uid);
          const nm = m ? (m.customName || m.name || r.uid) : r.uid;
          return `${nm} +${r.gain}`;
        }).join(' · ')}
      </div>`;
    }
    if (advs.length) {
      inner += `<div style="margin-top:0.4rem;font-size:0.85rem;">
        <strong>Ascensos:</strong> ${advs.map(a => {
          const m = wb && wb.models.find(x => x.uid === a.uid);
          const nm = m ? (m.customName || m.name || a.uid) : a.uid;
          return `${nm} → ${a.adv.name}`;
        }).join(' · ')}
      </div>`;
    }
    if (traumas.length) {
      inner += `<div style="margin-top:0.4rem;font-size:0.85rem;">
        <strong>Traumas:</strong> ${traumas.map(t => {
          const m = wb && wb.models.find(x => x.uid === t.modelUid);
          const nm = m ? (m.customName || m.name || t.modelUid) : t.modelUid;
          return `${nm} · ${t.injury.name}`;
        }).join(' · ')}
      </div>`;
    }
    if (disc) {
      const dr = disc.result;
      const name = dr.entry ? dr.entry.name : '(sin entrada)';
      const label = dr.kind === 'pillaged' ? 'Saqueado' : (dr.kind === 'fork' ? 'Variante' : 'Descubrimiento');
      inner += `<div style="margin-top:0.4rem;font-size:0.85rem;">
        <strong>${label}:</strong> ${name} · ${dr.lootDucats} 👑 (dados ${disc.rollTotal})
      </div>`;
    }
    card.innerHTML = inner;
    body.appendChild(card);
  }

  // Save button hint per context (the actual save fires when the user
  // hits the wizard's main "Guardar batalla" button in the footer).
  body.innerHTML += `<div style="margin-top:1rem;font-size:0.85rem;color:var(--parchment-dim);">
    Pulsa <strong>Guardar batalla</strong> en el pie del wizard para confirmar.
    ${isFree ? 'Los cambios se aplican a la banda y la batalla se añade a su historial.'
             : 'La batalla se añade a la campaña activa y refresca todos los warband states.'}
  </div>`;
}
function collectWizardSummary() { return true; }

/* Fase 4.7 — save path for free-battle context.
 *
 * Mirrors saveBattleFromWizard's role but routes through the
 * warband-owned persistence (addFreeBattle → persistWarband) instead
 * of campaign storage. Side effects: applies XP/advancements/scars
 * to baseProgression and merges discoveredLocations.
 */
function saveFreeBattleFromWizard() {
  if (!WIZARD || WIZARD.context !== 'free') return;
  const part = WIZARD.battle.participants[0];
  if (!part || !part.warbandId) return;
  const wb = (typeof loadWarband === 'function') ? loadWarband(part.warbandId) : null;
  if (!wb) {
    alert('No se puede guardar: banda no encontrada (' + part.warbandId + ').');
    return;
  }
  const fb = wizardBattleToFreeBattle(WIZARD, { wb });
  applyWizardOutcomesToWarband(wb, WIZARD, fb);
  // If the QM step already credited this battle's income to the strongbox
  // (so the player could spend it during the wizard), don't credit again.
  addFreeBattle(wb, fb, { skipStrongboxCredit: !!WIZARD.incomeApplied });
  clearLiveFreeBattle();
  closeWizard();
  if (typeof renderAll === 'function') renderAll();
  // Fase 6.5 — non-blocking post-battle toast.
  showToast(postBattleToastSummary(wb, fb.loot || 0));
}

/* ----- Wizard nav handlers ----- */
document.getElementById('wizard-prev').addEventListener('click', () => {
  if (!WIZARD) return;
  if (WIZARD.step <= 0) return;
  // Warn once when stepping back after the income was already credited at
  // the QM step: the strongbox keeps that amount — it is NOT recomputed if
  // the Exploration result changes.
  const curId = WIZARD.steps[WIZARD.step] && WIZARD.steps[WIZARD.step].id;
  if (WIZARD.incomeApplied && !WIZARD._incomeBackWarned &&
      (curId === 'quartermaster' || curId === 'resumen')) {
    WIZARD._incomeBackWarned = true;
    if (!confirm('Ya cobraste los ingresos de esta batalla al strongbox. Si retrocedes y cambias la Exploración, el importe ya acreditado SE CONSERVA (no se recalcula). ¿Retroceder igualmente?')) {
      WIZARD._incomeBackWarned = false;
      return;
    }
  }
  WIZARD.step--;
  WIZARD.modelSlideIdx = 0;  // reset slide pagination
  renderWizardStep();
});
document.getElementById('wizard-cancel').addEventListener('click', () => {
  if (!WIZARD) return;
  const creditedNote = WIZARD.incomeApplied
    ? ' Los ingresos ya cobrados al strongbox se revertirán (las compras hechas se mantienen).'
    : '';
  confirmModal({
    title: 'Cancelar registro',
    message: 'Se perderán los datos introducidos en este registro de batalla.' + creditedNote + ' ¿Continuar?',
    confirmText: 'Cancelar batalla',
    onConfirm: () => { reverseWizardFreeIncome(); closeWizard(); },
  });
});
// Fase 4.1 — Skip button: advance the wizard without invoking the
// current step's collect handler. Visibility is driven from renderWizardStep.
document.getElementById('wizard-skip').addEventListener('click', () => {
  if (!WIZARD) return;
  skipWizardStep();
});
document.getElementById('wizard-next').addEventListener('click', () => {
  if (!WIZARD) return;
  // Validate/collect current step by step id (Fase 4.2).
  let ok = false;
  const stepObj = WIZARD.steps[WIZARD.step];
  if (!stepObj) return;
  switch (stepObj.id) {
    case 'setup':         ok = collectWizardSetup(); break;
    case 'modelos':       ok = collectWizardModels(); break;
    case 'trauma':        ok = collectWizardInjuries(); break;
    case 'promotions-xp': ok = collectWizardAdvancements(); break;
    case 'exploration':   ok = collectWizardExploration(); break;
    case 'quartermaster': ok = collectWizardQuartermaster(); break;
    case 'resumen':       ok = collectWizardSummary(); break;
  }
  if (!ok) return;
  if (WIZARD.step === WIZARD.steps.length - 1) {
    // Save path branches on context (Fase 4.7). Free routes to a
    // warband-scoped persistence; campaign keeps its campaign-scoped path.
    if (WIZARD.context === 'free') {
      saveFreeBattleFromWizard();
    } else {
      saveBattleFromWizard();
    }
  } else {
    WIZARD.step++;
    WIZARD.modelSlideIdx = 0;  // reset slide pagination
    renderWizardStep();
  }
});


