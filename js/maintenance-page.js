(function initMaintenancePage() {
  function renderCountdown(endDate) {
    const countdownWrap = document.getElementById('countdown-wrap');
    const estText = document.getElementById('est-text');
    const estLabel = document.getElementById('est-label');
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');

    if (!countdownWrap || !estText || !estLabel) return;

    countdownWrap.style.display = 'flex';
    estText.style.display = 'inline-flex';
    estLabel.textContent = endDate.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });

    const update = () => {
      const diff = endDate - new Date();
      if (diff <= 0) {
        if (daysEl) daysEl.textContent = '0';
        if (hoursEl) hoursEl.textContent = '0';
        if (minsEl) minsEl.textContent = '0';
        return;
      }

      const totalMinutes = Math.floor(diff / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;

      if (daysEl) daysEl.textContent = String(days);
      if (hoursEl) hoursEl.textContent = String(hours);
      if (minsEl) minsEl.textContent = String(minutes);
    };

    update();
    window.setInterval(update, 60000);
  }

  try {
    const raw = sessionStorage.getItem('lf_maint');
    if (!raw) return;
    const data = JSON.parse(raw);

    if (data.title) {
      const title = document.getElementById('maint-title');
      if (title) title.textContent = data.title;
    }

    if (data.message) {
      const message = document.getElementById('maint-msg');
      if (message) message.textContent = data.message;
    }

    if (data.estimatedDone) {
      const end = data.estimatedDone?.seconds
        ? new Date(data.estimatedDone.seconds * 1000)
        : new Date(data.estimatedDone);

      if (end > new Date()) renderCountdown(end);
    }
  } catch (_) {}

  document.addEventListener('click', event => {
    if (event.target.closest('[data-maintenance-action="reload"]')) {
      location.reload();
    }
  });
})();
