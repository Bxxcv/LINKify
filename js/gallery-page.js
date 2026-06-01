import { db } from '/firebase.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { checkPlan, safeUrl } from './utils.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

function $(id) {
  return document.getElementById(id);
}

function clear(node) {
  if (!node) return;
  while (node.firstChild) node.removeChild(node.firstChild);
}

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, String(value)));
  return el;
}

function createEmptyState(message, variant = 'image') {
  const wrap = document.createElement('div');
  wrap.className = 'g-empty';

  const svg = svgEl('svg', {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '1.5',
    width: '40',
    height: '40',
    'aria-hidden': 'true',
    focusable: 'false',
  });

  if (variant === 'error') {
    svg.appendChild(svgEl('circle', { cx: '12', cy: '12', r: '10' }));
    svg.appendChild(svgEl('line', { x1: '4.93', y1: '4.93', x2: '19.07', y2: '19.07' }));
  } else {
    svg.appendChild(svgEl('rect', { x: '3', y: '3', width: '18', height: '18', rx: '2' }));
    svg.appendChild(svgEl('circle', { cx: '8.5', cy: '8.5', r: '1.5' }));
    svg.appendChild(svgEl('polyline', { points: '21 15 16 10 5 21' }));
  }

  const text = document.createElement('span');
  text.textContent = message;
  wrap.append(svg, text);
  return wrap;
}

function createZoomIcon() {
  const icon = document.createElement('div');
  icon.className = 'g-zoom-icon';
  const svg = svgEl('svg', {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'white',
    'stroke-width': '2',
    'stroke-linecap': 'round',
    width: '14',
    height: '14',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.appendChild(svgEl('circle', { cx: '11', cy: '11', r: '8' }));
  svg.appendChild(svgEl('line', { x1: '21', y1: '21', x2: '16.65', y2: '16.65' }));
  svg.appendChild(svgEl('line', { x1: '11', y1: '8', x2: '11', y2: '14' }));
  svg.appendChild(svgEl('line', { x1: '8', y1: '11', x2: '14', y2: '11' }));
  icon.appendChild(svg);
  return icon;
}

const params = new URLSearchParams(location.search);
const rawUid = params.get('uid') || '';
const uid = /^[a-zA-Z0-9]{10,128}$/.test(rawUid) ? rawUid : null;

const backBtn = $('back-btn');
if (backBtn) backBtn.href = uid ? `toko.html?uid=${encodeURIComponent(uid)}` : 'index.html';

let allPhotos = [];
let filteredPhotos = [];
let curIdx = 0;
let categoryListenerReady = false;

const normalizePhoto = item => {
  if (typeof item === 'string') return { url: item, caption: '', kategori: '' };
  return {
    url: typeof item?.url === 'string' ? item.url : '',
    caption: typeof item?.caption === 'string' ? item.caption : '',
    kategori: typeof item?.kategori === 'string' ? item.kategori : '',
  };
};

function hideSkeleton() {
  const skeleton = $('skeleton-wrap');
  const wrap = $('g-wrap');
  if (skeleton) skeleton.style.display = 'none';
  if (wrap) wrap.style.display = '';
}

function buildGrid(photos) {
  const grid = $('gallery-full-grid');
  if (!grid) return;
  clear(grid);

  if (!photos.length) {
    grid.appendChild(createEmptyState('Tidak ada foto di kategori ini'));
    return;
  }

  const frag = document.createDocumentFragment();
  photos.forEach((photo, index) => {
    const url = safeUrl(photo.url);
    if (!url) return;

    const card = document.createElement('div');
    card.className = 'g-card';
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', photo.caption || `Foto ${index + 1}`);

    const imageWrap = document.createElement('div');
    imageWrap.className = 'g-card-img-wrap';

    const img = document.createElement('img');
    img.src = url;
    img.alt = photo.caption || `Gallery foto ${index + 1}`;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.addEventListener('error', () => { card.style.display = 'none'; }, { once: true });

    const overlay = document.createElement('div');
    overlay.className = 'g-card-overlay';
    overlay.appendChild(createZoomIcon());

    imageWrap.append(img, overlay);

    if (photo.kategori) {
      const chip = document.createElement('div');
      chip.className = 'g-kat-chip';
      chip.textContent = photo.kategori;
      imageWrap.appendChild(chip);
    }

    card.appendChild(imageWrap);

    if (photo.caption) {
      const caption = document.createElement('div');
      caption.className = 'g-caption';
      caption.textContent = photo.caption;
      card.appendChild(caption);
    }

    card.addEventListener('click', () => openLightbox(index));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(index);
      }
    });

    frag.appendChild(card);
  });

  grid.appendChild(frag);
}

function setActiveCategory(category) {
  filteredPhotos = category === 'Semua' ? allPhotos : allPhotos.filter(photo => photo.kategori === category);
  buildGrid(filteredPhotos);
  document.querySelectorAll('.g-kat-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.kat === category);
  });
}

function buildCategoryFilter(photos) {
  const bar = $('g-kat-bar');
  if (!bar) return;

  const categories = [...new Set(photos.map(photo => photo.kategori).filter(Boolean))];
  clear(bar);

  if (!categories.length) {
    bar.style.display = 'none';
    return;
  }

  bar.style.display = '';
  ['Semua', ...categories].forEach((category, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `g-kat-btn${index === 0 ? ' active' : ''}`;
    button.dataset.kat = category;
    button.textContent = category;
    bar.appendChild(button);
  });

  if (!categoryListenerReady) {
    bar.addEventListener('click', event => {
      const button = event.target.closest('.g-kat-btn');
      if (!button) return;
      setActiveCategory(button.dataset.kat || 'Semua');
    });
    categoryListenerReady = true;
  }
}

