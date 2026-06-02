
(function () {
  const $ = (id) => document.getElementById(id);

  function clickExistingPreview() {
    $('btn-preview-store')?.click();
  }

  function syncNameFromInput() {
    const value = $('inp-username')?.value?.trim();
    if (value && $('admin-shop-name')) $('admin-shop-name').textContent = value;
  }

  function syncAvatarFromLogo() {
    const logo = $('logo-preview');
    const sidebar = $('sidebar-avatar');
    const src = logo?.getAttribute('src');
    if (!src) return;
    if (sidebar) {
      sidebar.textContent = '';
      sidebar.style.backgroundImage = `url("${src}")`;
      sidebar.style.backgroundSize = 'cover';
      sidebar.style.backgroundPosition = 'center';
    }
  }

  document.addEventListener('click', (event) => {
    if (event.target.closest('#btn-preview-store-hero')) clickExistingPreview();
  });

  document.addEventListener('input', (event) => {
    if (event.target?.id === 'inp-username') syncNameFromInput();
  });

  window.addEventListener('load', () => {
    syncNameFromInput();
    syncAvatarFromLogo();
    const logo = $('logo-preview');
    if (logo) {
      const observer = new MutationObserver(syncAvatarFromLogo);
      observer.observe(logo, { attributes: true, attributeFilter: ['src'] });
    }
  });
})();
