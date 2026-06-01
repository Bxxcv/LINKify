function clear(node) {
  node.replaceChildren();
}

function text(tag, value, className = '') {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.textContent = value ?? '';
  return el;
}

export function renderProductSkeleton(container, count = 3) {
  clear(container);
  const frag = document.createDocumentFragment();

  for (let i = 0; i < count; i += 1) {
    const card = document.createElement('div');
    card.className = 'skel-card';

    const image = document.createElement('div');
    image.className = 'skel';
    image.style.cssText = 'height:130px;border-radius:12px 12px 0 0';

    const body = document.createElement('div');
    body.style.cssText = 'padding:10px 12px';

    const line1 = document.createElement('div');
    line1.className = 'skel';
    line1.style.cssText = 'height:12px;width:70%;margin-bottom:7px';

    const line2 = document.createElement('div');
    line2.className = 'skel';
    line2.style.cssText = 'height:13px;width:45%';

    body.append(line1, line2);
    card.append(image, body);
    frag.appendChild(card);
  }

  container.appendChild(frag);
}

export function renderProductError(container, message) {
  clear(container);
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.appendChild(text('p', message));
  container.appendChild(empty);
}

export function renderProductEmpty(container) {
  clear(container);

  const empty = document.createElement('div');
  empty.className = 'empty-state';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');

  const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path1.setAttribute('d', 'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z');

  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', '3');
  line.setAttribute('y1', '6');
  line.setAttribute('x2', '21');
  line.setAttribute('y2', '6');

  const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path2.setAttribute('d', 'M16 10a4 4 0 01-8 0');

  svg.append(path1, line, path2);
  empty.append(svg, text('h3', 'Belum ada produk'), text('p', 'Klik "Tambah Produk" untuk mulai berjualan.'));
  container.appendChild(empty);
}

export function renderAdminProductGrid(container, list, options = {}) {
  const formatPrice = options.formatPrice || ((value) => String(value || 0));
  const safeImgUrl = options.safeImgUrl || ((value) => value || '');
  clear(container);

  if (!container._imgErrBound) {
    container._imgErrBound = true;
    container.addEventListener('error', (event) => {
      const img = event.target;
      if (img?.tagName === 'IMG' && img.dataset.fallback === 'product') {
        img.onerror = null;
        img.src = 'https://placehold.co/400x300/F4F4F4/AAA?text=Foto';
      }
    }, true);
  }

  const frag = document.createDocumentFragment();

  list.forEach((product) => {
    const stock = Number(product.stok) || 0;
    const price = Number(product.harga) || 0;
    const originalPrice = Number(product.hargaAsli) || 0;

    const card = document.createElement('div');
    card.className = 'p-card';

    const image = document.createElement('img');
    image.className = 'p-img';
    image.src = safeImgUrl(product.img || '') || 'https://placehold.co/200x200/111/333?text=Foto';
    image.alt = product.nama || 'Foto produk';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.dataset.fallback = 'product';

    const body = document.createElement('div');
    body.className = 'p-body';

    const name = document.createElement('div');
    name.className = 'p-name';
    name.appendChild(document.createTextNode(product.nama || 'Produk'));

    if (product.unggulan) {
      const badge = document.createElement('span');
      badge.style.cssText = 'color:#F59E0B;font-size:11px;';
      badge.textContent = ' ★';
      name.appendChild(badge);
    }

    const priceRow = document.createElement('div');
    priceRow.className = 'p-price';
    priceRow.appendChild(document.createTextNode(`Rp${formatPrice(price)}`));

    if (originalPrice > price) {
      const original = document.createElement('span');
      original.style.cssText = 'text-decoration:line-through;color:var(--text-3);font-size:11px;font-weight:400;margin-left:5px';
      original.textContent = `Rp${formatPrice(originalPrice)}`;
      priceRow.appendChild(original);
    }

    const stockRow = document.createElement('div');
    stockRow.className = 'p-stock';
    stockRow.appendChild(document.createTextNode(`Stok: ${stock}`));

    if (stock === 0) {
      const empty = document.createElement('span');
      empty.style.cssText = 'color:var(--danger);font-weight:600';
      empty.textContent = ' · Habis';
      stockRow.appendChild(empty);
    }

    if (product.kategori) {
      stockRow.appendChild(document.createTextNode(` · ${product.kategori}`));
    }

    const actions = document.createElement('div');
    actions.className = 'p-acts';

    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'btn-ed';
    edit.dataset.id = product.id;
    edit.textContent = 'Edit';

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'btn-del';
    del.dataset.id = product.id;
    del.textContent = 'Hapus';

    actions.append(edit, del);
    body.append(name, priceRow, stockRow, actions);
    card.append(image, body);
    frag.appendChild(card);
  });

  container.appendChild(frag);
}
