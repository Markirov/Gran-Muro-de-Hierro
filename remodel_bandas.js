const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');

// Modificaciones a index.html para la remodelación de bandas

// 1. Ocultar #panel-catalogue (el sidebar izquierdo) y crear las nuevas vistas de Lista y Creación.
const newBandaViews = `
  <!-- GESTOR DE BANDAS: LISTA FULLSCREEN -->
  <section class="panel" id="view-bandas-list" style="display:none; grid-column: 1 / -1; padding: 2rem;">
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 2rem; max-width:1000px; margin-left:auto; margin-right:auto;">
      <h2>Tus Bandas</h2>
      <button class="btn btn-primary" id="btn-bandas-list-create" style="font-size:1.2rem; padding: 0.8rem 1.5rem;">+ Crear Banda</button>
    </div>
    <div id="bandas-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; max-width:1000px; margin-left:auto; margin-right:auto;">
      <!-- Tarjetas inyectadas por JS -->
    </div>
  </section>

  <!-- GESTOR DE BANDAS: CREACIÓN -->
  <section class="panel" id="view-banda-create" style="display:none; grid-column: 1 / -1; padding: 2rem;">
    <div style="max-width:800px; margin:0 auto;">
      <button class="btn" id="btn-banda-create-back" style="margin-bottom: 1.5rem;">← Volver a Mis Bandas</button>
      <h2 style="margin-bottom: 2rem;">Nueva Banda</h2>
      
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
        <!-- Vía Companion -->
        <div class="panel" style="padding: 1.5rem; border: 1px solid var(--rust); background: rgba(0,0,0,0.2);">
          <h3 style="color:var(--gold); margin-bottom:1rem;">⤓ Importar de Companion</h3>
          <p style="font-size:0.85rem; color:var(--parchment-dim); margin-bottom:1rem;">Pega el JSON exportado desde Trench Companion.</p>
          <textarea id="create-companion-textarea" placeholder='{"warband-name":"Mi Banda",...}' style="width:100%; height:120px; font-family:var(--font-mono); font-size:0.75rem; background:var(--ink-black); color:var(--parchment); border:1px solid var(--rust); padding:0.5rem; margin-bottom:1rem;"></textarea>
          <button class="btn btn-primary" id="btn-create-companion-import" style="width:100%;">Importar Banda</button>
          <div id="create-companion-feedback" style="margin-top:0.75rem;font-size:0.85rem;min-height:1.2em;"></div>
        </div>

        <!-- Vía Manual -->
        <div class="panel" style="padding: 1.5rem; border: 1px solid var(--rust); background: rgba(0,0,0,0.2);">
          <h3 style="color:var(--gold); margin-bottom:1rem;">✠ Forja Manual</h3>
          <p style="font-size:0.85rem; color:var(--parchment-dim); margin-bottom:1rem;">Crea una banda desde cero usando el catálogo local.</p>
          <button class="btn btn-primary" id="btn-create-manual" style="width:100%; margin-bottom:1rem;">Abrir Catálogo de Facciones</button>
        </div>
      </div>
    </div>
  </section>
`;

if (!html.includes('id="view-bandas-list"')) {
  html = html.replace('<main>', '<main>\n' + newBandaViews);
}

