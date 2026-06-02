/**
 * LINKify — Admin Dashboard (admin.js)
 * FIXES v2:
 *  [SEC-01] Cloudinary: ganti unsigned → signed upload via Cloud Function
 *  [SEC-02] safeImgUrl konsisten di semua img.src
 *  [FIX-01] _submitting / _savingSettings / _savingAccount: flag pindah ke finally
 *  [FIX-02] Interval clock dibersihkan di pagehide (sudah ada, diperkuat)
 *  [FIX-03] Blob URL cleanup konsisten (termasuk saat modal dibuka/tutup)
 *  [FIX-04] loadDashboardStats: gunakan in-memory cache sebelum fetch ulang
 *  [FIX-05] Race condition pada save: disabled flag + finally
 *  [MEM-01] revealObserver dan listener tidak di-attach ulang
 */

import { auth, CONFIG } from '../firebase.js';
import {
  onAuthStateChanged, signOut, updatePassword,
  verifyBeforeUpdateEmail,
  EmailAuthProvider, reauthenticateWithCredential
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  escHtml, checkPremium, checkPlan, hexToRgb, ACCENT_COLORS, DAY_NAMES,
  formatDate, TEMPLATE_LIST, showToast, validateImageFile, sanitizeText, safeUrl,
  safeImgUrl, initOfflineDetection, rateLimit, withTimeout
} from './utils.js';
import { PREMIUM_TEMPLATES, getTemplate, getAllTemplates, getThemePreviewData } from './templates.js';
import { uploadToCloudinary } from './cloudinary-upload.js';
import {
  getProducts as productGetProducts,
  getProduct as productGetProduct,
  createProduct as productCreateProduct,
  updateProduct as productUpdateProduct,
  deleteProduct as productDeleteProduct
} from '../src/services/product.service.js';
import {
  renderAdminProductGrid,
  renderProductSkeleton,
  renderProductEmpty,
  renderProductError
} from '../src/components/admin-product-card.js';
import { validateProductPayload } from '../src/helpers/validators.js';
import { getLastDays, getStatsRange, getTodayStats } from '../src/services/analytics.service.js';
import { renderStatsChart } from '../src/components/admin-stats-chart.js';
import {
  CUSTOM_BUTTON_COLORS,
  renderCustomButtonList
} from '../src/components/custom-button-editor.js';
import {
  normalizeGalleryItem as normalizeGalleryEntry,
  getGalleryKategoriList as getGalleryKategoriEntries,
  renderGalleryEditorGrid
} from '../src/components/gallery-editor.js';
import {
  renderPremiumTemplateOptions,
  renderCancelTemplateButton
} from '../src/components/premium-template-picker.js';
import {
  getToko,
  updateTokoFields,
  updatePremiumAccent,
  updatePremiumBackground,
  updatePremiumTemplate,
  resetPremiumTemplate,
  updateCustomButtons,
  updateGallery
} from '../src/services/toko.service.js';
import {
  setButtonBusy,
  setButtonReady
} from '../src/ui/button-state.js';

// ── CONFIG ─────────────────────────────────────────────────────────────────
const CLOUD_NAME = CONFIG.cloudinary.cloudName;
const BASE_PATH  = window.location.hostname.includes('github.io') ? '/LINKify' : '';

// ── STATE ──────────────────────────────────────────────────────────────────
let currentTokoData  = null;
let currentAccent    = '#FF6B35';
let allProductsCache = [];
let prodBlobUrl      = null;
let logoBlobUrl      = null;
let customBtns       = [];
let galleryPhotos    = [];

// ── PERF UTILS ─────────────────────────────────────────────────────────────
function debounce(fn, delay) {
  let t;
  return function(...args) { clearTimeout(t); t = setTimeout(() => fn.apply(this, args), delay); };
}

// ── DOM ────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const productsList = $('products-list');

// ── CLOCK ──────────────────────────────────────────────────────────────────
function tickClock() {
  const now = new Date();
  const ce  = $('clock-time');
  const de  = $('clock-date');
  if (ce) ce.textContent = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  if (de) de.textContent = now.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
tickClock();
const _clockInterval = setInterval(tickClock, 1000);
// FIX [MEM-01]: cleanup interval di pagehide (bfcache)
window.addEventListener('pagehide', () => clearInterval(_clockInterval), { once: true });

initOfflineDetection();

// ── SIDEBAR ────────────────────────────────────────────────────────────────
const sidebar = $('sidebar');
const overlay = $('overlay');
const menuToggle = $('btn-hamburger');

function setSidebarState(open) {
  sidebar?.classList.toggle('open', open);
  overlay?.classList.toggle('show', open);
  menuToggle?.classList.toggle('is-open', open);
  menuToggle?.setAttribute('aria-expanded', open ? 'true' : 'false');
  document.body.classList.toggle('sidebar-open', open);
}

function openSidebar()  { setSidebarState(true); }
function closeSidebar() { setSidebarState(false); }
function toggleSidebar() { setSidebarState(!sidebar?.classList.contains('open')); }

window.openAdminSidebar = openSidebar;
window.closeAdminSidebar = closeSidebar;
window.toggleAdminSidebar = toggleSidebar;
function syncAdminIdentity(user, toko = {}) {
  const email = user?.email || '';
  const name = sanitizeText(toko?.namaToko || email?.split('@')[0] || 'Demo Account', 80);
  const logo = safeImgUrl(toko?.logo || '') || 'asset/img/icone-admin.jpg';

  const shopName = $('admin-shop-name');
  if (shopName) shopName.textContent = name;

  const mobileAvatar = $('mobile-admin-avatar');
  if (mobileAvatar) {
    mobileAvatar.src = logo;
    mobileAvatar.alt = name ? `Avatar ${name}` : 'Avatar toko';
  }

  const avatarEl = $('sidebar-avatar');
  if (avatarEl) {
    avatarEl.textContent = logo ? '' : (email || 'U').charAt(0).toUpperCase();
    avatarEl.style.backgroundImage = logo ? `url("${logo}")` : '';
    avatarEl.style.backgroundSize = 'cover';
    avatarEl.style.backgroundPosition = 'center';
  }
}
menuToggle?.addEventListener('click', toggleSidebar);
overlay?.addEventListener('click', closeSidebar);
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSidebar(); });

// ── TABS ───────────────────────────────────────────────────────────────────
document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
    document.querySelectorAll(`.tab-btn[data-tab="${btn.dataset.tab}"]`).forEach(b => b.classList.add('active-tab'));
    $('tab-' + btn.dataset.tab)?.classList.add('show');
    closeSidebar();
    if (btn.dataset.tab === 'dashboard') {
      const uid = auth.currentUser?.uid;
      if (uid) loadTodayVisits(uid);
    }
  });
});

// ── COPY LINK ──────────────────────────────────────────────────────────────
$('btn-copy-link')?.addEventListener('click', () => {
  const uid = auth.currentUser?.uid;
  if (!uid) return showToast('Login dulu!', 'error');
  const link = `${window.location.origin}${BASE_PATH}/?uid=${uid}`;
  navigator.clipboard.writeText(link)
    .then(() => showToast('Link toko berhasil dicopy!'))
    .catch(() => showToast('Gagal copy link', 'error'));
});

$('btn-preview-store')?.addEventListener('click', () => {
  const uid = auth.currentUser?.uid;
  if (uid) window.open(`${window.location.origin}${BASE_PATH}/toko.html?uid=${uid}`, '_blank');
});

