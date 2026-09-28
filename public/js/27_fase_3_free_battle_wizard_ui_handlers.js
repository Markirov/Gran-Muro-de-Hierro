/* ======================================================================
   FASE 3 — FREE BATTLE WIZARD (UI handlers)

   Populates the modal with the catalog of scenarios, applies sensible
   defaults, and on confirm produces a LIVE_FREE_BATTLE held in memory.
   Persistence to wb.freeBattles happens later when the player closes
   out the post-battle wizard (Fase 4).
   ====================================================================== */

function openFreeBattleWizard(wb) {
  if (!wb) return;
  // Populate the scenario selector from the canonical catalog. Order
  // mirrors the object key order (which is the deliberate canon order).
  const scenarioSel = document.getElementById('fbw-scenario');
  if (scenarioSel) {
    scenarioSel.innerHTML = '';
    for (const key of Object.keys(SCENARIOS_CATALOG)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = SCENARIOS_CATALOG[key].name;
      scenarioSel.appendChild(opt);
    }
  }
  // Reset name + opponent each time the wizard opens (no carry-over from
  // previous battles — surprising behaviour to inherit a stale opponent).
  const nameEl = document.getElementById('fbw-name');
  if (nameEl) {
    nameEl.value = '';
    const d = new Date();
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    nameEl.placeholder = 'Libre · ' + d.getDate() + ' ' + months[d.getMonth()] + ' · vs ...';
  }
  const oppEl = document.getElementById('fbw-opponent');
  if (oppEl) oppEl.value = '';
  const diceEl = document.getElementById('fbw-dice');
  if (diceEl) diceEl.value = '3';
  const diceVal = document.getElementById('fbw-dice-value');
  if (diceVal) diceVal.textContent = '3';

  openModal('modal-free-battle-wizard');
}

function confirmFreeBattleWizard() {
  const wb = STATE.currentWarband;
  if (!wb) return;
  const name = (document.getElementById('fbw-name')?.value || '').trim();
  const opponent = (document.getElementById('fbw-opponent')?.value || '').trim();
  const scenarioId = document.getElementById('fbw-scenario')?.value || '';
  const dicePicked = parseInt(document.getElementById('fbw-dice')?.value || '3', 10);
  if (!scenarioId || !SCENARIOS_CATALOG[scenarioId]) {
    alert('Selecciona un escenario válido.');
    return;
  }
  // Per spec: confirm before starting so the wizard never auto-launches.
  const scenarioName = SCENARIOS_CATALOG[scenarioId].name;
  const oppLine = opponent ? ` · vs ${opponent}` : '';
  confirmModal({
    title: '¿Empezar partida libre?',
    message: `${wb.name}${oppLine} · ${scenarioName} · ${dicePicked} dado${dicePicked === 1 ? '' : 's'} de Exploration.`,
    confirmText: 'Empezar',
    onConfirm: () => {
      const lfb = startLiveFreeBattle(wb, { name, opponent, scenarioId, dicePicked });
      setLiveFreeBattle(lfb);
      closeModal('modal-free-battle-wizard');
      // Visual confirmation. Replaced by the post-battle wizard in Fase 4.
      alert(`Partida libre en curso: ${lfb.name}\nEscenario: ${scenarioName}\nDados de Exploration: ${lfb.dicePicked}`);
    },
  });
}

// Wire wizard-internal controls. Lives outside bindBudgetInputs because
// these are page-scoped widgets unrelated to budget state.
(function bindFreeBattleWizardControls() {
  const fbwConfirm = document.getElementById('btn-fbw-confirm');
  if (fbwConfirm && !fbwConfirm.dataset.bound) {
    fbwConfirm.dataset.bound = '1';
    fbwConfirm.addEventListener('click', confirmFreeBattleWizard);
  }
  const fbwDice = document.getElementById('fbw-dice');
  const fbwDiceVal = document.getElementById('fbw-dice-value');
  if (fbwDice && fbwDiceVal && !fbwDice.dataset.bound) {
    fbwDice.dataset.bound = '1';
    fbwDice.addEventListener('input', () => {
      fbwDiceVal.textContent = fbwDice.value;
    });
  }
})();