// 2. JS: Banda View Router
const bandaRouterJS = `
let currentBandaView = 'list'; // 'list', 'create', 'roster'

function setBandaView(view) {
  currentBandaView = view;
  
  const listEl = document.getElementById('view-bandas-list');
  const createEl = document.getElementById('view-banda-create');
  
  const catEl = document.getElementById('panel-catalogue');
  const rosterEl = document.getElementById('panel-roster');
  const detailEl = document.getElementById('panel-detail');
  const subtabs = document.getElementById('banda-subtabs');
  const actBanda = document.getElementById('actions-banda');

  // Hide everything first in Banda mode
  if (listEl) listEl.style.display = 'none';
  if (createEl) createEl.style.display = 'none';
  if (catEl) catEl.style.display = 'none'; // We hide the old left sidebar mostly, except when manually creating
  if (rosterEl) rosterEl.style.display = 'none';
  if (detailEl) detailEl.style.display = 'none';
  if (subtabs) subtabs.style.display = 'none';
  if (actBanda) actBanda.style.display = 'none';

  if (STATE.mode !== 'banda') return;

  if (view === 'list') {
    if (listEl) listEl.style.display = '';
    renderBandaGrid();
  } else if (view === 'create') {
    if (createEl) createEl.style.display = '';
  } else if (view === 'roster') {
    if (rosterEl) rosterEl.style.display = '';
    if (detailEl) detailEl.style.display = '';
    if (subtabs) subtabs.style.display = '';
    if (actBanda) actBanda.style.display = '';
    // Make roster wider if left sidebar is hidden
    if (rosterEl) rosterEl.style.gridColumn = '1 / 3'; // Example width adjust
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
    html += \`
      <div class="panel" style="border:1px solid var(--rust); padding: 1.5rem; cursor: pointer; transition: all 0.2s;" onclick="loadBandaFromGrid('\${wb.id}')" onmouseover="this.style.background='rgba(184,134,60,0.1)'" onmouseout="this.style.background='transparent'">
        <h3 style="color:var(--gold); margin-bottom: 0.5rem; font-size: 1.3rem;">\${escapeHtml(wb.name || 'Sin nombre')}</h3>
        <p style="font-family:var(--font-mono); font-size:0.8rem; color:var(--parchment-dim); margin-bottom:0.3rem;">\${faction}</p>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-top: 1rem; border-top: 1px solid rgba(127,107,67,0.3); padding-top: 0.8rem;">
          <span style="font-weight:bold; color:var(--rust); font-size:1.1rem;">\${wb.cost || 0} 👑</span>
          <span style="font-size:0.85rem;">\${wb.modelsCount || 0} miniatura\${wb.modelsCount !== 1 ? 's' : ''}</span>
        </div>
      </div>
    \`;
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
    const cat = document.getElementById('panel-catalogue');
    if (cat) cat.style.display = '';
    const oldMenu = document.getElementById('panel-faction-catalogue');
    if (oldMenu) oldMenu.style.display = '';
    const oldBands = document.getElementById('panel-bands-list');
    if (oldBands) oldBands.style.display = 'none';
    
    // Hide create panel
    const createEl = document.getElementById('view-banda-create');
    if (createEl) createEl.style.display = 'none';
  });
});
`;

if (!html.includes('currentBandaView')) {
  // Inject bandaRouterJS near setMode
  html = html.replace('function setMode(mode) {', bandaRouterJS + '\nfunction setMode(mode) {');
  
  // Hook setMode to handle banda modes
  html = html.replace(/if \(mode === 'banda'\) \{[\s\S]*?if \(varPanel\)/, `if (mode === 'banda') {
    setBandaView(STATE.warband ? 'roster' : 'list');
  } else if (varPanel)`);
}

// 3. Modificamos #actions-banda (el header de Roster) para tener el botón "Volver a Mis Bandas"
const backToBandsBtn = `
    <!-- Botón volver (Inyectado para nueva UI) -->
    <button class="btn" id="btn-back-to-bandas-list" data-action-priority="primary" style="margin-right:1rem;" title="Cerrar roster y volver a la galería">← Volver a Mis Bandas</button>
`;
if (!html.includes('btn-back-to-bandas-list')) {
  html = html.replace('id="actions-banda">', 'id="actions-banda">' + backToBandsBtn);
  html = html.replace("document.addEventListener('DOMContentLoaded', () => {", "document.addEventListener('DOMContentLoaded', () => {\n  const btnBackB = document.getElementById('btn-back-to-bandas-list');\n  if (btnBackB) btnBackB.addEventListener('click', () => setBandaView('list'));");
}

fs.writeFileSync(indexFile, html, 'utf8');
console.log('Bandas view remodeled');
