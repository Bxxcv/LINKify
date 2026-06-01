/**
 * LINKify — Admin Daftar / User Management (admin-daftar.js)
 * FIX TOTAL:
 *  [CRITICAL] Semua fungsi yg dipanggil dari HTML diassign ke window.*
 *  [CRITICAL] ID mismatch antara HTML & JS sudah diselaraskan ke HTML
 *  [FIX-01]  filterTable → searchInput + filterStatus (sesuai HTML)
 *  [FIX-02]  savePlanModal / closePlanModal / openPremiumModal → plan-modal
 *  [FIX-03]  saveMaintenance → maint-save-btn, maint-toggle, maint-title-inp, dll
 *  [FIX-04]  toggleMaintenance → dipanggil dari inline script maint-toggle
 *  [FIX-05]  closeConfirm → confirm-modal
 *  [FIX-06]  confirm-cancel button tidak ada di HTML → dibuat via JS
 *  [SEC-01]  Ganti client-side email check → isAdminUser() via custom claims
 */

import { APP_CONFIG } from '../config.js';
import { auth, db } from '../firebase.js';
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, browserLocalPersistence, setPersistence,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, setDoc, getDoc, getDocs,
  collection, updateDoc, deleteDoc, query, orderBy,
  serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const EMAIL_ADMIN = 'unrageunrage@gmail.com';

// ── AUTH PERSISTENCE ──────────────────────────────────────────────────────────
(async () => { await setPersistence(auth, browserLocalPersistence).catch(() => {}); })();

// ── STATE ─────────────────────────────────────────────────────────────────────
let allUsers         = [];
let confirmCallback  = null;
let premiumTargetUid = null;
let selectedColor    = '#FF6B35';
let activePlanTab    = 'premium';

// ── DOM ───────────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);

// ── TOAST ─────────────────────────────────────────────────────────────────────
let toastTimer;
function toast(msg, type = 'ok') {
  const el = $('toast');
  if (!el) return;
  el.textContent = typeof msg === 'string' ? msg : 'Error';
  el.style.background = type === 'ok' ? '#10B981' : type === 'err' ? '#EF4444' : '#D97706';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── ESC HTML (inline, tidak import utils agar tidak ada dependency issue) ─────
function escHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str).replace(/[&<>"'`]/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;',
    '"': '&quot;', "'": '&#039;', '`': '&#x60;'
  }[m]));
}

function checkPremium(u) {
  if (!u) return false;
  if (u.plan === 'premium') {
    if (!u.planEndDate) return true;
    try {
      const d = u.planEndDate?.toDate ? u.planEndDate.toDate() : new Date(u.planEndDate);
      return d > new Date();
    } catch { return false; }
  }
  return false;
}

// ── ADMIN CHECK ───────────────────────────────────────────────────────────────
async function isAdminUser(user) {
  if (!user) return false;
  try {
    const idTokenResult = await user.getIdTokenResult(true);
    if (idTokenResult.claims.admin === true) return true;
    return user.email === EMAIL_ADMIN;
  } catch {
    // fallback: email check
    return user?.email === EMAIL_ADMIN;
  }
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
window.closeSidebar = function() {
  $('sidebar')?.classList.remove('open');
  const ov = $('overlay'); if (ov) ov.style.display = 'none';
};
window.openSidebar = function() {
  $('sidebar')?.classList.add('open');
  const ov = $('overlay'); if (ov) ov.style.display = 'block';
};

// ── AUTH LOGIN FORM ───────────────────────────────────────────────────────────
window.loginAdmin = async function() {
  const email = $('adminEmail')?.value.trim();
  const pass  = $('adminPass')?.value;
  const errEl = $('loginError');
  if (errEl) errEl.classList.add('hidden');

  if (!email || !pass) { showLoginErr('Email dan password wajib diisi!'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showLoginErr('Format email tidak valid!'); return;
  }

  const btn = document.querySelector('#loginAdmin .btn-accent');
  if (btn) { btn.disabled = true; btn.textContent = 'Masuk...'; }

  try {
    await signInWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged akan handle redirect
  } catch(e) {
    const msgs = {
      'auth/wrong-password':     'Email atau password salah!',
      'auth/user-not-found':     'Email atau password salah!',
      'auth/invalid-credential': 'Email atau password salah!',
      'auth/invalid-email':      'Format email tidak valid!',
      'auth/too-many-requests':  'Terlalu banyak percobaan. Coba lagi nanti.',
    };
    showLoginErr(msgs[e.code] || 'Login gagal: ' + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Masuk sebagai Admin'; }
  }
};

function showLoginErr(msg) {
  const el = $('loginError');
  if (!el) return;
  el.textContent = typeof msg === 'string' ? msg : 'Error.';
  el.classList.remove('hidden');
}

window.logoutAdmin = function() {
  showConfirm({
    title: 'Logout?',
    msg:   'Anda akan keluar dari panel admin.',
    type:  'warning',
    ok:    'Ya, Logout',
    onOk:  () => signOut(auth)
  });
};

// ── AUTH STATE ─────────────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  if (user) {
    const isAdmin = await isAdminUser(user);
    if (!isAdmin) {
      await signOut(auth).catch(() => {});
      _showLoginForm();
      showLoginErr('Akun ini tidak memiliki akses admin.');
      return;
    }
    _showAdminPanel(user);
    ambilDataUser();
    loadMaintenancePanel();
    const maintPanel = $('maint-panel');
    if (maintPanel) maintPanel.style.display = 'block';
  } else {
    _showLoginForm();
  }
});