$('btn-logout')?.addEventListener('click', () => {
  if (confirm('Yakin mau keluar?')) signOut(auth);
});

// ── AUTH ───────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (!user) { window.location.href = 'login-user.html'; return; }

  const tokoData = await withTimeout(
    getToko(user.uid),
    8000,
    'Koneksi timeout. Refresh halaman.'
  );
  if (!tokoData) {
    showToast('Akun ini belum terdaftar sebagai toko! Hubungi admin.', 'error');
    setTimeout(() => signOut(auth), 2000);
    return;
  }

  currentTokoData = tokoData;

  if (currentTokoData.status === 'blokir') {
    showToast('Akun Anda telah dinonaktifkan. Hubungi admin.', 'error');
    setTimeout(() => signOut(auth), 2200);
    return;
  }

  const emailEl  = $('admin-email');
  if (emailEl)  emailEl.textContent  = user.email;
  syncAdminIdentity(user, currentTokoData);
  if ($('inp-new-email')) $('inp-new-email').value = user.email;

  const prodSnap = await productGetProducts(user.uid);

  try {
    await Promise.all([
      _initProducts(user.uid, prodSnap),
      _initSettings(user.uid),
      loadStats(user.uid),
      _initDashboardStats(user.uid, prodSnap),
    ]);
  } catch (e) {
    console.error('Init error:', e);
    showToast('Gagal memuat sebagian data. Coba refresh.', 'error');
  }
});

// ── HELPERS ────────────────────────────────────────────────────────────────
const rupiah    = v => Number(v || 0).toLocaleString('id-ID');

function clearPublicCache(uid) {
  try { localStorage.removeItem(`toko_${uid}`); } catch {}
}

// ── DASHBOARD STATS ────────────────────────────────────────────────────────
function normalizeProductCollection(input) {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (Array.isArray(input.docs)) {
    return input.docs.map(item => ({ id: item.id, ...item.data() }));
  }
  const list = [];
  if (typeof input.forEach === 'function') {
    input.forEach(item => {
      if (item && typeof item.data === 'function') list.push({ id: item.id, ...item.data() });
      else if (item && typeof item === 'object') list.push(item);
    });
  }
  return list;
}

async function _initDashboardStats(uid, prodSnap) {
  try {
    const sourceProducts = normalizeProductCollection(prodSnap);
    let total = 0, emptyCount = 0, omsetEstimasi = 0;
    const prodList = sourceProducts.map(p => {
      total++;
      if (Number(p.stok) === 0) emptyCount++;
      const terjual = Math.max(0, (Number(p.stokAwal) || 0) - (Number(p.stok) || 0));
      omsetEstimasi += terjual * (Number(p.harga) || 0);
      return { ...p, terjual };
    });
    const lowStock = prodList.filter(p => Number(p.stok) > 0 && Number(p.stok) <= 5).sort((a, b) => Number(a.stok) - Number(b.stok));
    const topProds = [...prodList].sort((a, b) => Number(b.terjual) - Number(a.terjual)).slice(0, 5);
    if ($('stat-total')) $('stat-total').textContent = total;
    if ($('stat-empty')) $('stat-empty').textContent = emptyCount;
    if ($('stat-omset')) $('stat-omset').textContent = 'Rp' + rupiah(omsetEstimasi);
    renderLowStockList(lowStock);
    renderTopProducts(topProds);
  } catch (e) { console.error('_initDashboardStats:', e); }
}

async function loadDashboardStats(uid) {
  try {
    const products = await productGetProducts(uid);
    await _initDashboardStats(uid, products);
  } catch (e) { console.error('loadDashboardStats:', e); }
}

function renderEmptyActivity(el, message) {
  el.replaceChildren();
  const div = document.createElement('div');
  div.style.cssText = 'padding:18px;text-align:center;font-size:13px;color:var(--text-3);';
  div.textContent = message;
  el.appendChild(div);
}

function renderLowStockList(items) {
  const el = $('low-stock-list');
  if (!el) return;
  if (!items.length) {
    renderEmptyActivity(el, 'Semua stok aman');
    return;
  }
  const frag = document.createDocumentFragment();
  items.forEach((p, i) => {
    const stock = Number(p.stok) || 0;
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.style.borderBottom = i < items.length - 1 ? '1px solid var(--border)' : 'none';

    const dot = document.createElement('div');
    dot.className = 'activity-dot';
    dot.style.background = stock === 1 ? '#EF4444' : '#F59E0B';

    const text = document.createElement('div');
    text.className = 'activity-text';

    const strong = document.createElement('strong');
    strong.textContent = p.nama || 'Produk';
    text.appendChild(strong);
    text.appendChild(document.createTextNode(' — Stok: '));

    const stockText = document.createElement('span');
    stockText.style.color = stock <= 2 ? 'var(--danger)' : 'var(--warning)';
    stockText.style.fontWeight = '700';
    stockText.textContent = String(stock);
    text.appendChild(stockText);

    if (p.kategori) {
      const category = document.createElement('span');
      category.style.color = 'var(--text-3)';
      category.style.fontSize = '11px';
      category.textContent = ` · ${p.kategori}`;
      text.appendChild(category);
    }

    const time = document.createElement('div');
    time.className = 'activity-time';
    time.style.color = stock <= 2 ? 'var(--danger)' : 'var(--warning)';
    time.style.fontWeight = '700';
    time.textContent = `${stock} sisa`;

    div.append(dot, text, time);
    frag.appendChild(div);
  });
  el.replaceChildren(frag);
}

function renderTopProducts(items) {
  const el = $('top-products-list');
  if (!el) return;
  const hasTerjual = items.some(p => p.terjual > 0);
  if (!items.length || !hasTerjual) {
    renderEmptyActivity(el, 'Isi stok awal produk untuk melihat terlaris');
    return;
  }
  const maxTerjual = Math.max(...items.map(p => Number(p.terjual) || 0), 1);
  const filtered = items.filter(p => Number(p.terjual) > 0);
  const frag = document.createDocumentFragment();

  filtered.forEach((p, i) => {
    const sold = Number(p.terjual) || 0;
    const div = document.createElement('div');
    div.className = 'activity-item';
    div.style.cssText = `flex-direction:column;align-items:stretch;gap:6px;padding:13px 16px;border-bottom:${i < filtered.length - 1 ? '1px solid var(--border)' : 'none'}`;

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;';

    const name = document.createElement('span');
    name.style.cssText = 'font-size:13px;font-weight:600;color:var(--text)';
    name.textContent = p.nama || 'Produk';

    const soldText = document.createElement('span');
    soldText.style.cssText = 'font-size:12px;font-weight:700;color:var(--accent)';
    soldText.textContent = `${sold} terjual`;

    const barWrap = document.createElement('div');
    barWrap.className = 'progress-bar-wrap';

    const bar = document.createElement('div');
    bar.className = 'progress-bar-fill';
    bar.style.width = `${Math.round(sold / maxTerjual * 100)}%`;

    row.append(name, soldText);
    barWrap.appendChild(bar);
    div.append(row, barWrap);
    frag.appendChild(div);
  });

  el.replaceChildren(frag);
}

// ── TODAY VISITS ───────────────────────────────────────────────────────────
async function loadTodayVisits(uid) {
  try {
    const todayStats = await getTodayStats(uid);
    if ($('stat-visits-dash')) $('stat-visits-dash').textContent = todayStats.visits || 0;
  } catch { if ($('stat-visits-dash')) $('stat-visits-dash').textContent = '—'; }
}

