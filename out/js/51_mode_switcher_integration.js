/* ======================================================================
   MODE SWITCHER + INTEGRATION
   ====================================================================== */


let currentBandaView = 'list'; // 'list', 'create', 'roster'

function setBandaView(view) {
  currentBandaView = view;
  
  // Set body classes for robust CSS targeting
  document.body.classList.remove('banda-view-list', 'banda-view-create', 'banda-view-roster');
  document.body.classList.add('banda-view-' + view);

  if (STATE.mode !== 'banda') return;

  if (view === 'list') {
    renderBandaGrid();
  } else if (view === 'roster') {
    // If the faction catalogue was previously closed, we ensure the UI is clean
  }
}

function renderBandaGrid() {
  const grid = document.getElementById('bandas-grid');
  if (!grid) return;
  const list = getSavedWarbandsInfo();
  if (list.length === 0) {
    grid.innerHTML = '<p style="color:var(--parchment-dim);">No tienes bandas. ¡Crea una nueva!</p>';
    return;
  }
  
  let html = '';
  for (const wb of list) {
    const faction = DATA.factions[wb.factionId] ? DATA.factions[wb.factionId].name : wb.factionId;
    html += `
      <div class="panel" style="border:1px solid var(--rust); padding: 1.5rem; cursor: pointer; transition: all 0.2s;" onclick="loadBandaFromGrid('${wb.id}')" onmouseover="this.style.background='rgba(184,134,60,0.1)'" onmouseout="this.style.background='transparent'">
        <h3 style="color:var(--gold); margin-bottom: 0.5rem; font-size: 1.3rem;">${escapeHtml(wb.name || 'Sin nombre')}</h3>
        <p style="font-family:var(--font-mono); font-size:0.8rem; color:var(--parchment-dim); margin-bottom:0.3rem;">${faction}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 1rem; border-top: 1px solid rgba(127,107,67,0.3); padding-top: 0.8rem;">
          <span style="font-weight:bold; color:var(--rust); font-size:1.1rem;">${wb.cost || 0} 👑</span>
          <span style="font-size:0.85rem;">${wb.modelsCount || 0} miniatura${wb.modelsCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    `;
  }
  grid.innerHTML = html;
}

function loadBandaFromGrid(id) {
  const wb = loadWarband(id);
  if (wb) {
    STATE.warband = wb;
    STATE.warbandId = id;
    try { localStorage.setItem(STATE_KEY + '_warbandId', id); } catch(e){}
    setBandaView('roster');
    renderAll();
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  const btnBackB = document.getElementById('btn-back-to-bandas-list');
  if (btnBackB) btnBackB.addEventListener('click', () => setBandaView('list'));
  const btnCreate = document.getElementById('btn-bandas-list-create');
  if (btnCreate) btnCreate.addEventListener('click', () => setBandaView('create'));

  const btnBack = document.getElementById('btn-banda-create-back');
  if (btnBack) btnBack.addEventListener('click', () => setBandaView('list'));

  const btnCreateCompanion = document.getElementById('btn-create-companion-import');
  if (btnCreateCompanion) btnCreateCompanion.addEventListener('click', () => {
    const txt = document.getElementById('create-companion-textarea').value;
    const fb = document.getElementById('create-companion-feedback');
    if (!txt) { fb.innerText = 'Pega el JSON primero.'; fb.style.color = 'red'; return; }
    try {
      const companionData = JSON.parse(txt);
      const forgeData = convertCompanionToForge(companionData);
      forgeData.id = generateId('wb');
      persistWarband(forgeData);
      loadBandaFromGrid(forgeData.id);
      fb.innerText = '¡Banda importada!'; fb.style.color = 'var(--faithful-gold)';
    } catch(e) {
      fb.innerText = 'Error al leer el JSON.'; fb.style.color = 'red';
    }
  });

  const btnCreateManual = document.getElementById('btn-create-manual');
  if (btnCreateManual) btnCreateManual.addEventListener('click', () => {
    // We create a blank manual warband and jump to roster
    STATE.warband = {
      id: generateId('wb'),
      name: 'Nueva Banda',
      factionId: '',
      cost: 0,
      modelsCount: 0,
      models: []
    };
    STATE.warbandId = STATE.warband.id;
    try { localStorage.setItem(STATE_KEY + '_warbandId', STATE.warbandId); } catch(e){}
    setBandaView('roster');
    renderAll();
  });
});

