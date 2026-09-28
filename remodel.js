const fs = require('fs');
const path = require('path');

const indexFile = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');

// 1. Insert CSS for home
const cssToInsert = `
/* CSS para la nueva Home */
#panel-home {
  grid-column: 1 / -1; /* spans full width in the grid */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
  padding: 2rem;
}
.home-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  max-width: 800px;
  width: 100%;
}
.home-btn {
  background: var(--rust-dark);
  border: 1px solid var(--rust);
  border-radius: 4px;
  padding: 3rem 1rem;
  color: var(--gold);
  font-family: var(--font-display);
  font-size: 1.8rem;
  text-transform: uppercase;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}
.home-btn:hover {
  background: var(--rust);
  color: var(--parchment);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.5);
}
.home-btn-icon {
  font-size: 3.5rem;
  opacity: 0.8;
}
.home-btn-desc {
  font-family: var(--font-ui);
  font-size: 0.95rem;
  color: var(--parchment-dim);
  text-transform: none;
  letter-spacing: normal;
}
body[data-mode="home"] .mode-switcher .mode-btn {
  display: none; /* Oculta tabs arriba en la home */
}
body[data-mode="home"] .brand {
  cursor: default;
}
.brand {
  cursor: pointer; /* para volver a la home */
}
`;

if (!html.includes('/* CSS para la nueva Home */')) {
  html = html.replace('/* ==========================================================================', cssToInsert + '\n/* ==========================================================================');
}

// 2. Insert HTML for #panel-home inside <main>
const htmlToInsert = `
  <!-- HOME LANDING -->
  <section class="panel" id="panel-home" style="display:none;">
    <div class="home-grid">
      <button class="home-btn" data-home-nav="banda">
        <span class="home-btn-icon">⚔</span>
        Bandas
        <span class="home-btn-desc">Crear, importar y gestionar tus warbands</span>
      </button>
      <button class="home-btn" data-home-nav="campana">
        <span class="home-btn-icon">📚</span>
        Campañas
        <span class="home-btn-desc">Juega crónicas narrativas y progresión</span>
      </button>
      <button class="home-btn" data-home-nav="lab">
        <span class="home-btn-icon">🔬</span>
        LAB
        <span class="home-btn-desc">Simula batallas y cruza estadísticas</span>
      </button>
      <button class="home-btn" data-home-nav="battle">
        <span class="home-btn-icon">📋</span>
        Partida
        <span class="home-btn-desc">Juega una partida sin afectar a campañas</span>
      </button>
    </div>
  </section>
`;

if (!html.includes('id="panel-home"')) {
  html = html.replace('<main>', '<main>\n' + htmlToInsert);
}

// 3. Modify setMode in Javascript
const setModeRegex = /function setMode\(mode\) \{/;
if (html.match(setModeRegex) && !html.includes("if (mode === 'home')")) {
  const setModePatch = `function setMode(mode) {
  STATE.mode = mode;
  try { localStorage.setItem(STATE_KEY + '_mode', mode); } catch (e) {}
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === mode);
  });
  
  // Set body attribute for css targeting
  document.body.setAttribute('data-mode', mode);

  ['banda','campana','lab','battle','home'].forEach(m => {
    document.body.classList.toggle('mode-' + m, m === mode);
  });

  const aBanda = document.getElementById('actions-banda');
  if (aBanda) aBanda.style.display = mode === 'banda' ? '' : 'none';
  const aCamp = document.getElementById('actions-campana');
  if (aCamp) aCamp.style.display = mode === 'campana' ? '' : 'none';
  const aLab = document.getElementById('actions-lab');
  if (aLab) aLab.style.display = mode === 'lab' ? '' : 'none';
  const aBattle = document.getElementById('actions-battle');
  if (aBattle) aBattle.style.display = mode === 'battle' ? '' : 'none';

  // Panels
  const homePanel = document.getElementById('panel-home');
  const labPanel = document.getElementById('panel-lab');
  const battlePanel = document.getElementById('panel-battle');
  const catPanel = document.getElementById('panel-catalogue');
  const rosterPanel = document.getElementById('panel-roster');
  const detailPanel = document.getElementById('panel-detail');
  const varPanel = document.getElementById('panel-variantes');
  const shopPanel = document.getElementById('panel-shopping');
  
  if (mode === 'home') {
    if (homePanel) homePanel.style.display = '';
    if (labPanel) labPanel.style.display = 'none';
    if (battlePanel) battlePanel.style.display = 'none';
    if (catPanel) catPanel.style.display = 'none';
    if (rosterPanel) rosterPanel.style.display = 'none';
    if (detailPanel) detailPanel.style.display = 'none';
    if (varPanel) varPanel.style.display = 'none';
    if (shopPanel) shopPanel.style.display = 'none';
    const subtabs = document.getElementById('banda-subtabs');
    if (subtabs) subtabs.style.display = 'none';
  } else if (mode === 'lab') {
    if (homePanel) homePanel.style.display = 'none';`;
    
  html = html.replace(/function setMode\(mode\) \{[\s\S]*?if \(mode === 'lab'\) \{/, setModePatch);
}

// Ensure default mode in boot is home if not set
if (html.includes("STATE.mode || 'banda'")) {
    html = html.replace("STATE.mode || 'banda'", "STATE.mode || 'home'");
    // Actually there are a few places. Let's do a global replace carefully.
    html = html.replace(/STATE\.mode \|\| 'banda'/g, "STATE.mode || 'home'");
}

// Add event listeners for new home buttons and brand click
const listenersPatch = `
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});

document.querySelectorAll('.home-btn').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.homeNav));
});

const brandHeader = document.querySelector('.brand');
if (brandHeader) {
  brandHeader.addEventListener('click', () => setMode('home'));
}
`;
if (!html.includes('.home-btn')) {
  html = html.replace(`document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setMode(btn.dataset.mode));
});`, listenersPatch);
}

// Fix initial body attribute for data-mode in boot()
const bootInitPatch = `document.body.setAttribute('data-mode', STATE.mode);
  document.querySelectorAll('.mode-btn').forEach(b => {`;
if (!html.includes("document.body.setAttribute('data-mode', STATE.mode);")) {
  html = html.replace(`document.querySelectorAll('.mode-btn').forEach(b => {`, bootInitPatch);
}

fs.writeFileSync(indexFile, html, 'utf8');
console.log('Home remodeled');