// ── PRODUCTS ───────────────────────────────────────────────────────────────
async function _initProducts(uid, prodSnap) {
  if (!productsList) return;
  renderProductSkeleton(productsList, 3);
  try {
    allProductsCache = Array.isArray(prodSnap) ? prodSnap : [];
    renderProductGrid(allProductsCache, uid);
    const lbl = $('prod-count-label');
    if (lbl) lbl.textContent = allProductsCache.length + ' produk terdaftar';
  } catch {
    renderProductError(productsList, 'Gagal memuat produk. Coba refresh halaman.');
  }
}

async function loadProducts(uid) {
  if (!productsList) return;
  renderProductSkeleton(productsList, 3);
  try {
    allProductsCache = await productGetProducts(uid);
    renderProductGrid(allProductsCache, uid);
    const lbl = $('prod-count-label');
    if (lbl) lbl.textContent = allProductsCache.length + ' produk terdaftar';
  } catch {
    renderProductError(productsList, 'Gagal memuat produk. Coba refresh halaman.');
  }
}

function renderProductGrid(list, uid) {
  if (!productsList) return;
  if (!list.length) {
    renderProductEmpty(productsList);
    return;
  }
  renderAdminProductGrid(productsList, list, {
    formatPrice: rupiah,
    safeImgUrl,
  });
}

window.filterProducts = function() {
  const uid  = auth.currentUser?.uid;
  if (!uid) return;
  const q    = ($('prod-search')?.value || '').toLowerCase().trim();
  const kat  = $('prod-filter-kat')?.value  || '';
  const stok = $('prod-filter-stok')?.value || '';
  const filtered = allProductsCache.filter(p => {
    const mText = !q || (p.nama || '').toLowerCase().includes(q) || (p.deskripsi || '').toLowerCase().includes(q);
    const mKat  = !kat  || p.kategori === kat;
    const mStok = !stok || (stok === 'habis' ? Number(p.stok) === 0 : Number(p.stok) > 0);
    return mText && mKat && mStok;
  });
  renderProductGrid(filtered, uid);
  const lbl = $('prod-count-label');
  if (lbl) lbl.textContent = `${filtered.length} dari ${allProductsCache.length} produk`;
};
window.debouncedFilter = debounce(window.filterProducts, 300);

productsList?.addEventListener('click', async e => {
  const btn = e.target.closest('[data-id]');
  if (!btn) return;
  const id  = btn.dataset.id;
  const uid = auth.currentUser?.uid;
  if (!id || !uid) return;

  if (btn.classList.contains('btn-ed')) {
    try {
      const p = await productGetProduct(uid, id);
      if (!p) { showToast('Produk tidak ditemukan', 'error'); return; }
      $('inp-prod-id').value         = id;
      $('inp-prod-name').value        = p.nama       || '';
      $('inp-prod-price').value       = p.harga      || 0;
      $('inp-prod-stock').value       = p.stok       || 0;
      $('inp-prod-weight').value      = p.berat      || 0;
      $('inp-prod-desc').value        = p.deskripsi  || '';
      $('inp-prod-shopee').value      = p.shopee     || '';
      $('inp-prod-wa').value          = p.wa         || '';
      $('inp-prod-img').value         = p.img        || '';
      $('inp-prod-kategori').value    = p.kategori   || '';
      $('inp-prod-harga-asli').value  = p.hargaAsli  || '';
      $('inp-prod-unggulan').checked  = !!p.unggulan;
      $('inp-prod-file').value        = '';
      // FIX [MEM-01]: revoke blob sebelum ganti
      if (prodBlobUrl) { URL.revokeObjectURL(prodBlobUrl); prodBlobUrl = null; }
      if (p.img) {
        const safeImg = safeImgUrl(p.img);
        if ($('img-preview')) $('img-preview').src = safeImg || 'https://placehold.co/200x200/111/333?text=Foto';
        if ($('img-preview-wrap')) $('img-preview-wrap').style.display = 'block';
      } else {
        if ($('img-preview-wrap')) $('img-preview-wrap').style.display = 'none';
      }
      if ($('modal-title')) $('modal-title').textContent = 'Edit Produk';
      openModal();
    } catch (err) { showToast('Gagal load: ' + err.message, 'error'); }
  }

  if (btn.classList.contains('btn-del')) {
    if (!confirm('Yakin hapus produk "' + (allProductsCache.find(p => p.id === id)?.nama || 'ini') + '"?')) return;
    try {
      await productDeleteProduct(uid, id);
      showToast('Produk dihapus.');
      clearPublicCache(uid);
      await loadProducts(uid);
      await loadDashboardStats(uid);
    } catch (err) { showToast('Gagal hapus: ' + err.message, 'error'); }
  }
});