function setMode(mode) {
  STATE.mode = mode;
  try { localStorage.setItem(STATE_KEY + '_mode', mode); } catch (e) {}
  
  document.body.setAttribute('data-mode', mode);
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  ['banda','campana','lab','battle','home'].forEach(m => {
    document.body.classList.toggle('mode-' + m, m === mode);
  });

  // Headers actions
  const aBanda = document.getElementById('actions-banda');
  if (aBanda) aBanda.style.display = mode === 'banda' ? '' : 'none';
  const aCamp = document.getElementById('actions-campana');
  if (aCamp) aCamp.style.display = mode === 'campana' ? '' : 'none';
  const aLab = document.getElementById('actions-lab');
  if (aLab) aLab.style.display = mode === 'lab' ? '' : 'none';
  const aBattle = document.getElementById('actions-battle');
  if (aBattle) aBattle.style.display = mode === 'battle' ? '' : 'none';

  // We no longer rely on JS style.display manipulation for the panels.
  // The CSS 'ROBUST UI CSS OVERRIDES' handles all visibility safely.
  
  if (mode === 'banda') {
    setBandaView(STATE.warband ? 'roster' : 'list');
  } else if (mode === 'lab') {
    if (typeof renderLab === 'function') renderLab();
  } else if (mode === 'battle') {
    if (typeof renderBattle === 'function') renderBattle();
  }

  // Mobile tabs
  document.querySelectorAll('.mobile-tabs').forEach(t => t.style.display = '');
  // Update the mobile-tabs labels to reflect what each panel actually shows
  // in the current mode (since panels are reused across modes).
  const tabBtns = document.querySelectorAll('.mobile-tabs button');
  if (tabBtns.length === 3) {
    if (mode === 'campana') {
      tabBtns[0].textContent = 'Campañas';
      tabBtns[1].textContent = 'Centro';
      tabBtns[2].textContent = 'Detalle';
    } else if (mode === 'lab') {
      tabBtns[0].textContent = 'Banda';
      tabBtns[1].textContent = 'Lab';
      tabBtns[2].textContent = 'Resultados';
    } else if (mode === 'battle') {
      tabBtns[0].textContent = 'Banda';
      tabBtns[1].textContent = 'Partida';
      tabBtns[2].textContent = 'Detalle';
    } else {
      tabBtns[0].textContent = 'Facción';
      tabBtns[1].textContent = 'Banda';
      tabBtns[2].textContent = 'Detalle';
    }
  }
  renderAll();
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

/* ----- Header drawer (mobile hamburger menu) -----
 * Builds the drawer body with a clone of the secondary buttons from the
 * active mode's actions row. Clicking a drawer button delegates the click
 * back to the original (which still has all its handlers attached), then
 * closes the drawer.
 */
function openHeaderDrawer() {
  const drawer = document.getElementById('header-drawer');
  const backdrop = document.getElementById('header-drawer-backdrop');
  const body = document.getElementById('header-drawer-body');
  if (!drawer || !body) return;
  // Determine active mode
  const mode = STATE.mode || 'home';
  const sourceId = mode === 'campana' ? 'actions-campana' : 'actions-banda';
  const source = document.getElementById(sourceId);
  if (!source) return;
  // Build drawer items: include EVERY button from the source actions row,
  // not just the secondary ones. Primary buttons in the drawer give a
  // friendlier alternative to the squeezed top bar.
  // Limpieza top-bar: agrupar secundarios por data-action-group con un
  // header descriptivo por sección (Companion, PDF/Imprimir, etc.). Los
  // primarios y los sin grupo van primero (top-level).
  body.innerHTML = '';
  const GROUP_LABELS = {
    'companion-tc': 'Companion (Trench Companion)',
    'banda':        'Banda local (offline)',
    'forge-json':   'JSON Forge (backup local)',
    'impresion':    'Imprimir y PDF',
  };
  function _appendDrawerButton(srcBtn) {
    const clone = document.createElement('button');
    clone.className = srcBtn.className;
    clone.textContent = srcBtn.textContent;
    clone.disabled = srcBtn.disabled;
    const title = srcBtn.getAttribute('title');
    if (title) clone.setAttribute('title', title);
    clone.addEventListener('click', () => {
      closeHeaderDrawer();
      srcBtn.click();  // Delegate to original so handlers fire.
    });
    body.appendChild(clone);
  }
  function _appendDrawerHeader(label) {
    const h = document.createElement('div');
    h.className = 'header-drawer-section';
    h.textContent = label;
    body.appendChild(h);
  }
  const allBtns = Array.from(source.querySelectorAll('button.btn')).filter(b => {
    if (b.classList.contains('header-menu-toggle')) return false;
    if (b.style && b.style.display === 'none') return false;
    return true;
  });
  // Sección 1: primarios + sin grupo (los pintamos en el orden DOM).
  const topLevel = allBtns.filter(b => !b.getAttribute('data-action-group'));
  for (const b of topLevel) _appendDrawerButton(b);
  // Secciones por grupo, en el orden de GROUP_LABELS (orden semántico
  // por flujo del usuario: TC primero, luego local/forge/imprimir).
  for (const gid of Object.keys(GROUP_LABELS)) {
    const groupBtns = allBtns.filter(b => b.getAttribute('data-action-group') === gid);
    if (!groupBtns.length) continue;
    _appendDrawerHeader(GROUP_LABELS[gid]);
    for (const b of groupBtns) _appendDrawerButton(b);
  }
  // Grupos no listados en GROUP_LABELS (futuros): los pintamos al final.
  const knownGroups = new Set(Object.keys(GROUP_LABELS));
  const extras = allBtns.filter(b => {
    const g = b.getAttribute('data-action-group');
    return g && !knownGroups.has(g);
  });
  if (extras.length) {
    _appendDrawerHeader('Otros');
    for (const b of extras) _appendDrawerButton(b);
  }
  drawer.classList.add('open');
  backdrop.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeHeaderDrawer() {
  const drawer = document.getElementById('header-drawer');
  const backdrop = document.getElementById('header-drawer-backdrop');
  if (!drawer) return;
  drawer.classList.remove('open');
  if (backdrop) backdrop.classList.remove('open');
  document.body.style.overflow = '';
}

// Wire up triggers (only relevant on mobile but harmless on desktop)
document.querySelectorAll('.header-menu-toggle').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    openHeaderDrawer();
  });
});
const _drawerCloseBtn = document.getElementById('header-drawer-close');
if (_drawerCloseBtn) _drawerCloseBtn.addEventListener('click', closeHeaderDrawer);
const _drawerBackdrop = document.getElementById('header-drawer-backdrop');
if (_drawerBackdrop) _drawerBackdrop.addEventListener('click', closeHeaderDrawer);
// Esc key closes the drawer
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const drawer = document.getElementById('header-drawer');
    if (drawer && drawer.classList.contains('open')) closeHeaderDrawer();
  }
});

