window.shareLink = async function shareLink() {
  const title = document.getElementById('username')?.textContent || 'Toko';

  if (navigator.share) {
    try {
      await navigator.share({ title, url: window.location.href });
    } catch (_) {}
    return;
  }

  try {
    await navigator.clipboard.writeText(window.location.href);
    const btn = document.querySelector('.share-btn');
    if (btn) {
      btn.style.background = 'rgba(16,185,129,0.15)';
      btn.style.borderColor = 'rgba(16,185,129,0.3)';
      window.setTimeout(() => {
        btn.style.background = '';
        btn.style.borderColor = '';
      }, 1400);
    }
  } catch (_) {}
};

document.addEventListener('click', event => {
  const action = event.target.closest('[data-storefront-action]')?.dataset.storefrontAction;
  if (!action) return;

  if (action === 'share') {
    event.preventDefault();
    window.shareLink();
    return;
  }

  if (action === 'track-wa') window.trackClick?.('wa');
  if (action === 'track-shopee') window.trackClick?.('shopee');
});