// ── MODAL ──────────────────────────────────────────────────────────────────
const productModal = $('product-modal');
function openModal()  {
  productModal?.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal() {
  productModal?.classList.remove('open');
  document.body.style.overflow = '';
  // FIX [MEM-01]: revoke blob saat modal ditutup
  if (prodBlobUrl) { URL.revokeObjectURL(prodBlobUrl); prodBlobUrl = null; }
}

$('btn-add-product')?.addEventListener('click', () => {
  $('product-form')?.reset();
  ['inp-prod-id','inp-prod-img','inp-prod-file','inp-prod-kategori','inp-prod-harga-asli'].forEach(id => {
    const el = $(id); if (el) el.value = '';
  });
  if ($('inp-prod-unggulan')) $('inp-prod-unggulan').checked = false;
  if (prodBlobUrl) { URL.revokeObjectURL(prodBlobUrl); prodBlobUrl = null; }
  if ($('img-preview-wrap')) $('img-preview-wrap').style.display = 'none';
  if ($('img-preview')) $('img-preview').src = '';
  if ($('modal-title')) $('modal-title').textContent = 'Tambah Produk Baru';
  openModal();
});

$('modal-pull')?.addEventListener('click', closeModal);
productModal?.addEventListener('click', e => { if (e.target === productModal) closeModal(); });

$('upload-zone')?.addEventListener('click', () => $('inp-prod-file')?.click());
$('inp-prod-file')?.addEventListener('change', () => {
  const file = $('inp-prod-file').files[0];
  if (!file) return;
  const check = validateImageFile(file);
  if (!check.ok) { showToast(check.reason, 'warn'); $('inp-prod-file').value = ''; return; }
  if (prodBlobUrl) URL.revokeObjectURL(prodBlobUrl);
  prodBlobUrl = URL.createObjectURL(file);
  if ($('img-preview')) $('img-preview').src = prodBlobUrl;
  if ($('img-preview-wrap')) $('img-preview-wrap').style.display = 'block';
});

// FIX [FIX-01]: _submitting reset di finally (bukan hanya di catch)
let _submitting = false;
$('product-form')?.addEventListener('submit', async e => {
  e.preventDefault();
  if (_submitting) return;
  _submitting = true;

  const uid    = auth.currentUser?.uid;
  const id     = $('inp-prod-id').value;
  const file   = $('inp-prod-file').files[0];
  let imgUrl   = $('inp-prod-img').value;
  const saveBtn = $('btn-save-product');

  if (!file && !imgUrl) { showToast('Pilih foto produk!', 'warn'); _submitting = false; return; }

  if (saveBtn) saveBtn.disabled = true;
  try {
    if (file) {
      setButtonBusy(saveBtn, 'Upload foto...');
      // FIX [SEC-01]: Gunakan signed upload
      imgUrl = await uploadToCloudinary(file, CLOUD_NAME);
      if (!imgUrl) throw new Error('Upload foto gagal.');
    }
    setButtonBusy(saveBtn, 'Menyimpan...');

    const stok = Number($('inp-prod-stock').value);
    const rawData = {
      nama:      $('inp-prod-name').value.trim(),
      harga:     Number($('inp-prod-price').value),
      stok,
      berat:     Number($('inp-prod-weight').value) || 0,
      deskripsi: $('inp-prod-desc').value.trim(),
      shopee:    $('inp-prod-shopee').value.trim(),
      wa:        $('inp-prod-wa').value.trim(),
      img:       imgUrl,
      kategori:  $('inp-prod-kategori').value,
      hargaAsli: Number($('inp-prod-harga-asli').value) || 0,
      unggulan:  $('inp-prod-unggulan').checked,
    };
    validateProductPayload(rawData);
    const data = { ...rawData, updatedAt: serverTimestamp() };
    if (id) {
      const existingProd = allProductsCache.find(p => p.id === id);
      if (existingProd && stok > Number(existingProd.stok)) {
        const diff = stok - Number(existingProd.stok);
        data.stokAwal = (Number(existingProd.stokAwal) || Number(existingProd.stok)) + diff;
      }
      await productUpdateProduct(uid, id, data);
      showToast('Produk diperbarui!');
    } else {
      data.createdAt = serverTimestamp();
      data.stokAwal  = stok;
      await productCreateProduct(uid, data);
      showToast('Produk ditambahkan!');
    }
    clearPublicCache(uid);
    closeModal();
    await loadProducts(uid);
    await loadDashboardStats(uid);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    // FIX [FIX-01]: selalu reset flag + button di finally
    _submitting = false;
    if (saveBtn) {
      saveBtn.disabled = false;
      setButtonReady(saveBtn, 'Simpan Produk');
    }
  }
});

// ── VALIDATION ─────────────────────────────────────────────────────────────
function validateProduct(data) {
  return validateProductPayload(data);
}

// ── SETTINGS ───────────────────────────────────────────────────────────────
async function _initSettings(uid) {
  try {
    const s = currentTokoData;
    if (!s) return;
    $('inp-username').value  = s.namaToko  || '';
    $('inp-bio').value       = s.bio       || '';
    $('inp-wa').value        = s.wa        || '';
    $('inp-shopee').value    = s.shopee    || '';
    $('inp-tokopedia').value = s.tokopedia || '';
    $('inp-instagram').value = s.instagram || '';
    $('inp-tiktok').value    = s.tiktok    || '';
    $('inp-twitter').value   = s.twitter   || '';
    $('inp-facebook').value  = s.facebook  || '';
    $('inp-youtube').value   = s.youtube   || '';
    $('inp-logo-url').value  = s.logo      || '';
    if (s.logo) {
      const lp = $('logo-preview');
      if (lp) {
        lp.src = safeImgUrl(s.logo) || 'https://placehold.co/200x200/F3F4F6/999?text=Logo';
        lp.onerror = () => { lp.src = 'https://placehold.co/200x200/F3F4F6/999?text=Logo'; };
      }
    }
    syncAdminIdentity(auth.currentUser, s);
    updatePremiumUI();
    await loadTodayVisits(uid);
  } catch (e) { console.error('_initSettings:', e); }
}

$('btn-logo-pick')?.addEventListener('click', () => $('inp-logo-file')?.click());
$('inp-logo-file')?.addEventListener('change', () => {
  const file = $('inp-logo-file').files[0];
  if (!file) return;
  const check = validateImageFile(file);
  if (!check.ok) { showToast(check.reason, 'warn'); $('inp-logo-file').value = ''; return; }
  if (logoBlobUrl) URL.revokeObjectURL(logoBlobUrl);
  logoBlobUrl = URL.createObjectURL(file);
  if ($('logo-preview')) $('logo-preview').src = logoBlobUrl;
  const mobileAvatar = $('mobile-admin-avatar');
  if (mobileAvatar) mobileAvatar.src = logoBlobUrl;
  const sidebarAvatar = $('sidebar-avatar');
  if (sidebarAvatar) {
    sidebarAvatar.textContent = '';
    sidebarAvatar.style.backgroundImage = `url("${logoBlobUrl}")`;
  }
});

// FIX [FIX-01]: flag di finally
let _savingSettings = false;
$('btn-save-settings')?.addEventListener('click', async () => {
  if (_savingSettings) return;
  _savingSettings = true;
  const uid = auth.currentUser?.uid;
  const btn = $('btn-save-settings');
  setButtonBusy(btn, 'Menyimpan...');
  try {
    let logoUrl = $('inp-logo-url').value;
    const file  = $('inp-logo-file').files[0];
    if (file) {
      // FIX [SEC-01]: signed upload
      logoUrl = await uploadToCloudinary(file, CLOUD_NAME);
      if (!logoUrl) throw new Error('Upload logo gagal.');
      if ($('inp-logo-url')) $('inp-logo-url').value = logoUrl;
      // FIX [MEM-01]: revoke blob setelah upload sukses
      if (logoBlobUrl) { URL.revokeObjectURL(logoBlobUrl); logoBlobUrl = null; }
    }
    const updateData = {
      namaToko:  sanitizeText($('inp-username').value, 100),
      bio:       sanitizeText($('inp-bio').value, 200),
      wa:        $('inp-wa').value.trim()        ? safeUrl($('inp-wa').value.trim())        : '',
      shopee:    $('inp-shopee').value.trim()    ? safeUrl($('inp-shopee').value.trim())    : '',
      tokopedia: $('inp-tokopedia').value.trim() ? safeUrl($('inp-tokopedia').value.trim()) : '',
      instagram: $('inp-instagram').value.trim() ? safeUrl($('inp-instagram').value.trim()) : '',
      tiktok:    $('inp-tiktok').value.trim()    ? safeUrl($('inp-tiktok').value.trim())    : '',
      twitter:   $('inp-twitter').value.trim()   ? safeUrl($('inp-twitter').value.trim())   : '',
      facebook:  $('inp-facebook').value.trim()  ? safeUrl($('inp-facebook').value.trim())  : '',
      youtube:   $('inp-youtube').value.trim()   ? safeUrl($('inp-youtube').value.trim())   : '',
      logo:      logoUrl,
    };
    await updateTokoFields(uid, updateData);
    clearPublicCache(uid);
    currentTokoData = { ...currentTokoData, ...updateData };
    syncAdminIdentity(auth.currentUser, currentTokoData);
    showToast('Pengaturan disimpan!');
  } catch (err) { showToast('Gagal: ' + err.message, 'error'); }
  finally {
    _savingSettings = false;
    if (btn) {
      btn.disabled = false;
      setButtonReady(btn, 'Simpan Pengaturan');
    }
  }
});

// ── AKUN ───────────────────────────────────────────────────────────────────
let _savingAccount = false;
$('btn-save-account')?.addEventListener('click', async () => {
  if (_savingAccount) return;
  const newEmail = $('inp-new-email')?.value.trim();
  const newPass  = $('inp-new-pass')?.value;
  const oldPass  = $('inp-old-pass')?.value;
  const user     = auth.currentUser;
  if (!oldPass) { showToast('Masukkan password lama!', 'warn'); return; }
  if (newEmail === user.email && !newPass) { showToast('Tidak ada perubahan.', 'warn'); return; }

  _savingAccount = true;
  const btn = $('btn-save-account');
  setButtonBusy(btn, 'Memverifikasi...');
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, oldPass));
    if (newEmail !== user.email) {
      if (!newEmail.includes('@')) throw new Error('Format email tidak valid!');
      await verifyBeforeUpdateEmail(user, newEmail);
      showToast('Email verifikasi dikirim ke alamat baru. Cek inbox & spam!', 'info');
    }
    if (newPass) {
      if (newPass.length < 6) throw new Error('Password minimal 6 karakter!');
      await updatePassword(user, newPass);
      showToast('Password diperbarui! Keluar otomatis...', 'success');
      setTimeout(() => signOut(auth), 1800);
      return;
    }
  } catch (err) {
    const errMap = {
      'auth/wrong-password':       'Password lama salah!',
      'auth/invalid-credential':   'Password lama salah!',
      'auth/email-already-in-use': 'Email ini sudah digunakan akun lain!',
      'auth/invalid-email':        'Format email tidak valid!',
      'auth/requires-recent-login':'Sesi habis, harap keluar lalu login ulang.',
      'auth/too-many-requests':    'Terlalu banyak percobaan. Coba lagi nanti.',
    };
    showToast(errMap[err.code] || err.message, 'error');
  } finally {
    _savingAccount = false;
    if (btn) {
      btn.disabled = false;
      setButtonReady(btn, 'Perbarui Akun');
    }
  }
});

