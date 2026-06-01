function applyStyles(el, cssText) {
  el.style.cssText = cssText;
  return el;
}

export function normalizeGalleryItem(item) {
  if (typeof item === 'string') return { url: item, caption: '', kategori: '' };
  return {
    url: item?.url || '',
    caption: item?.caption || '',
    kategori: item?.kategori || ''
  };
}

export function getGalleryKategoriList(photos = []) {
  return [...new Set(photos.map(photo => photo.kategori).filter(Boolean))];
}

function createEmptyGalleryState() {
  const empty = document.createElement('div');
  empty.textContent = 'Belum ada foto gallery. Klik "+ Tambah Foto".';
  applyStyles(empty, 'grid-column:1/-1;padding:20px;text-align:center;font-size:12px;color:var(--text-3);');
  return empty;
}

function createGalleryInput({ value, placeholder, field, idx, list }) {
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = placeholder;
  input.value = value || '';
  input.dataset.field = field;
  input.dataset.idx = String(idx);
  if (list) input.setAttribute('list', list);
  applyStyles(input, 'width:100%;background:rgba(255,255,255,0.06);border:1px solid var(--border);border-radius:7px;padding:6px 8px;font-size:11.5px;color:var(--text);outline:none;');
  return input;
}

function createRemoveButton(idx) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.action = 'remove-gallery';
  button.dataset.idx = String(idx);
  button.setAttribute('aria-label', 'Hapus foto');
  button.textContent = '×';
  applyStyles(button, 'position:absolute;top:5px;right:5px;width:24px;height:24px;border-radius:50%;background:rgba(0,0,0,.75);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#fff;z-index:2;font-size:16px;line-height:1;');
  return button;
}

export function renderGalleryEditorGrid(grid, photos, options = {}) {
  if (!grid) return;
  grid.textContent = '';

  if (!photos.length) {
    grid.appendChild(createEmptyGalleryState());
    return;
  }

  const cats = getGalleryKategoriList(photos);
  const datalistId = options.datalistId || 'gal-kat-list';
  const frag = document.createDocumentFragment();
  const datalist = document.createElement('datalist');
  datalist.id = datalistId;

  cats.forEach(category => {
    const option = document.createElement('option');
    option.value = category;
    datalist.appendChild(option);
  });

  frag.appendChild(datalist);

  photos.forEach((photo, idx) => {
    const card = document.createElement('div');
    card.className = 'gal-edit-card';
    card.dataset.idx = String(idx);
    applyStyles(card, 'background:var(--surface);border:1px solid var(--border);border-radius:10px;overflow:hidden;display:flex;flex-direction:column;');

    const imageWrap = document.createElement('div');
    applyStyles(imageWrap, 'position:relative;aspect-ratio:1;overflow:hidden;background:rgba(0,0,0,.3);flex-shrink:0;');

    const img = document.createElement('img');
    img.src = options.safeImgUrl?.(photo.url) || 'https://placehold.co/200x200/111/333?text=Error';
    img.alt = `Gallery ${idx + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    applyStyles(img, 'width:100%;height:100%;object-fit:cover;');
    img.onerror = function () {
      this.onerror = null;
      this.src = 'https://placehold.co/200x200/111/333?text=Error';
    };

    imageWrap.append(img, createRemoveButton(idx));

    const inputWrap = document.createElement('div');
    applyStyles(inputWrap, 'padding:8px 8px 10px;display:flex;flex-direction:column;gap:5px;');

    inputWrap.append(
      createGalleryInput({
        value: photo.kategori,
        placeholder: 'Kategori (cth: Interior)',
        field: 'kategori',
        idx,
        list: datalistId
      }),
      createGalleryInput({
        value: photo.caption,
        placeholder: 'Caption foto...',
        field: 'caption',
        idx
      })
    );

    card.append(imageWrap, inputWrap);
    frag.appendChild(card);
  });

  grid.appendChild(frag);

  grid.querySelectorAll('input[data-field]').forEach(input => {
    input.addEventListener('input', () => options.onInput?.(input));
  });
}
