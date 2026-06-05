const openModals = new Set();

function isOverlayBlockingInput() {
  return openModals.size > 0;
}

function bindModalClose(modal) {
  if (!modal) return;
  modal.querySelectorAll('[data-modal-close]').forEach((el) => {
    el.addEventListener('click', () => setModalOpen(modal.id, false));
  });
}

function setModalOpen(id, open) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.hidden = !open;
  if (open) {
    openModals.add(id);
    document.body.style.overflow = 'hidden';
  } else {
    openModals.delete(id);
    if (openModals.size === 0) document.body.style.overflow = '';
  }
}

function closeAllOverlays() {
  [...openModals].forEach((id) => setModalOpen(id, false));
}

function openModalExclusive(id) {
  closeAllOverlays();
  setModalOpen(id, true);
}

function initToolbarModals() {
  bindModalClose(document.getElementById('help-how-to-modal'));
  bindModalClose(document.getElementById('stats-modal'));
  bindModalClose(document.getElementById('settings-modal'));

  document.getElementById('how-to-btn')?.addEventListener('click', () => {
    openModalExclusive('help-how-to-modal');
  });

  document.getElementById('stats-btn')?.addEventListener('click', () => {
    openModalExclusive('stats-modal');
  });

  document.getElementById('settings-btn')?.addEventListener('click', () => {
    openModalExclusive('settings-modal');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllOverlays();
  });
}

function initUI() {
  initToolbarModals();
}