// ── PLAN UI ──────────────────────────────────────────────────────────────────
function updatePremiumUI() {
  const plan    = checkPlan(currentTokoData);
  const isPrem  = plan === 'premium';
  const isBasic = plan === 'basic' || plan === 'premium';

  const planBadgeEl = $('current-plan-badge');
  if (planBadgeEl) {
    if (plan === 'premium') {
      planBadgeEl.textContent = '⚡ Premium';
      planBadgeEl.style.cssText = 'display:inline-flex;align-items:center;gap:5px;background:rgba(255,107,53,0.15);border:1px solid rgba(255,107,53,0.3);color:#FF6B35;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;';
    } else if (plan === 'basic') {
      planBadgeEl.textContent = '● Basic';
      planBadgeEl.style.cssText = 'display:inline-flex;align-items:center;gap:5px;background:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);color:#3B82F6;font-size:11px;font-weight:700;padding:3px 10px;border-radius:99px;';
    } else {
      planBadgeEl.textContent = 'Gratis';
      planBadgeEl.style.cssText = 'display:inline-flex;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);color:#9CA3AF;font-size:11px;font-weight:600;padding:3px 10px;border-radius:99px;';
    }
  }

  $('premium-cta')?.classList.toggle('hidden', isBasic);
  $('premium-content')?.classList.toggle('hidden', !isBasic);
  $('plan-info-section')?.classList.toggle('hidden', !isBasic);
  document.querySelectorAll('.prem-only').forEach(el => el.classList.toggle('hidden', !isPrem));

  const planEndDate = currentTokoData.planEndDate || currentTokoData.premium?.endDate;
  if (planEndDate) {
    const end   = planEndDate?.toDate ? planEndDate.toDate() : new Date(planEndDate);
    const label = end.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const exEl  = $('premium-expiry');
    if (exEl) {
      exEl.textContent = '';
      const planName = plan === 'premium' ? 'Premium' : 'Basic';
      const strong = document.createElement('strong');
      strong.textContent = label;
      exEl.append(`Paket ${planName} aktif sampai `);
      exEl.appendChild(strong);
    }
  }

  if (isBasic) renderGalleryEditor();
  if (isPrem) {
    currentAccent = currentTokoData.premium?.accentColor || '#FF6B35';
    const slugEl  = $('inp-custom-slug');
    if (slugEl) slugEl.value = currentTokoData.premium?.slug || auth.currentUser?.uid || '';
    renderColorPicker();
    renderQR();
    renderPremiumTemplatePicker();
    initBackgroundStudio();
    renderCustomButtonEditor();
  }
}

// ── STATS ─────────────────────────────────────────────────────────────────
async function loadStats(uid) {
  const isPrem = checkPlan(currentTokoData) === 'premium';
  if (!isPrem) return;
  try {
    const days = getLastDays(7);
    const stats = await getStatsRange(uid, days);
    let tV = 0, tW = 0, tS = 0;
    const chartData = stats.map(item => {
      tV += Number(item.visits) || 0;
      tW += Number(item.waClicks) || 0;
      tS += Number(item.shopeeClicks) || 0;
      return { label: formatDate(item.id), visits: Number(item.visits) || 0 };
    });
    if ($('stat-visits')) $('stat-visits').textContent = tV;
    if ($('stat-wa'))     $('stat-wa').textContent     = tW;
    if ($('stat-shopee')) $('stat-shopee').textContent = tS;
    renderStatsChart($('stats-chart'), chartData);
  } catch (e) { console.error('loadStats:', e); }
}

// ── COLOR PICKER ──────────────────────────────────────────────────────────
let _colorPickerDelegated = false;
function renderColorPicker() {
  const wrap = $('color-options');
  if (!wrap) return;
  const frag = document.createDocumentFragment();
  ACCENT_COLORS.forEach(clr => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `color-circle${clr.hex === currentAccent ? ' active' : ''}`;
    btn.dataset.color = clr.hex;
    btn.style.background = clr.hex;
    btn.title = clr.label;
    btn.setAttribute('aria-label', `Warna ${clr.label}`);
    frag.appendChild(btn);
  });
  wrap.replaceChildren(frag);
  if (!_colorPickerDelegated) {
    _colorPickerDelegated = true;
    wrap.addEventListener('click', async e => {
      const btn   = e.target.closest('.color-circle');
      if (!btn) return;
      const color = btn.dataset.color;
      wrap.querySelectorAll('.color-circle').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentAccent = color;
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      try {
        await updatePremiumAccent(uid, color);
        clearPublicCache(uid);
        showToast('Warna aksen diperbarui!');
      } catch { showToast('Gagal simpan warna', 'error'); }
    });
  }
}

// ── QR CODE ───────────────────────────────────────────────────────────────
function renderQR() {
  const uid = auth.currentUser?.uid;
  const img = $('qr-img');
  if (!uid || !img) return;
  const url = `${window.location.origin}${BASE_PATH}/?uid=${uid}`;
  const hex = encodeURIComponent(currentAccent.replace('#', ''));
  img.src         = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(url)}&color=${hex}`;
  img.dataset.url = `https://api.qrserver.com/v1/create-qr-code/?size=512x512&data=${encodeURIComponent(url)}&color=${hex}&format=png`;
}