// Override renderAll to dispatch by mode
const _origRenderAll = renderAll;
renderAll = function() {
  if (STATE.mode === 'campana') {
    // Reset panels' inner content to defaults so campaign render owns them
    renderCampaignMode();
    applyFactionTheme();
  } else {
    // Restore banda mode markup if previously overwritten
    restoreBandaPanels();
    _origRenderAll();
  }
};

// When switching back to banda mode the panels need their original IDs and structure
function restoreBandaPanels() {
  const left = document.getElementById('panel-catalogue');
  // If previously rendered for campana, our inner HTML diverges. Just restore once.
  if (!document.getElementById('faction-select')) {
    left.innerHTML = `
      <h2 class="panel-title">Facción</h2>
      <p class="panel-subtitle">Elige tu bando en la Gran Guerra</p>
      <div class="faction-select" id="faction-select"></div>
      <div class="variant-select" id="variant-select" style="display:none;">
        <label>Variante de Banda</label>
        <select class="variant-dropdown" id="variant-dropdown"></select>
      </div>
      <h2 class="panel-title" style="margin-top:1.5rem;">Unidades</h2>
      <p class="panel-subtitle">Tap para reclutar</p>
      <div id="unit-catalogue"></div>
    `;
  }
  const center = document.getElementById('panel-roster');
  if (!document.getElementById('warband-name')) {
    center.innerHTML = `
      <div class="roster-header">
        <div style="flex:1;">
          <input type="text" class="warband-name-input" id="warband-name" placeholder="Nombra a tu banda…" />
          <div class="warband-meta" id="warband-meta-line">— · — · 0 modelos</div>
        </div>
        <div class="budget-display" id="budget-display-block">
          <div class="budget-label">Presupuesto inicial</div>
          <div class="budget-edit-row">
            <input type="number" min="0" max="9999" id="budget-input" class="budget-input" value="700" />
            <span class="budget-unit">👑</span>
            <input type="number" min="0" max="999" id="glory-input" class="budget-input" value="0" />
            <span class="budget-unit">☼</span>
          </div>
          <div class="budget-value" id="budget-value">700 / 700</div>
          <div class="budget-bar"><div class="budget-fill" id="budget-fill" style="width:0%;"></div></div>
          <div class="budget-detail" id="budget-detail">Restantes: 700 👑</div>
          <div class="budget-detail" id="glory-detail" style="display:none;"></div>
        </div>
      </div>
      <div id="roster-content"></div>
    `;
    // Re-bind warband name input
    document.getElementById('warband-name').addEventListener('input', (e) => {
      if (STATE.currentWarband) {
        STATE.currentWarband.name = e.target.value;
        persistWarband(STATE.currentWarband);
      }
    });
    bindBudgetInputs();
  }
  const right = document.getElementById('panel-detail');
  if (!document.getElementById('detail-content')) {
    right.innerHTML = `
      <h2 class="panel-title">Detalle</h2>
      <p class="panel-subtitle">Selecciona un modelo</p>
      <div id="detail-content"></div>
    `;
  }
}


