function applyStyles(el, cssText) {
  el.style.cssText = cssText;
  return el;
}

export function renderPremiumTemplateOptions(container, templates, currentTemplate = '') {
  if (!container) return;
  container.textContent = '';

  const frag = document.createDocumentFragment();

  templates.forEach(template => {
    const preview = template.preview || {};
    const colors = preview.colors || {};
    const isActive = template.id === currentTemplate;

    const card = document.createElement('div');
    card.className = `premium-template-card${isActive ? ' active' : ''}`;
    card.dataset.template = template.id || '';
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-pressed', isActive ? 'true' : 'false');

    const previewBox = document.createElement('div');
    previewBox.className = 'premium-template-preview';
    previewBox.textContent = template.icon || '';
    previewBox.style.background = `linear-gradient(135deg,${colors.primary || '#111827'} 0%,${colors.secondary || '#374151'} 100%)`;

    const content = document.createElement('div');
    content.className = 'premium-template-content';

    const title = document.createElement('div');
    title.className = 'premium-template-title';
    title.textContent = template.name || '';

    const category = document.createElement('div');
    category.className = 'premium-template-category';
    category.textContent = template.category || '';

    const desc = document.createElement('div');
    desc.className = 'premium-template-desc';
    desc.textContent = template.description || '';

    const features = document.createElement('div');
    features.className = 'premium-template-features';
    (template.features || []).forEach(feature => {
      const tag = document.createElement('span');
      tag.className = 'premium-template-tag';
      tag.textContent = feature || '';
      features.appendChild(tag);
    });

    content.append(title, category, desc, features);
    card.append(previewBox, content);
    frag.appendChild(card);
  });

  container.appendChild(frag);
}

export function renderCancelTemplateButton(container, visible, onClick) {
  if (!container) return;
  container.textContent = '';

  if (!visible) return;

  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'btn-cancel-template';
  button.className = 'btn btn-outline btn-w';
  button.textContent = 'Batalkan Template (Gunakan Default)';
  applyStyles(button, 'font-size:13px;color:var(--danger);border-color:rgba(239,68,68,.3);');
  button.addEventListener('click', onClick);
  container.appendChild(button);
}
