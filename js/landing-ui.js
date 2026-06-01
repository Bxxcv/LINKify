document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');

  window.addEventListener('scroll', () => {
    if (!navbar) return;
    const scrolled = window.scrollY > 50;
    navbar.classList.toggle('bg-primary-gradient', scrolled);
    navbar.classList.toggle('shadow-sm', scrolled);
    navbar.classList.toggle('py-2', scrolled);
    navbar.classList.toggle('py-3', !scrolled);
  }, { passive: true });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.reveal-on-scroll').forEach(el => observer.observe(el));

  const fabBtn = document.getElementById('fabBtn');
  const fabMenu = document.getElementById('fabMenu');

  fabBtn?.addEventListener('click', event => {
    event.stopPropagation();
    fabBtn.classList.toggle('active');
    fabMenu?.classList.toggle('show');
  });

  document.addEventListener('click', () => {
    fabBtn?.classList.remove('active');
    fabMenu?.classList.remove('show');
  });
});
