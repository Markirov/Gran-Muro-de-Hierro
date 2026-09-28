/* ======================================================================
   MODALS
   ====================================================================== */

// Modal stacking. All .modal-backdrop share the same base z-index, so a
// modal opened on top of another (e.g. a picker launched from the battle
// wizard) would render BEHIND it based on DOM order and be unclickable.
// When opening a modal while others are already shown, bump its z-index
// above them so nested modals are always selectable.
let _modalZTop = 200;
function openModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const anyOpen = document.querySelectorAll('.modal-backdrop.show').length > 0;
  if (anyOpen) {
    _modalZTop += 10;
    el.style.zIndex = String(_modalZTop);
  }
  el.classList.add('show');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('show');
  el.style.zIndex = '';
  // Reset the stacking counter once everything is closed.
  if (document.querySelectorAll('.modal-backdrop.show').length === 0) {
    _modalZTop = 200;
  }
}
document.querySelectorAll('[data-close]').forEach(b => {
  b.addEventListener('click', () => {
    const m = b.closest('.modal-backdrop');
    if (m && m.id) closeModal(m.id);
    else if (m) m.classList.remove('show');
  });
});
document.querySelectorAll('.modal-backdrop').forEach(b => {
  b.addEventListener('click', (e) => {
    if (e.target === b) { if (b.id) closeModal(b.id); else b.classList.remove('show'); }
  });
});

function confirmModal({ title, message, confirmText='Confirmar', onConfirm }) {
  document.getElementById('confirm-title').textContent = title;
  document.getElementById('confirm-message').textContent = message;
  const btn = document.getElementById('btn-confirm-yes');
  btn.textContent = confirmText;
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);
  newBtn.addEventListener('click', () => {
    closeModal('modal-confirm');
    onConfirm();
  });
  openModal('modal-confirm');
}