$('btn-download-qr')?.addEventListener('click', async () => {
  const url = $('qr-img')?.dataset.url;
  if (!url) return;
  try {
    const res  = await fetch(url);
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `qr-${currentTokoData?.namaToko || 'toko'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
    showToast('QR Code didownload!');
  } catch { window.open($('qr-img')?.dataset.url, '_blank'); }
});

// ── BACKGROUND STUDIO ─────────────────────────────────────────────────────
let _premTplDelegated = false;
let _bgStudioInited   = false;
let _pendingBgUrl     = null;
let _pendingBgType    = null;
let _savedBgUrl       = '';
let _savingBgNow      = false;

function initBackgroundStudio() {
  _savedBgUrl    = currentTokoData?.premium?.templateBg || '';
  _pendingBgUrl  = null;
  _pendingBgType = null;

  if (!_bgStudioInited) {
    _bgStudioInited = true;
    document.querySelectorAll('#bg-tab-bar .bg-tab').forEach(btn => {
      btn.addEventListener('click', () => bgSwitchTab(btn.dataset.bgtab));
    });
    const zone    = $('bg-upload-zone');
    const fileInp = $('inp-bg-file');
    if (zone && fileInp) {
      zone.addEventListener('click', () => fileInp.click());
      zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; zone.style.background = 'rgba(255,107,53,0.06)'; });
      zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; zone.style.background = ''; });
      zone.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor = ''; zone.style.background = ''; const f = e.dataTransfer.files[0]; if (f) bgHandleUpload(f); });
      fileInp.addEventListener('change', () => { const f = fileInp.files[0]; if (f) bgHandleUpload(f); fileInp.value = ''; });
    }
    $('btn-remove-bg')?.addEventListener('click', () => bgSetPending('', 'none', 'Polos (tanpa background)'));
    $('btn-save-bg')?.addEventListener('click', bgSave);
    $('btn-cancel-bg')?.addEventListener('click', bgCancel);
  }
  bgSwitchTab('preset');
  bgUpdatePreview(_savedBgUrl);
  bgUpdateBar(false);
}

function bgSwitchTab(tabId) {
  document.querySelectorAll('#bg-tab-bar .bg-tab').forEach(btn => {
    const active = btn.dataset.bgtab === tabId;
    btn.style.color        = active ? 'var(--text)' : 'var(--text-3)';
    btn.style.borderBottom = active ? '2px solid var(--accent)' : '2px solid transparent';
  });
  ['preset','upload','gallery','none'].forEach(id => {
    const p = $('bgtab-' + id);
    if (p) p.style.display = id === tabId ? 'block' : 'none';
  });
  if (tabId === 'preset')  bgRenderPreset();
  if (tabId === 'gallery') bgRenderGallery();
  if (tabId === 'upload')  { const st = $('bg-upload-status'); if (st) { st.textContent = ''; st.style.color = 'var(--text-3)'; } }
}

function bgRenderPreset() {
  const wrap = $('template-options');
  if (!wrap) return;
  const activeBg = (_pendingBgType && _pendingBgType !== 'none')
    ? (_pendingBgUrl || '')
    : (_pendingBgType === 'none' ? '__none__' : _savedBgUrl);
  wrap.textContent = '';
  const frag = document.createDocumentFragment();
  TEMPLATE_LIST.forEach(t => {
    const bgKey    = t.bg || '';
    const isActive = bgKey ? bgKey === activeBg : (activeBg === '' || activeBg === undefined);
    const card = document.createElement('div');
    card.style.cssText = `cursor:pointer;border-radius:10px;overflow:hidden;border:2px solid ${isActive ? 'var(--accent)' : 'var(--border)'};transition:border-color .18s,transform .18s;`;
    const thumb = document.createElement('div');
    thumb.style.cssText = `position:relative;height:72px;overflow:hidden;background:${bgKey ? 'transparent' : t.preview};`;
    if (bgKey) {
      const img = document.createElement('img');
      img.src = bgKey; img.alt = t.label; img.loading = 'lazy'; img.decoding = 'async';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
      img.onerror = () => { img.style.display = 'none'; };
      thumb.appendChild(img);
    }
    const ov2 = document.createElement('div');
    ov2.style.cssText = 'position:absolute;inset:0;background:rgba(0,0,0,.38);';
    thumb.appendChild(ov2);
    const mock = document.createElement('div');
    mock.style.cssText = 'position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;';
    const avatar = document.createElement('div');
    avatar.style.cssText = 'width:14px;height:14px;border-radius:50%;background:rgba(255,255,255,.3);border:1.5px solid rgba(255,255,255,.6);';
    const primaryLine = document.createElement('div');
    primaryLine.style.cssText = `height:3px;width:36px;background:${t.accent};border-radius:3px;opacity:.9;`;
    const secondaryLine = document.createElement('div');
    secondaryLine.style.cssText = 'height:3px;width:24px;background:rgba(255,255,255,.25);border-radius:3px;';
    mock.append(avatar, primaryLine, secondaryLine);
    thumb.appendChild(mock);
    if (isActive) { const badge = document.createElement('div'); badge.style.cssText = 'position:absolute;top:4px;right:4px;background:var(--accent);color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;letter-spacing:.5px;'; badge.textContent = 'AKTIF'; thumb.appendChild(badge); }
    const lbl = document.createElement('div'); lbl.style.cssText = 'padding:6px 8px 8px;';
    const n = document.createElement('div'); n.style.cssText = 'font-size:11px;font-weight:700;color:var(--text);line-height:1.2;'; n.textContent = t.label;
    const d = document.createElement('div'); d.style.cssText = 'font-size:10px;color:var(--text-3);margin-top:1px;'; d.textContent = t.desc;
    lbl.append(n, d); card.append(thumb, lbl);
    card.addEventListener('click', () => { bgSetPending(bgKey, 'preset', t.label); bgRenderPreset(); });
    frag.appendChild(card);
  });
  wrap.appendChild(frag);
}

function bgRenderGallery() {
  const wrap = $('bg-from-gallery');
  if (!wrap) return;
  const raw    = currentTokoData?.gallery || [];
  const photos = raw.map(p => typeof p === 'string' ? { url: p, caption: '' } : p).filter(p => p?.url && /^https?:\/\//i.test(p.url));
  wrap.textContent = '';
  if (!photos.length) {
    const msg = document.createElement('div');
    msg.style.cssText = 'grid-column:1/-1;padding:24px;text-align:center;font-size:12px;color:var(--text-3);line-height:1.6;';
    msg.textContent = 'Belum ada foto di Gallery. Tambahkan dulu di tab Gallery Foto.';
    wrap.appendChild(msg); return;
  }
  const activeBg = _pendingBgType === 'gallery' ? (_pendingBgUrl || '') : _savedBgUrl;
  const frag     = document.createDocumentFragment();
  photos.forEach((p, i) => {
    const isActive = p.url === activeBg;
    const card = document.createElement('div');
    card.style.cssText = `aspect-ratio:1;border-radius:10px;overflow:hidden;cursor:pointer;border:2px solid ${isActive ? 'var(--accent)' : 'transparent'};transition:border-color .18s;position:relative;`;
    const img = document.createElement('img');
    img.src = safeImgUrl(p.url) || 'https://placehold.co/200x200/111/333?text=Error'; img.alt = p.caption || `Foto ${i + 1}`;
    img.loading = 'lazy'; img.decoding = 'async'; img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    img.onerror = function() { this.onerror = null; this.src = 'https://placehold.co/200x200/111/333?text=Error'; };
    card.appendChild(img);
    if (isActive) { const badge = document.createElement('div'); badge.style.cssText = 'position:absolute;top:4px;right:4px;background:var(--accent);color:#fff;font-size:9px;font-weight:800;padding:2px 6px;border-radius:99px;pointer-events:none;'; badge.textContent = 'AKTIF'; card.appendChild(badge); }
    card.addEventListener('click', () => { bgSetPending(p.url, 'gallery', p.caption || `Foto ${i + 1}`); bgRenderGallery(); });
    frag.appendChild(card);
  });
  wrap.appendChild(frag);
}

async function bgHandleUpload(file) {
  const check = validateImageFile(file);
  if (!check.ok) { showToast(check.reason, 'warn'); return; }
  const status = $('bg-upload-status');
  const zone   = $('bg-upload-zone');
  if (status) { status.textContent = '⏳ Mengupload...'; status.style.color = 'var(--accent)'; }
  if (zone)   { zone.style.opacity = '0.5'; zone.style.pointerEvents = 'none'; }
  try {
    // FIX [SEC-01]: signed upload
    const url = await uploadToCloudinary(file, CLOUD_NAME);
    if (!url) throw new Error('Upload gagal.');
    bgSetPending(url, 'upload', 'Foto Upload');
    if (status) { status.textContent = '✓ Upload berhasil! Klik Simpan Background.'; status.style.color = '#10B981'; }
  } catch (e) {
    if (status) { status.textContent = '✗ ' + (e.message || 'Upload gagal'); status.style.color = 'var(--danger)'; }
  } finally {
    if (zone) { zone.style.opacity = ''; zone.style.pointerEvents = ''; }
  }
}

function bgSetPending(url, type, label) { _pendingBgUrl = url; _pendingBgType = type; bgUpdatePreview(url); bgUpdateBar(true, label); }
function bgUpdatePreview(url) {
  const el = $('bg-preview-img');
  if (!el) return;
  if (url && /^https?:\/\//i.test(url)) { el.style.backgroundImage = `url('${encodeURI(url)}')`; el.style.opacity = '1'; }
  else { el.style.backgroundImage = 'none'; el.style.opacity = '0'; }
}
function bgUpdateBar(hasPending, label) {
  const info    = $('bg-selected-info');
  const saveBtn = $('btn-save-bg');
  const canBtn  = $('btn-cancel-bg');
  if (hasPending) {
    if (info)    info.textContent = `Dipilih: ${label || '—'}`;
    if (saveBtn) saveBtn.disabled = false;
    if (canBtn)  canBtn.style.display = '';
  } else {
    if (info)    info.textContent = _savedBgUrl ? '✓ Background terpasang' : 'Belum ada background';
    if (saveBtn) saveBtn.disabled = true;
    if (canBtn)  canBtn.style.display = 'none';
  }
}
function bgCancel() { _pendingBgUrl = null; _pendingBgType = null; bgUpdatePreview(_savedBgUrl); bgUpdateBar(false); bgRenderPreset(); showToast('Perubahan dibatalkan.', 'info'); }

async function bgSave() {
  if (_savingBgNow || _pendingBgType === null) return;
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  _savingBgNow = true;
  const saveBtn = $('btn-save-bg');
  const canBtn  = $('btn-cancel-bg');
  const ICON    = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="14" height="14"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg>';
  setButtonBusy(saveBtn, 'Menyimpan...');
  if (canBtn)  canBtn.disabled = true;
  try {
    const bgUrl = _pendingBgType === 'none' ? '' : (_pendingBgUrl || '');
    await updatePremiumBackground(uid, bgUrl);
    if (!currentTokoData.premium) currentTokoData.premium = {};
    currentTokoData.premium.templateBg = bgUrl;
    _savedBgUrl = bgUrl; _pendingBgUrl = null; _pendingBgType = null;
    clearPublicCache(uid);
    bgUpdatePreview(bgUrl); bgUpdateBar(false); bgRenderPreset();
    showToast(bgUrl ? 'Background disimpan!' : 'Background dihapus!', 'success');
  } catch (e) { showToast('Gagal simpan: ' + e.message, 'error'); }
  finally { _savingBgNow = false; setButtonReady(saveBtn, 'Simpan Background'); if (canBtn) canBtn.disabled = false; }
}

// Legacy aliases
function renderPresetCards()    { bgRenderPreset(); }
function renderTemplatePicker() { bgRenderPreset(); }
function updateLivePreview(url) { bgUpdatePreview(url); }
function updateBgSaveBar(p, l)  { bgUpdateBar(p, l); }
function renderBgGalleryPicker(){ bgRenderGallery(); }

// ── PREMIUM TEMPLATE PICKER ────────────────────────────────────────────────
function renderPremiumTemplatePicker() {
  const wrap = $('premium-template-options');
  if (!wrap) return;

  const currentTemplate = currentTokoData?.premium?.templateTheme || '';
  const hasTemplate = !!currentTemplate;
  const templates = getAllTemplates().map(template => ({
    ...template,
    preview: getThemePreviewData(template.id)
  }));

  renderPremiumTemplateOptions(wrap, templates, currentTemplate);

  let cancelWrap = $('tpl-cancel-wrap');
  if (!cancelWrap) {
    cancelWrap = document.createElement('div');
    cancelWrap.id = 'tpl-cancel-wrap';
    cancelWrap.style.cssText = 'margin-top:12px;';
    wrap.after(cancelWrap);
  }
  renderCancelTemplateButton(cancelWrap, hasTemplate, cancelTemplate);

  if (!_premTplDelegated) {
    _premTplDelegated = true;
    wrap.addEventListener('click', async e => {
      const card = e.target.closest('.premium-template-card');
      if (!card) return;
      const templateId = card.dataset.template;
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      card.style.opacity = '0.6';
      card.style.pointerEvents = 'none';
      try {
        await updatePremiumTemplate(uid, templateId);
        if (!currentTokoData.premium) currentTokoData.premium = {};
        currentTokoData.premium.templateTheme = templateId;
        currentTokoData.premium.templateBg = '';
        _savedBgUrl = '';
        _pendingBgUrl = null;
        _pendingBgType = null;
        updateLivePreview('');
        updateBgSaveBar(false);
        renderPresetCards();
        wrap.querySelectorAll('.premium-template-card').forEach(el => {
          el.classList.remove('active');
          el.style.opacity = '';
          el.style.pointerEvents = '';
          el.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-pressed', 'true');
        clearPublicCache(uid);
        renderPremiumTemplatePicker();
        showToast('Template diaktifkan! ✓', 'success');
      } catch (err) {
        showToast('Gagal menyimpan template: ' + err.message, 'error');
        card.style.opacity = '';
        card.style.pointerEvents = '';
      }
    });
  }
}

async function cancelTemplate() {
  const uid = auth.currentUser?.uid; if (!uid) return;
  const btn = $('btn-cancel-template');
  if (btn) { btn.disabled = true; btn.textContent = 'Menghapus...'; }
  try {
    await resetPremiumTemplate(uid);
    if (!currentTokoData.premium) currentTokoData.premium = {};
    currentTokoData.premium.templateTheme = ''; currentTokoData.premium.templateBg = '';
    _savedBgUrl = ''; _pendingBgUrl = null; _pendingBgType = null;
    clearPublicCache(uid); renderPremiumTemplatePicker(); updateLivePreview(''); updateBgSaveBar(false); renderPresetCards();
    showToast('Template dikembalikan ke default.', 'info');
  } catch (e) { showToast('Gagal batalkan template: ' + e.message, 'error'); if (btn) { btn.disabled = false; btn.textContent = 'Batalkan Template (Gunakan Default)'; } }
}

// ── CUSTOM BUTTONS ─────────────────────────────────────────────────────────
const BTN_COLORS = CUSTOM_BUTTON_COLORS;

function renderCustomButtonEditor() {
  customBtns = Array.isArray(currentTokoData?.customButtons) ? [...currentTokoData.customButtons] : [];
  renderCustomBtnList();
}

function renderCustomBtnList() {
  const list = $('custom-btn-list');
  if (!list) return;

  renderCustomButtonList(list, customBtns, {
    onInput(input) {
      const idx = parseInt(input.dataset.idx, 10);
      const field = input.dataset.field;
      if (!customBtns[idx]) customBtns[idx] = { label: '', url: '', color: '#3B82F6', desc: '' };
      customBtns[idx][field] = input.value;
    }
  });

  if (!list._cbDelegated) {
    list._cbDelegated = true;
    list.addEventListener('click', e => {
      const removeBtn = e.target.closest('.cb-remove');
      if (removeBtn) {
        customBtns.splice(parseInt(removeBtn.dataset.idx, 10), 1);
        renderCustomBtnList();
        return;
      }

      const swatchBtn = e.target.closest('[data-action="cycle-color"]');
      if (swatchBtn) {
        const idx = parseInt(swatchBtn.dataset.idx, 10);
        if (!customBtns[idx]) return;
        const cur = customBtns[idx].color || BTN_COLORS[0];
        const pos = BTN_COLORS.indexOf(cur);
        customBtns[idx].color = BTN_COLORS[(pos + 1) % BTN_COLORS.length];
        renderCustomBtnList();
      }
    });
  }
}

$('btn-add-custom-btn')?.addEventListener('click', () => {
  if (customBtns.length >= 10) { showToast('Maksimal 10 tombol kustom.', 'warn'); return; }
  customBtns.push({ label: '', url: '', color: BTN_COLORS[customBtns.length % BTN_COLORS.length], desc: '' });
  renderCustomBtnList();
  const inputs = $('custom-btn-list')?.querySelectorAll('input[data-field="label"]');
  inputs?.[inputs.length - 1]?.focus();
});

let _savingCustomBtns = false;
$('btn-save-custom-btns')?.addEventListener('click', async () => {
  if (_savingCustomBtns) return;
  const uid = auth.currentUser?.uid; if (!uid) return;
  const cleaned = customBtns.filter(b => b.label?.trim() && b.url?.trim());
  // Validasi URL setiap tombol — Firestore rules HANYA terima https://
  for (const b of cleaned) {
    if (!/^https:\/\/.+/i.test(b.url)) { showToast(`URL tombol "${b.label}" harus diawali https:// (http biasa ditolak server).`, 'warn'); return; }
  }
  const btn = $('btn-save-custom-btns');
  _savingCustomBtns = true;
  if (btn) btn.disabled = true;
  try {
    await updateCustomButtons(uid, cleaned);
    clearPublicCache(uid);
    showToast(`${cleaned.length} tombol kustom disimpan!`);
    currentTokoData.customButtons = cleaned;
  } catch (e) { showToast('Gagal simpan: ' + e.message, 'error'); }
  finally { _savingCustomBtns = false; if (btn) btn.disabled = false; }
});

