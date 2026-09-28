/* ======================================================================
   BOOT
   ====================================================================== */

function boot() {
  // Load most recent warband or create new
  const last = loadCurrent();
  if (last) {
    STATE.currentWarband = last;
  } else {
    STATE.currentWarband = newWarband();
  }
  // Restore mode + current campaign if any
  STATE.mode = localStorage.getItem(STORAGE_MODE) || 'banda';
  const lastCampId = localStorage.getItem(STORAGE_CURRENT_CAMPAIGN);
  if (lastCampId) {
    const c = loadCampaign(lastCampId);
    if (c) {
      refreshAllWarbandStates(c);
      STATE.currentCampaign = c;
      STATE.selectedCampaignWarbandId = c.warbandIds[0] || null;
    }
  }
  // Apply mode visibility
  document.querySelectorAll('.mode-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === STATE.mode);
  });
  // SPEC-rediseno-ui Sub-C — body.mode-<X> para CSS sub-tabs.
  ['banda','campana','lab','battle'].forEach(m => {
    document.body.classList.toggle('mode-' + m, m === STATE.mode);
  });
  document.getElementById('actions-banda').style.display    = STATE.mode === 'banda'   ? '' : 'none';
  document.getElementById('actions-campana').style.display  = STATE.mode === 'campana' ? '' : 'none';

  renderAll();
  syncPanelsToViewport();
  if (urlParams.get('settings') === '1') {
    setTimeout(() => {
      const btn = document.getElementById('btn-config-menu');
      if (btn) btn.click();
    }, 500);
  }
  // SPEC-rediseno-ui Sub-C — restaurar sub-tab persistido.
  setBandaSubtab(getActiveBandaSubtab());
  // SPEC-rediseno-ui Sub-B — restaurar sidebar facción (plegada default).
  setFactionSidebarOpen(isFactionSidebarOpen());
  // Item 2 — panel izquierdo: vista "Tus bandas" por default.
  let leftView = 'bands';
  try { leftView = localStorage.getItem(LEFT_PANEL_VIEW_KEY) || 'bands'; } catch (e) {}
  setLeftPanelView(leftView);
  // Sub-OA-C — auto-restore desde GitHub Gist si hay sesión OAuth activa.
  if (typeof _ghAutoRestoreOnBoot === 'function') _ghAutoRestoreOnBoot();
}

boot();


