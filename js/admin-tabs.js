window.goTab = function goTab(tab) {
  if (!tab) return;
  document.querySelectorAll('.tab-btn[data-tab]').forEach(button => button.classList.remove('active-tab'));
  document.querySelectorAll('.page').forEach(page => page.classList.remove('show'));

  const safeTab = String(tab).replace(/[^a-z0-9_-]/gi, '');
  const page = document.getElementById(`tab-${safeTab}`);

  document.querySelectorAll(`.tab-btn[data-tab="${safeTab}"]`).forEach(button => button.classList.add('active-tab'));
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


document.addEventListener('input', event => {
  if (event.target?.id === 'prod-search') window.debouncedFilter?.();
});

document.addEventListener('change', event => {
  if (event.target?.id === 'prod-filter-kat') window.filterProducts?.();
});

// Close drawer after choosing a tab on mobile/tablet.
document.addEventListener('click', event => {
  const tabButton = event.target.closest('.sidebar .tab-btn[data-tab]');
  if (!tabButton || window.innerWidth > 1180) return;
  window.setTimeout(() => {
    if (window.closeAdminSidebar) {
      window.closeAdminSidebar();
    } else {
      document.getElementById('sidebar')?.classList.remove('open');
      document.getElementById('overlay')?.classList.remove('show');
      document.getElementById('btn-hamburger')?.classList.remove('is-open');
      document.getElementById('btn-hamburger')?.setAttribute('aria-expanded', 'false');
    }
  }, 80);
});
