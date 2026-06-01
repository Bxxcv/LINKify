const actionMap = {
  'close-sidebar': () => window.closeSidebar?.(),
  'close-confirm': () => window.closeConfirm?.(),
  'close-plan-modal': () => window.closePlanModal?.(),
  'switch-basic': () => window.switchPlanTab?.('basic'),
  'switch-premium': () => window.switchPlanTab?.('premium'),
  'save-plan-modal': () => window.savePlanModal?.(),
  'scroll-maint': () => document.getElementById('maint-panel')?.scrollIntoView({ behavior: 'smooth' }),
  'logout-admin': () => window.logoutAdmin?.(),
  'login-admin': () => window.loginAdmin?.(),
  'daftar-user': () => window.daftarkanUser?.(),
  'ambil-data-user': () => window.ambilDataUser?.(),
  'save-maintenance': () => window.saveMaintenance?.(),
};

document.addEventListener('click', event => {
  const action = event.target.closest('[data-admin-daftar-action]')?.dataset.adminDaftarAction;
  if (!action || !actionMap[action]) return;
  actionMap[action]();
});

document.addEventListener('change', event => {
  if (event.target?.id !== 'maint-toggle') return;
  const track = document.querySelector('.maint-track');
  const thumb = document.querySelector('.maint-thumb');
  if (track) track.style.background = event.target.checked ? '#EF4444' : '#2C313A';
  if (thumb) thumb.style.transform = event.target.checked ? 'translateX(20px)' : 'translateX(0)';
  window.toggleMaintenance?.();
});
