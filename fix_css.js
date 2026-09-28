const fs = require('fs');
const path = require('path');
const indexFile = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');

// 1. Insert Robust CSS at the top
const robustCSS = `
/* =======================================
 * ROBUST UI CSS OVERRIDES
 * ======================================= */
/* HOME MODE */
body.mode-home main > .panel { display: none !important; }
body.mode-home #panel-home { display: flex !important; }
body.mode-home .mode-switcher .mode-btn { display: none !important; }
body.mode-home .header-actions { display: none !important; }
body.mode-home .campaign-breadcrumb { display: none !important; }
body.mode-home .banda-subtabs { display: none !important; }
body.mode-home .faction-sidebar-toggle { display: none !important; }

/* ALL OTHER MODES: hide home */
body:not(.mode-home) #panel-home { display: none !important; }

/* BANDA MODE: hide lab, battle, etc. */
body.mode-banda #panel-lab,
body.mode-banda #panel-battle { display: none !important; }

/* BANDA VIEW: LIST */
body.mode-banda.banda-view-list #view-bandas-list { display: block !important; }
body.mode-banda.banda-view-list main > .panel:not(#view-bandas-list) { display: none !important; }
body.mode-banda.banda-view-list .banda-subtabs { display: none !important; }
body.mode-banda.banda-view-list .faction-sidebar-toggle { display: none !important; }

/* BANDA VIEW: CREATE */
body.mode-banda.banda-view-create #view-banda-create { display: block !important; }
body.mode-banda.banda-view-create main > .panel:not(#view-banda-create) { display: none !important; }
body.mode-banda.banda-view-create .banda-subtabs { display: none !important; }
body.mode-banda.banda-view-create .faction-sidebar-toggle { display: none !important; }

/* BANDA VIEW: ROSTER */
body.mode-banda.banda-view-roster #view-bandas-list,
body.mode-banda.banda-view-roster #view-banda-create { display: none !important; }
body.mode-banda.banda-view-roster #panel-catalogue { display: block !important; }
body.mode-banda.banda-view-roster #panel-bands-list { display: none !important; }
body.mode-banda.banda-view-roster #panel-faction-catalogue { display: block !important; }

/* Fix Roster layout so it doesn't span full width over the catalogue */
body.mode-banda.banda-view-roster #panel-roster {
  grid-column: auto !important; 
}

/* LAB, BATTLE, CAMPANA modes shouldn't show the new list/create panels */
body.mode-lab #view-bandas-list, body.mode-lab #view-banda-create,
body.mode-battle #view-bandas-list, body.mode-battle #view-banda-create,
body.mode-campana #view-bandas-list, body.mode-campana #view-banda-create {
  display: none !important;
}
/* ======================================= */
`;

if (!html.includes('ROBUST UI CSS OVERRIDES')) {
  html = html.replace('/* CSS para la nueva Home */', robustCSS + '\n/* CSS para la nueva Home */');
}

// 2. Update setBandaView to manage body classes
const oldSetBandaViewRegex = /function setBandaView\(view\) \{[\s\S]*?if \(!grid\) return;/;
const newSetBandaView = `function setBandaView(view) {
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
  if (!grid) return;`;

if (html.match(oldSetBandaViewRegex)) {
  html = html.replace(oldSetBandaViewRegex, newSetBandaView);
}

// Ensure the code cleans up old style.display assignments in setMode
const oldSetModeRegex = /function setMode\(mode\) \{[\s\S]*?\/\/ Mobile tabs/m;
const cleanSetMode = `function setMode(mode) {
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

  // Mobile tabs`;

if (html.match(oldSetModeRegex)) {
  html = html.replace(oldSetModeRegex, cleanSetMode);
}

// Remove any inline style="display:none;" in the new panels so CSS takes full control
html = html.replace(/id="view-bandas-list"\s+style="display:none;\s+/g, 'id="view-bandas-list" style="');
html = html.replace(/id="view-banda-create"\s+style="display:none;\s+/g, 'id="view-banda-create" style="');
html = html.replace(/id="panel-home"\s+style="display:none;\s+/g, 'id="panel-home" style="');

// Wait, the panel-home was originally styled as style="display:flex;" or similar in scratch_home?
// Let's just strip inline display entirely from them if they are there.
html = html.replace(/id="panel-home" style="display:none;"/g, 'id="panel-home"');
html = html.replace(/id="panel-home" style="display:none;/g, 'id="panel-home" style="');

// Fix button: `btn-create-manual` shouldn't do direct JS DOM display manipulations now.
// It should just call setBandaView('roster'); and we probably need to clear STATE.warband to make a blank roster?
// Wait, to create a manual band, you need a blank warband, then go to roster.
// Let's replace btn-create-manual event listener.
const manualCreateRegex = /const btnCreateManual = document\.getElementById\('btn-create-manual'\);[\s\S]*?\}\);/m;
const manualCreateFix = `const btnCreateManual = document.getElementById('btn-create-manual');
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
  });`;

if (html.match(manualCreateRegex)) {
  html = html.replace(manualCreateRegex, manualCreateFix);
}

fs.writeFileSync(indexFile, html, 'utf8');
console.log('Robust UI CSS and JS applied');