// ── GALLERY ────────────────────────────────────────────────────────────────
function normalizeGalleryItem(item) {
  return normalizeGalleryEntry(item);
}

function getGalleryKategoriList() {
  return getGalleryKategoriEntries(galleryPhotos);
}

function renderGalleryEditor() {
  galleryPhotos = (Array.isArray(currentTokoData?.gallery) ? currentTokoData.gallery : [])
    .map(normalizeGalleryItem)
    .filter(p => p.url);
  renderGalleryGrid();
}

function renderGalleryGrid() {
  const grid = $('gallery-grid');
  if (!grid) return;

  renderGalleryEditorGrid(grid, galleryPhotos, {
    safeImgUrl,
    onInput(input) {
      const idx = parseInt(input.dataset.idx, 10);
      const field = input.dataset.field;
      if (galleryPhotos[idx]) galleryPhotos[idx][field] = input.value;
    }
  });

  if (!grid._galDelegated) {
    grid._galDelegated = true;
    grid.addEventListener('click', e => {
      const btn = e.target.closest('[data-action="remove-gallery"]');
      if (!btn) return;
      const idx = parseInt(btn.dataset.idx, 10);
      if (!Number.isNaN(idx)) {
        galleryPhotos.splice(idx, 1);
        renderGalleryGrid();
      }
    });
  }
}

