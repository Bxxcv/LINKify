export const CUSTOM_BUTTON_COLORS = [
  '#FF6B35', '#EE4D2D', '#25D366', '#3B82F6', '#8B5CF6',
  '#EC4899', '#F59E0B', '#111111', '#06B6D4', '#10B981'
];

function applyStyles(el, cssText) {
  el.style.cssText = cssText;
  return el;
}

function makeInput({ value = '', placeholder = '', field, idx, fontSize = '13px', opacity = '1' }) {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value || '';
  input.dataset.field = field;
  input.dataset.idx = String(idx);
  applyStyles(input, `width:100%;background:var(--input-bg,rgba(255,255,255,0.06));border:1px solid var(--border);border-radius:8px;padding:7px 10px;font-size:${fontSize};color:var(--text);opacity:${opacity};min-width:0;`);
  return input;
}

function createRemoveButton(idx) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cb-remove';
  button.dataset.idx = String(idx);
  button.setAttribute('aria-label', 'Hapus tombol');
  button.textContent = '×';
  applyStyles(button, 'background:rgba(239,68,68,.12);border:none;border-radius:6px;width:30px;height:30px;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;color:#EF4444;font-size:18px;line-height:1;');
  return button;
}

function createColorSwatch(color, idx) {
  const swatch = document.createElement('button');
  swatch.type = 'button';
  swatch.className = 'color-swatch-btn';
  swatch.dataset.action = 'cycle-color';
  swatch.dataset.idx = String(idx);
  swatch.title = 'Ganti warna';
  swatch.setAttribute('aria-label', 'Ganti warna tombol');
  applyStyles(swatch, `width:28px;height:28px;border-radius:6px;background:${color || '#3B82F6'};cursor:pointer;flex-shrink:0;border:2px solid rgba(255,255,255,0.15);transition:transform .15s;`);
  return swatch;
}

function createEmptyState() {
  const empty = document.createElement('div');
  empty.textContent = 'Belum ada tombol. Klik "+ Tambah Tombol".';
  applyStyles(empty, 'padding:12px;text-align:center;font-size:12px;color:var(--text-3);');
  return empty;
}

export function renderCustomButtonList(container, buttons, handlers = {}) {
  if (!container) return;
  container.textContent = '';

  if (!buttons.length) {
    container.appendChild(createEmptyState());
    return;
  }

  const frag = document.createDocumentFragment();

  buttons.forEach((buttonData, idx) => {
    const color = buttonData.color || '#3B82F6';
    const card = document.createElement('div');
    card.className = 'custom-btn-item';
    card.dataset.idx = String(idx);
    applyStyles(card, 'background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:7px;');

    const row = document.createElement('div');
    applyStyles(row, 'display:flex;gap:8px;align-items:center;');

    const labelInput = makeInput({
      value: buttonData.label || '',
      placeholder: 'Label (cth: GoFood)',
      field: 'label',
      idx
    });
    labelInput.style.flex = '1';

    row.append(createColorSwatch(color, idx), labelInput, createRemoveButton(idx));

    const urlInput = makeInput({
      value: buttonData.url || '',
      placeholder: 'https://link.com',
      field: 'url',
      idx
    });

    const descInput = makeInput({
      value: buttonData.desc || '',
      placeholder: 'Deskripsi singkat (opsional)',
      field: 'desc',
      idx,
      fontSize: '12px',
      opacity: '.85'
    });

    card.append(row, urlInput, descInput);
    frag.appendChild(card);
  });

  container.appendChild(frag);

  container.querySelectorAll('input[data-field]').forEach(input => {
    input.addEventListener('input', () => handlers.onInput?.(input));
  });
}
