window.goTab = function goTab(tab) {
  if (!tab) return;
  document.querySelectorAll('.tab-btn[data-tab]').forEach(button => button.classList.remove('active-tab'));
  document.querySelectorAll('.page').forEach(page => page.classList.remove('show'));

  const safeTab = String(tab).replace(/[^a-z0-9_-]/gi, '');
  const button = document.querySelector(`.tab-btn[data-tab="${safeTab}"]`);
  const page = document.getElementById(`tab-${safeTab}`);

  button?.classList.add('active-tab');
  page?.classList.add('show');
};

document.addEventListener('click', event => {
  const action = event.target.closest('[data-admin-action]')?.dataset.adminAction;
  if (!action) return;

  if (action === 'add-product') {
    window.goTab('products');
    window.setTimeout(() => document.getElementById('btn-add-product')?.click(), 80);
    return;
  }

  if (action === 'settings') {
    window.goTab('settings');
    return;
  }

  if (action === 'copy-link') {
    document.getElementById('btn-copy-link')?.click();
    return;
  }

  if (action === 'premium') {
    window.goTab('premium');
  }
});