$('btn-add-gallery')?.addEventListener('click', () => {
  if (galleryPhotos.length >= 12) { showToast('Maksimal 12 foto gallery.', 'warn'); return; }
  $('inp-gallery-file')?.click();
});

$('inp-gallery-file')?.addEventListener('change', async () => {
  const files = Array.from($('inp-gallery-file').files);
  if (!files.length) return;
  const remaining = 12 - galleryPhotos.length;
  const toUpload  = files.slice(0, remaining);
  if (files.length > remaining) showToast(`Hanya ${remaining} foto lagi yang bisa ditambah (maks. 12).`, 'warn');
  const statusEl = $('gallery-upload-status');
  const addBtn   = $('btn-add-gallery');
  if (addBtn)   addBtn.disabled   = true;
  if (statusEl) statusEl.textContent = `Mengupload 0/${toUpload.length}...`;
  let uploaded = 0;
  for (const file of toUpload) {
    const check = validateImageFile(file);
    if (!check.ok) { showToast(`${file.name}: ${check.reason}`, 'warn'); continue; }
    try {
      // FIX [SEC-01]: signed upload
      const url = await uploadToCloudinary(file, CLOUD_NAME);
      if (url) { galleryPhotos.push({ url, caption: '', kategori: '' }); uploaded++; }
    } catch (e) { showToast(`${file.name}: ${e.message}`, 'warn'); }
    if (statusEl) statusEl.textContent = `Mengupload ${uploaded}/${toUpload.length}...`;
  }
  renderGalleryGrid();
  if (statusEl) statusEl.textContent = uploaded ? `${uploaded} foto diupload. Isi caption/kategori lalu Simpan.` : 'Upload gagal.';
  if (addBtn)   addBtn.disabled   = false;
  $('inp-gallery-file').value = '';
});

let _savingGallery = false;
$('btn-save-gallery')?.addEventListener('click', async () => {
  if (_savingGallery) return;
  const uid = auth.currentUser?.uid; if (!uid) return;
  const btn = $('btn-save-gallery');
  _savingGallery = true;
  if (btn) btn.disabled = true;
  try {
    $('gallery-grid')?.querySelectorAll('input[data-field]').forEach(inp => {
      const idx = parseInt(inp.dataset.idx);
      if (galleryPhotos[idx]) galleryPhotos[idx][inp.dataset.field] = inp.value;
    });
    const clean = galleryPhotos.filter(p => p.url);
    await updateGallery(uid, clean);
    clearPublicCache(uid);
    showToast(`Gallery (${clean.length} foto) disimpan!`);
    currentTokoData.gallery = [...clean];
    if ($('gallery-upload-status')) $('gallery-upload-status').textContent = '';
  } catch (e) { showToast('Gagal simpan gallery: ' + e.message, 'error'); }
  finally { _savingGallery = false; if (btn) btn.disabled = false; }
});

// ── GLOBAL TAB SWITCHER (untuk inline onclick di HTML) ─────────────────────────
window.goTab = function(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('show'));
  const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  const tabPage = document.getElementById('tab-' + tabName);
  if (tabBtn)  tabBtn.classList.add('active-tab');
  if (tabPage) tabPage.classList.add('show');
  // Close sidebar on mobile
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('overlay')?.classList.remove('show');
};