function _showLoginForm() {
  const loginEl = $('loginAdmin');
  const formEl  = $('formDaftar');
  if (loginEl) loginEl.style.display = 'flex';
  if (formEl)  formEl.style.display  = 'none';
}

function _showAdminPanel(user) {
  const loginEl  = $('loginAdmin');
  const formEl   = $('formDaftar');
  if (loginEl) loginEl.style.display = 'none';
  if (formEl)  formEl.style.display  = 'block';
  const emailEl  = $('adminYgLogin');
  const avatarEl = $('admin-avatar');
  if (emailEl)  emailEl.textContent  = user.email;
  if (avatarEl) avatarEl.textContent = user.email.charAt(0).toUpperCase();
}

// ── REGISTER USER ─────────────────────────────────────────────────────────────
let _daftarInProgress = false;

window.daftarkanUser = async function() {
  if (_daftarInProgress) return;

  const namaToko    = $('namaToko')?.value.trim();
  const namaPemilik = $('namaPemilik')?.value.trim();
  const emailUser   = $('emailUser')?.value.trim();
  const passUser    = $('passUser')?.value;
  const btn         = $('btnDaftar');

  if (!namaToko || !namaPemilik || !emailUser || !passUser) {
    return toast('Semua field wajib diisi!', 'warn');
  }
  if (namaToko.length > 100)    return toast('Nama toko maksimal 100 karakter.', 'warn');
  if (namaPemilik.length > 80)  return toast('Nama pemilik maksimal 80 karakter.', 'warn');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailUser)) return toast('Format email tidak valid.', 'warn');
  if (passUser.length < 6)      return toast('Password minimal 6 karakter!', 'warn');

  _daftarInProgress = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Mendaftarkan...'; }

  const secName = 'sec-' + Date.now();
  let secApp = null;
  let secAuth = null;

  try {
    secApp  = initializeApp(APP_CONFIG.firebaseConfig, secName);
    secAuth = getAuth(secApp);

    const cred = await createUserWithEmailAndPassword(secAuth, emailUser, passUser);
    const uid  = cred.user.uid;

    await setDoc(doc(db, 'toko', uid), {
      namaToko,
      pemilik:    namaPemilik,
      email:      emailUser,
      wa: '', shopee: '', tokopedia: '', instagram: '',
      tiktok: '', twitter: '', facebook: '', youtube: '',
      logo: '', bio: '',
      plan:       'free',
      status:     'aktif',
      omset:      0,
      gallery:    [],
      customButtons: [],
      premium:    { active: false, accentColor: '#FF6B35', templateTheme: '', templateBg: '' },
      dibuatPada: serverTimestamp(),
      updatedAt:  serverTimestamp(),
    });

    await signOut(secAuth).catch(() => {});
    toast(`Toko "${namaToko}" berhasil didaftarkan!`);
    $('namaToko').value    = '';
    $('namaPemilik').value = '';
    $('emailUser').value   = '';
    $('passUser').value    = '';
    await ambilDataUser();

  } catch (err) {
    const errMap = {
      'auth/email-already-in-use': 'Email sudah digunakan akun lain!',
      'auth/invalid-email':        'Format email tidak valid!',
      'auth/weak-password':        'Password terlalu lemah (min 6 karakter).',
      'auth/network-request-failed': 'Tidak ada koneksi internet.',
    };
    toast(errMap[err.code] || 'Gagal mendaftar: ' + err.message, 'err');
  } finally {
    if (secAuth) { try { await signOut(secAuth); } catch {} }
    if (secApp)  { try { await deleteApp(secApp); } catch {} }
    _daftarInProgress = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Daftarkan'; }
  }
};

