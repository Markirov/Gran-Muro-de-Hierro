/* ======================================================================
   MOBILE TABS
   ====================================================================== */

document.querySelectorAll('.mobile-tabs button').forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    document.querySelectorAll('.mobile-tabs button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tabMap = {
      catalogue: 'panel-catalogue',
      roster: 'panel-roster',
      detail: 'panel-detail',
    };
    document.querySelectorAll('main > .panel').forEach(p => p.style.display = 'none');
    const target_panel = document.getElementById(tabMap[target]);
    if (target_panel) target_panel.style.display = 'block';
  });
});

// Show all panels on desktop
function syncPanelsToViewport() {
  if (window.innerWidth > 1100) {
    document.querySelectorAll('main > .panel').forEach(p => p.style.display = '');
  }
}
window.addEventListener('resize', syncPanelsToViewport);


