
export function escapeHTML(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function safeText(el, value) {
  if (el) el.textContent = value ?? '';
}

export function safeUrl(url='') {
  try {
    const u = new URL(url, location.origin);
    return ['http:', 'https:'].includes(u.protocol) ? u.href : '';
  } catch {
    return '';
  }
}

export function createSafeElement(tag, text='') {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
}