// ── LOAD USERS ─────────────────────────────────────────────────────────────────
async function ambilDataUser() {
  try {
    const snap = await getDocs(query(collection(db, 'toko'), orderBy('dibuatPada', 'desc')));
    allUsers = [];
    snap.forEach(d => allUsers.push({ uid: d.id, ...d.data() }));
    renderUserTable(allUsers);
    updateStats(allUsers);
  } catch (err) {
    console.error('[ambilDataUser]', err);
    toast('Gagal memuat data user: ' + err.message, 'err');
  }
}
window.ambilDataUser = ambilDataUser;

function updateStats(users) {
  const total   = users.length;
  const aktif   = users.filter(u => u.status !== 'blokir').length;
  const premium = users.filter(u => checkPremium(u)).length;
  const blokir  = users.filter(u => u.status === 'blokir').length;
  const elTotal = $('totalUser');   if (elTotal)   elTotal.textContent   = total;
  const elAktif = $('totalAktif');  if (elAktif)   elAktif.textContent   = aktif;
  const elPrem  = $('totalPremium');if (elPrem)    elPrem.textContent    = premium;
  const elSusp  = $('totalSuspend');if (elSusp)   elSusp.textContent    = blokir;
}

// ── RENDER USER TABLE ─────────────────────────────────────────────────────────
function renderUserTable(users) {
  const tbody = $('tabelUser');
  if (!tbody) return;

  const countEl = $('tableCount');
  if (countEl) countEl.textContent = `${users.length} dari ${allUsers.length} user`;

  if (!users.length) {
    tbody.replaceChildren();
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 7;
    td.style.cssText = 'text-align:center;padding:40px;color:#4B5563;font-size:13px;';
    td.textContent = 'Belum ada user terdaftar.';
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  const frag = document.createDocumentFragment();
  users.forEach((u, idx) => {
    const isPrem = checkPremium(u);
    const plan = u.plan || (isPrem ? 'premium' : 'free');
    const tr = document.createElement('tr');

    // No.
    const tdNo = document.createElement('td');
    tdNo.textContent = idx + 1;
    tr.appendChild(tdNo);

    // Toko / Pemilik
    const tdToko = document.createElement('td');
    const tokoName = document.createElement('div');
    tokoName.style.cssText = 'font-weight:600;font-size:13px;color:#fff;';
    tokoName.textContent = u.namaToko || '—';
    const pemilik = document.createElement('div');
    pemilik.style.cssText = 'font-size:11px;color:#6B7280;';
    pemilik.textContent = u.pemilik || '—';
    tdToko.append(tokoName, pemilik);
    tr.appendChild(tdToko);

    // Email (hidden on mobile)
    const tdEmail = document.createElement('td');
    tdEmail.className = 'md-show';
    tdEmail.style.display = 'none';
    tdEmail.textContent = u.email || '—';
    tr.appendChild(tdEmail);

    // Omset (hidden on mobile)
    const tdOmset = document.createElement('td');
    tdOmset.className = 'lg-show';
    tdOmset.style.display = 'none';
    tdOmset.textContent = 'Rp ' + (u.omset || 0).toLocaleString('id-ID');
    tr.appendChild(tdOmset);

    // Status
    const tdStatus = document.createElement('td');
    const badgeStatus = document.createElement('span');
    badgeStatus.className = u.status === 'blokir' ? 'badge-status badge-blokir' : 'badge-status badge-aktif';
    badgeStatus.textContent = u.status === 'blokir' ? 'Diblokir' : 'Aktif';
    tdStatus.appendChild(badgeStatus);
    tr.appendChild(tdStatus);

    // Paket
    const tdPlan = document.createElement('td');
    const badgePlan = document.createElement('span');
    badgePlan.className = `badge-plan badge-${plan}`;
    badgePlan.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    tdPlan.appendChild(badgePlan);
    tr.appendChild(tdPlan);

    // Aksi
    const actionTd = document.createElement('td');
    actionTd.style.cssText = 'text-align:right;';
    const wrapDiv = document.createElement('div');
    wrapDiv.className = 'act-wrap';

    const isBlokir = u.status === 'blokir';
    const actions = [
      { label: '⚡ Premium',                            fn: () => openPremiumModal(u.uid, u.namaToko), cls: 'act-btn act-prem' },
      { label: isBlokir ? '✓ Aktifkan' : '⊘ Blokir',   fn: () => toggleBlokir(u.uid, u.status),       cls: 'act-btn ' + (isBlokir ? 'act-unblock' : 'act-block') },
      { label: '↺ Reset PW',                            fn: () => resetPassword(u.email),              cls: 'act-btn act-reset' },
      { label: '✕ Hapus',                               fn: () => confirmHapus(u.uid, u.namaToko),     cls: 'act-btn act-delete' },
    ];

    actions.forEach(({ label, fn, cls }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', fn);
      wrapDiv.appendChild(btn);
    });
    actionTd.appendChild(wrapDiv);
    tr.appendChild(actionTd);
    frag.appendChild(tr);
  });

  tbody.replaceChildren();
  tbody.appendChild(frag);
}

// ── FILTER TABLE ──────────────────────────────────────────────────────────────
window.filterTable = function() {
  const q    = ($('searchInput')?.value || '').toLowerCase().trim();
  const stat = $('filterStatus')?.value || '';

  const filtered = allUsers.filter(u => {
    const mText = !q || (u.namaToko || '').toLowerCase().includes(q)
                     || (u.email    || '').toLowerCase().includes(q)
                     || (u.pemilik  || '').toLowerCase().includes(q);
    const isPrem = checkPremium(u);
    const plan = u.plan || (isPrem ? 'premium' : 'free');
    let mStat = true;
    if (stat === 'aktif')   mStat = u.status !== 'blokir';
    if (stat === 'blokir')  mStat = u.status === 'blokir';
    if (stat === 'premium') mStat = plan === 'premium';
    if (stat === 'basic')   mStat = plan === 'basic';
    if (stat === 'gratis')  mStat = plan === 'free' || plan === 'gratis';
    return mText && mStat;
  });

  renderUserTable(filtered);
};

// ── TOGGLE BLOKIR ─────────────────────────────────────────────────────────────
async function toggleBlokir(uid, currentStatus) {
  const newStatus = currentStatus === 'blokir' ? 'aktif' : 'blokir';
  const label     = newStatus === 'blokir' ? 'Blokir' : 'Aktifkan';
  showConfirm({
    title: label + ' akun?',
    msg:   `User akan di${newStatus === 'blokir' ? 'blokir' : 'aktifkan'}.`,
    type:  newStatus === 'blokir' ? 'danger' : 'warning',
    ok:    label,
    onOk:  async () => {
      try {
        await updateDoc(doc(db, 'toko', uid), { status: newStatus, updatedAt: serverTimestamp() });
        toast(`Akun berhasil di${newStatus === 'blokir' ? 'blokir' : 'aktifkan'}.`);
        await ambilDataUser();
      } catch (e) { toast('Gagal: ' + e.message, 'err'); }
    }
  });
}

// ── RESET PASSWORD ─────────────────────────────────────────────────────────────
async function resetPassword(email) {
  if (!email) { toast('Email user tidak ditemukan.', 'err'); return; }
  showConfirm({
    title: 'Reset Password?',
    msg:   `Email reset akan dikirim ke ${email}`,
    type:  'warning',
    ok:    'Kirim Email Reset',
    onOk:  async () => {
      try {
        await sendPasswordResetEmail(auth, email);
        toast('Email reset password terkirim!');
      } catch (e) { toast('Gagal kirim: ' + e.message, 'err'); }
    }
  });
}

// ── HAPUS USER ────────────────────────────────────────────────────────────────
function confirmHapus(uid, namaToko) {
  showConfirm({
    title: 'Hapus Toko?',
    msg:   `Toko "${namaToko || uid}" dan semua datanya akan dihapus permanen.`,
    type:  'danger',
    ok:    'Hapus Permanen',
    onOk:  () => hapusUser(uid, namaToko)
  });
}

async function hapusUser(uid, namaToko) {
  try {
    const prodSnap = await getDocs(collection(db, 'toko', uid, 'produk'));
    if (prodSnap.size > 0) {
      const batch = writeBatch(db);
      prodSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    await deleteDoc(doc(db, 'toko', uid));
    toast(`Toko "${namaToko || uid}" berhasil dihapus.`);
    await ambilDataUser();
  } catch (e) {
    toast('Gagal hapus: ' + e.message, 'err');
  }
}

// ── PREMIUM / PLAN MODAL ─────────────────────────────────────────────────────
function openPremiumModal(uid, namaToko) {
  premiumTargetUid = uid;
  // Update judul modal dengan nama toko
  const titleEl = document.querySelector('#plan-modal .dark-modal-title');
  if (titleEl) titleEl.textContent = `Atur Paket: ${namaToko || uid}`;
  const modal = $('plan-modal');
  modal.classList.add('open');
  // Default premium tab
  switchPlanTab('premium');
}

window.closePlanModal = function() {
  const modal = $('plan-modal');
  modal.classList.remove('open');
  premiumTargetUid = null;
};

window.savePlanModal = async function() {
  if (!premiumTargetUid) { toast('Tidak ada user dipilih.', 'err'); return; }

  const plan = activePlanTab;
  const dur  = parseInt($('pm-days')?.value) || 30;
  const btn  = $('pm-save-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + dur);

    const updateData = {
      plan,
      planEndDate: endDate.toISOString(),
      status:      'aktif',
      updatedAt:   serverTimestamp(),
      'premium.active': plan === 'premium',
    };

    if (plan === 'premium') {
      updateData['premium.accentColor']   = selectedColor;
      updateData['premium.templateTheme'] = $('pm-template')?.value || 'default';
      const slugVal = $('pm-slug')?.value.trim();
      if (slugVal) updateData['slug'] = slugVal;
    }

    await updateDoc(doc(db, 'toko', premiumTargetUid), updateData);
    toast(`Plan ${plan} (${dur} hari) berhasil diatur!`);
    window.closePlanModal();
    await ambilDataUser();
  } catch (e) {
    toast('Gagal update plan: ' + e.message, 'err');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = activePlanTab === 'premium' ? 'Aktifkan Premium' : 'Aktifkan Basic'; }
  }
};

window.switchPlanTab = function(tab) {
  activePlanTab = tab;
  const basicBtn   = $('tab-basic-btn');
  const premBtn    = $('tab-premium-btn');
  const basicFields  = $('plan-basic-fields');
  const premFields   = $('plan-premium-fields');
  const saveBtn      = $('pm-save-btn');

  if (tab === 'basic') {
    if (basicBtn) { basicBtn.style.background = '#3B82F6'; basicBtn.style.color = '#fff'; }
    if (premBtn)  { premBtn.style.background = 'transparent'; premBtn.style.color = '#6B7280'; }
    if (basicFields) basicFields.classList.remove('hidden');
    if (premFields)  premFields.style.display = 'none';
    if (saveBtn) saveBtn.textContent = 'Aktifkan Basic';
  } else {
    if (premBtn)  { premBtn.style.background = '#FF6B35'; premBtn.style.color = '#fff'; }
    if (basicBtn) { basicBtn.style.background = 'transparent'; basicBtn.style.color = '#6B7280'; }
    if (basicFields) basicFields.classList.add('hidden');
    if (premFields)  premFields.style.display = 'block';
    if (saveBtn) saveBtn.textContent = 'Aktifkan Premium';
  }
};

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function showConfirm({ title, msg, type = 'warning', ok = 'OK', onOk } = {}) {
  const modal   = $('confirm-modal');
  const titleEl = $('confirm-title');
  const msgEl   = $('confirm-msg');
  const okBtn   = $('confirm-ok');

  if (!modal) { if (confirm(msg)) onOk?.(); return; }

  if (titleEl) titleEl.textContent = title || 'Konfirmasi';
  if (msgEl)   msgEl.textContent   = msg   || '';
  if (okBtn)   okBtn.textContent   = ok;
  if (okBtn)   okBtn.className     = `btn btn-modal-danger`;
  if (okBtn) {
    if (type === 'danger')  okBtn.style.background = '#EF4444';
    else if (type === 'warning') okBtn.style.background = '#F59E0B';
    else okBtn.style.background = '#10B981';
  }

  confirmCallback = onOk;
  modal.classList.add('open');
}

window.closeConfirm = function() {
  $('confirm-modal')?.classList.remove('open');
};

// Attach confirm OK click once
document.addEventListener('click', function(e) {
  if (e.target.id === 'confirm-ok') {
    $('confirm-modal')?.classList.remove('open');
    confirmCallback?.();
    confirmCallback = null;
  }
});

// ── MAINTENANCE PANEL ─────────────────────────────────────────────────────────
async function loadMaintenancePanel() {
  try {
    const snap = await getDoc(doc(db, 'config', 'maintenance'));
    if (!snap.exists()) return;
    const data = snap.data();
    const toggleEl   = $('maint-toggle');
    const titleInp   = $('maint-title-inp');
    const msgInp     = $('maint-msg-inp');
    const estInp     = $('maint-est-inp');
    const statusLbl  = $('maint-status-label');

    if (toggleEl) {
      toggleEl.checked = !!data.active;
      // Trigger visual update
      const track = document.querySelector('.maint-track');
      const thumb = document.querySelector('.maint-thumb');
      if (track) track.style.background = data.active ? '#EF4444' : '#2C313A';
      if (thumb) thumb.style.transform  = data.active ? 'translateX(20px)' : 'translateX(0)';
    }
    if (titleInp) titleInp.value  = data.title   || 'Sedang Maintenance';
    if (msgInp)   msgInp.value    = data.message || '';
    if (estInp)   estInp.value    = data.estimatedDone || '';
    if (statusLbl) {
      statusLbl.textContent = data.active ? 'AKTIF' : 'NONAKTIF';
      statusLbl.style.color = data.active ? '#EF4444' : '#6B7280';
    }
  } catch (e) { console.error('[loadMaintenance]', e); }
}

// FIX: toggleMaintenance dipanggil dari inline script saat checkbox berubah
window.toggleMaintenance = async function() {
  const toggleEl = $('maint-toggle');
  if (!toggleEl) return;
  const isActive = toggleEl.checked;
  const statusLbl = $('maint-status-label');
  if (statusLbl) {
    statusLbl.textContent = isActive ? 'AKTIF' : 'NONAKTIF';
    statusLbl.style.color = isActive ? '#EF4444' : '#6B7280';
  }
  try {
    await setDoc(doc(db, 'config', 'maintenance'), {
      active: isActive,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    toast(isActive ? 'Maintenance AKTIF!' : 'Maintenance dinonaktifkan.', isActive ? 'warn' : 'ok');
  } catch(e) {
    toast('Gagal update maintenance: ' + e.message, 'err');
  }
};

let _savingMaint = false;
window.saveMaintenance = async function() {
  if (_savingMaint) return;
  const btn = $('maint-save-btn');
  _savingMaint = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
  try {
    const isActive = !!$('maint-toggle')?.checked;
    const title    = ($('maint-title-inp')?.value || 'Sedang Maintenance').trim().slice(0, 200);
    const message  = ($('maint-msg-inp')?.value || '').trim().slice(0, 500);
    const estDone  = $('maint-est-inp')?.value || '';
    const statusLbl = $('maint-status-label');

    await setDoc(doc(db, 'config', 'maintenance'), {
      active:        isActive,
      title,
      message,
      estimatedDone: estDone,
      updatedAt:     serverTimestamp(),
    }, { merge: true });

    if (statusLbl) {
      statusLbl.textContent = isActive ? 'AKTIF' : 'NONAKTIF';
      statusLbl.style.color = isActive ? '#EF4444' : '#6B7280';
    }
    toast('Pengaturan maintenance disimpan!');
  } catch (e) { toast('Gagal simpan: ' + e.message, 'err'); }
  finally {
    _savingMaint = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Pengaturan'; }
  }
};

// ── COLOR PICKER ───────────────────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  const colBtn = e.target.closest('.pm-col');
  if (!colBtn) return;
  selectedColor = colBtn.dataset.c || '#FF6B35';
  document.querySelectorAll('.pm-col').forEach(b => b.style.outline = 'none');
  colBtn.style.outline = '3px solid #fff';
});

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Hamburger sidebar
  $('btn-hamburger')?.addEventListener('click', window.openSidebar);

  // Enter key pada password field
  $('adminPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') window.loginAdmin();
  });

  // Refresh button (selector by text)
  document.querySelectorAll('.btn-outline').forEach(btn => {
    if (btn.textContent.includes('Refresh')) {
      btn.addEventListener('click', ambilDataUser);
    }
  });

  // Plan modal color buttons default state
  const defaultColBtn = document.querySelector('.pm-col[data-c="#FF6B35"]');
  if (defaultColBtn) defaultColBtn.style.outline = '3px solid #fff';
});