async function loadGallery() {
  const grid = $('gallery-full-grid');

  if (!uid) {
    hideSkeleton();
    clear(grid);
    grid?.appendChild(createEmptyState('URL tidak valid atau UID tidak ditemukan.', 'error'));
    return;
  }

  try {
    const snap = await getDoc(doc(db, 'toko', uid));
    if (!snap.exists()) throw new Error('Toko tidak ditemukan.');

    const store = snap.data();
    const isPremium = checkPlan(store) === 'premium';
    const accent = isPremium && store.premium?.accentColor ? store.premium.accentColor : '#FF6B35';
    document.documentElement.style.setProperty('--g-accent', accent);

    if (isPremium && store.premium?.templateBg && safeUrl(store.premium.templateBg)) {
      const bg = document.createElement('div');
      bg.id = 'tpl-bg-layer';
      bg.setAttribute('aria-hidden', 'true');
      bg.style.backgroundImage = `url("${safeUrl(store.premium.templateBg)}")`;
      bg.style.backgroundSize = 'cover';
      bg.style.backgroundPosition = 'center top';
      bg.style.opacity = '.13';
      document.body.prepend(bg);
    }

    const storeName = store.namaToko || 'Toko';
    const nameEl = $('gallery-store-name');
    if (nameEl) nameEl.textContent = storeName;
    document.title = `Gallery — ${storeName}`;

    allPhotos = (Array.isArray(store.gallery) ? store.gallery : [])
      .map(normalizePhoto)
      .filter(photo => safeUrl(photo.url));
    filteredPhotos = allPhotos;

    hideSkeleton();
    clear(grid);

    if (!allPhotos.length) {
      grid?.appendChild(createEmptyState('Gallery belum ada foto'));
      return;
    }

    const badge = $('gallery-topbar-count');
    if (badge) {
      badge.textContent = `${allPhotos.length} foto`;
      badge.style.display = '';
    }

    buildCategoryFilter(allPhotos);
    buildGrid(filteredPhotos);
  } catch (error) {
    hideSkeleton();
    clear(grid);
    grid?.appendChild(createEmptyState(error?.message || 'Gagal memuat gallery.', 'error'));
  }
}

const lightbox = $('glb');
const lightboxImage = $('glb-img');
const lightboxCaption = $('glb-caption');
const lightboxCaptionWrap = $('glb-caption-wrap');
const lightboxCounter = $('glb-counter');
const lightboxDots = $('glb-dots');

function updateLightbox() {
  const photo = filteredPhotos[curIdx];
  if (!photo || !lightboxImage) return;
  lightboxImage.src = safeUrl(photo.url);
  lightboxImage.alt = photo.caption || `Gallery foto ${curIdx + 1}`;
  if (lightboxCaption) lightboxCaption.textContent = photo.caption || '';
  if (lightboxCaptionWrap) lightboxCaptionWrap.style.display = photo.caption ? '' : 'none';
  if (lightboxCounter) lightboxCounter.textContent = `${curIdx + 1} / ${filteredPhotos.length}`;
  lightboxDots?.querySelectorAll('.glb-dot').forEach((dot, index) => {
    dot.classList.toggle('active', index === curIdx);
  });
}

function buildLightboxDots(activeIndex) {
  clear(lightboxDots);
  if (!lightboxDots || filteredPhotos.length <= 1) return;

  filteredPhotos.forEach((_, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `glb-dot${index === activeIndex ? ' active' : ''}`;
    button.dataset.index = String(index);
    button.setAttribute('aria-label', `Foto ${index + 1}`);
    button.addEventListener('click', () => {
      curIdx = index;
      updateLightbox();
    });
    lightboxDots.appendChild(button);
  });
}

function openLightbox(index) {
  if (!filteredPhotos[index] || !lightbox) return;
  curIdx = index;
  buildLightboxDots(index);
  updateLightbox();
  lightbox.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox?.classList.remove('open');
  document.body.style.overflow = '';
}

function previousLightbox() {
  if (!filteredPhotos.length) return;
  curIdx = (curIdx - 1 + filteredPhotos.length) % filteredPhotos.length;
  updateLightbox();
}

function nextLightbox() {
  if (!filteredPhotos.length) return;
  curIdx = (curIdx + 1) % filteredPhotos.length;
  updateLightbox();
}

$('glb-close')?.addEventListener('click', closeLightbox);
$('glb-prev')?.addEventListener('click', event => {
  event.stopPropagation();
  previousLightbox();
});
$('glb-next')?.addEventListener('click', event => {
  event.stopPropagation();
  nextLightbox();
});
lightbox?.addEventListener('click', event => {
  if (event.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', event => {
  if (!lightbox?.classList.contains('open')) return;
  if (event.key === 'Escape') closeLightbox();
  if (event.key === 'ArrowLeft') previousLightbox();
  if (event.key === 'ArrowRight') nextLightbox();
});

let touchX = null;
lightbox?.addEventListener('touchstart', event => {
  touchX = event.touches[0].clientX;
}, { passive: true });
lightbox?.addEventListener('touchend', event => {
  if (touchX === null) return;
  const dx = event.changedTouches[0].clientX - touchX;
  if (Math.abs(dx) > 45) dx < 0 ? nextLightbox() : previousLightbox();
  touchX = null;
});

await loadGallery();
