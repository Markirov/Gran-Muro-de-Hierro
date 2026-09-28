const fs = require('fs');
const path = require('path');
const indexFile = path.join(__dirname, 'index.html');
let html = fs.readFileSync(indexFile, 'utf8');

const regex = /function setMode\(mode\) \{[\s\S]*?\/\/ Mobile tabs/m;
const newSetMode = `function setMode(mode) {
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

  // All Panels references
  const homePanel = document.getElementById('panel-home');
  const listBandaEl = document.getElementById('view-bandas-list');
  const createBandaEl = document.getElementById('view-banda-create');
  
  const labPanel = document.getElementById('panel-lab');
  const battlePanel = document.getElementById('panel-battle');
  const catPanel = document.getElementById('panel-catalogue');
  const rosterPanel = document.getElementById('panel-roster');
  const detailPanel = document.getElementById('panel-detail');
  const varPanel = document.getElementById('panel-variantes');
  const shopPanel = document.getElementById('panel-shopping');
  const subtabs = document.getElementById('banda-subtabs');

  // Helper to hide all main panels
  const hideAll = () => {
    if (homePanel) homePanel.style.display = 'none';
    if (listBandaEl) listBandaEl.style.display = 'none';
    if (createBandaEl) createBandaEl.style.display = 'none';
    if (labPanel) labPanel.style.display = 'none';
    if (battlePanel) battlePanel.style.display = 'none';
    if (catPanel) catPanel.style.display = 'none';
    if (rosterPanel) rosterPanel.style.display = 'none';
    if (detailPanel) detailPanel.style.display = 'none';
    if (varPanel) varPanel.style.display = 'none';
    if (shopPanel) shopPanel.style.display = 'none';
    if (subtabs) subtabs.style.display = 'none';
  };

  hideAll();

  if (mode === 'home') {
    if (homePanel) homePanel.style.display = '';
  } else if (mode === 'banda') {
    setBandaView(STATE.warband ? 'roster' : 'list');
  } else if (mode === 'lab') {
    if (labPanel) labPanel.style.display = '';
    renderLab();
  } else if (mode === 'battle') {
    if (battlePanel) battlePanel.style.display = '';
    if (typeof renderBattle === 'function') renderBattle();
  } else if (mode === 'campana') {
    if (catPanel) catPanel.style.display = '';
    if (rosterPanel) rosterPanel.style.display = '';
    if (detailPanel) detailPanel.style.display = '';
  }

  // Mobile tabs`;

html = html.replace(regex, newSetMode);
fs.writeFileSync(indexFile, html, 'utf8');
console.log('Fixed setMode fully');
