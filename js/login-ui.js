const SVG_NS = 'http://www.w3.org/2000/svg';

function createSvgNode(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
  return el;
}

function setEyeIcon(svg, visible) {
  if (!svg) return;
  while (svg.firstChild) svg.removeChild(svg.firstChild);

  if (visible) {
    svg.appendChild(createSvgNode('path', { d: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' }));
    svg.appendChild(createSvgNode('circle', { cx: '12', cy: '12', r: '3' }));
    return;
  }

  svg.appendChild(createSvgNode('path', { d: 'M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' }));
  svg.appendChild(createSvgNode('line', { x1: '1', y1: '1', x2: '23', y2: '23' }));
}

document.addEventListener('DOMContentLoaded', () => {
  const togglePasswordBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');
  const eyeIcon = document.getElementById('eyeIcon');

  togglePasswordBtn?.addEventListener('click', () => {
    const visible = passwordInput?.getAttribute('type') === 'password';
    passwordInput?.setAttribute('type', visible ? 'text' : 'password');
    setEyeIcon(eyeIcon, visible);
    togglePasswordBtn.setAttribute('aria-label', visible ? 'Sembunyikan password' : 'Tampilkan password');
  });
});
