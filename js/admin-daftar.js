/**
 * LINKify — Admin Daftar / User Management (admin-daftar.js)
 * 
 * ✅ FIXED VERSION - v2.1 (May 21, 2026)
 * 
 * FIXES APPLIED:
 *  [CRITICAL-01] ✅ Expose functions to window for HTML onclick compatibility
 *  [CRITICAL-02] ✅ Add missing functions: closeConfirm, toggleMaintenance
 *  [CRITICAL-03] ✅ Fix plan modal naming: closePlanModal, savePlanModal
 *  [CRITICAL-04] ✅ Complete addEventListener for ALL UI interactions
 *  [FIX-01] ✅ Maintenance toggle auto-save implementation
 *  [FIX-02] ✅ Plan modal color selector event binding
 *  [SEC-01] ✅ Admin check dengan custom claims + email fallback
 *  [SEC-02] ✅ Secondary Firebase app cleanup in all exit paths
 *  [SEC-03] ✅ Double-submit guards with proper finally blocks
 */

import { APP_CONFIG } from '../config.js';
import { auth, db } from '../firebase.js';
import { initializeApp, getApps, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, onAuthStateChanged, browserLocalPersistence, setPersistence,
  sendPasswordResetEmail, deleteUser
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  doc, setDoc, getDoc, getDocs,
  collection, updateDoc, deleteDoc, query, orderBy,
  serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { escHtml, checkPremium, TEMPLATE_LIST } from './utils.js';
import { getMaintenanceStatus } from './maintenance.js';

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const EMAIL_ADMIN = 'unrageunrage@gmail.com';
const BASE_PATH   = window.location.hostname.includes('github.io') ? '/LINKify' : '';

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

// ── ADMIN CHECK ───────────────────────────────────────────────────────────────
async function isAdminUser(user) {
  if (!user) return false;
  try {
    const idTokenResult = await user.getIdTokenResult(true);
    if (idTokenResult.claims.admin === true) return true;
    return user.email === EMAIL_ADMIN && user.emailVerified;
  } catch {
    return false;
  }
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function closeSidebar() {
  $('sidebar')?.classList.remove('open');
  const ov = $('overlay'); 
  if (ov) ov.style.display = 'none';
}

function openSidebar() {
  $('sidebar')?.classList.add('open');
  const ov = $('overlay'); 
  if (ov) ov.style.display = 'block';
}

// ── AUTH LOGIN ────────────────────────────────────────────────────────────────
function loginAdmin() {
  const email = $('adminEmail')?.value.trim();
  const pass  = $('adminPass')?.value;
  if ($('loginError')) $('loginError').classList.add('hidden');

  if (!email || !pass) { 
    showLoginErr('Email dan password wajib diisi!'); 
    return; 
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showLoginErr('Format email tidak valid!'); 
    return;
  }

  signInWithEmailAndPassword(auth, email, pass).catch(e => {
    const msgs = {
      'auth/wrong-password':     'Email atau password salah!',
      'auth/user-not-found':     'Email atau password salah!',
      'auth/invalid-credential': 'Email atau password salah!',
      'auth/invalid-email':      'Format email tidak valid!',
      'auth/too-many-requests':  'Terlalu banyak percobaan. Coba lagi nanti.',
    };
    showLoginErr(msgs[e.code] || 'Login gagal: ' + e.message);
  });
}

function showLoginErr(msg) {
  const el = $('loginError');
  if (!el) return;
  el.textContent = typeof msg === 'string' ? msg : 'Error.';
  el.classList.remove('hidden');
}

function logoutAdmin() {
  showConfirm({
    title: 'Logout?',
    msg:   'Anda akan keluar dari panel admin.',
    type:  'warning',
    ok:    'Ya, Logout',
    onOk:  () => signOut(auth)
  });
}

// ── AUTH STATE ─────────────────────────────────────────────────────────────────
let _authHandled = false;
onAuthStateChanged(auth, async user => {
  if (_authHandled) return;
  _authHandled = true;
  setTimeout(() => { _authHandled = false; }, 500);

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

async function daftarkanUser() {
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
  if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Mendaftarkan...'; }

  const secName = 'sec-' + Date.now();
  let secApp = null;
  let secAuth = null;

  try {
    secApp  = initializeApp(APP_CONFIG.firebaseConfig, secName);
    secAuth = getAuth(secApp);

    const cred = await createUserWithEmailAndPassword(secAuth, emailUser, passUser);
    const uid  = cred.user.uid;

    const currentUser = auth.currentUser;
    if (!currentUser || !(await isAdminUser(currentUser))) {
      throw new Error('Sesi admin tidak valid. Refresh dan login ulang.');
    }

    await setDoc(doc(db, 'toko', uid), {
      namaToko,
      pemilik:    namaPemilik,
      email:      emailUser,
      wa:         '',
      shopee:     '',
      tokopedia:  '',
      instagram:  '',
      tiktok:     '',
      twitter:    '',
      facebook:   '',
      youtube:    '',
      logo:       '',
      bio:        '',
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

    toast(`Toko "${namaToko}" berhasil didaftarkan! UID: ${uid}`);
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
    if (secAuth) {
      try { await signOut(secAuth); } catch {}
    }
    if (secApp) {
      try { await deleteApp(secApp); } catch {}
    }
    _daftarInProgress = false;
    if (btn) { btn.disabled = false; btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg> Daftarkan User'; }
  }
}

// ── LOAD USERS ─────────────────────────────────────────────────────────────────
async function ambilDataUser() {
  try {
    const snap = await getDocs(query(collection(db, 'toko'), orderBy('dibuatPada', 'desc')));
    allUsers = [];
    snap.forEach(d => allUsers.push({ uid: d.id, ...d.data() }));
    renderUserTable(allUsers);
    const countEl = $('tableCount');
    const countEl2 = $('tableCount2');
    if (countEl) countEl.textContent = `${allUsers.length} user terdaftar`;
    if (countEl2) countEl2.textContent = `${allUsers.length} user terdaftar`;
  } catch (err) {
    console.error('[ambilDataUser]', err);
    toast('Gagal memuat data user: ' + err.message, 'err');
  }
}

// ── RENDER USER TABLE ─────────────────────────────────────────────────────────
function renderUserTable(users) {
  const tbody = $('tabelUser');
  if (!tbody) return;

  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;opacity:.5;">Belum ada user terdaftar.</td></tr>';
    return;
  }

  const frag = document.createDocumentFragment();
  users.forEach((u, idx) => {
    const isPrem = checkPremium(u);
    const tr = document.createElement('tr');
    const plan = u.plan || (isPrem ? 'premium' : 'free');

    // Column: #
    const tdNum = document.createElement('td');
    tdNum.textContent = idx + 1;
    tr.appendChild(tdNum);

    // Column: Toko / Pemilik
    const tdToko = document.createElement('td');
    const divToko = document.createElement('div');
    divToko.style.cssText = 'font-weight:600;color:#fff;margin-bottom:2px;';
    divToko.textContent = u.namaToko || '—';
    const divPemilik = document.createElement('div');
    divPemilik.style.cssText = 'font-size:11px;color:#6B7280;';
    divPemilik.textContent = u.pemilik || '—';
    tdToko.appendChild(divToko);
    tdToko.appendChild(divPemilik);
    tr.appendChild(tdToko);

    // Column: Email (hidden on mobile)
    const tdEmail = document.createElement('td');
    tdEmail.className = 'md-show';
    tdEmail.style.display = 'none';
    tdEmail.textContent = u.email || '—';
    tr.appendChild(tdEmail);

    // Column: Omset (hidden on mobile/tablet)
    const tdOmset = document.createElement('td');
    tdOmset.className = 'lg-show';
    tdOmset.style.display = 'none';
    tdOmset.textContent = 'Rp ' + (u.omset || 0).toLocaleString('id-ID');
    tr.appendChild(tdOmset);

    // Column: Status
    const tdStatus = document.createElement('td');
    const badgeStatus = document.createElement('span');
    badgeStatus.className = `badge-status ${u.status === 'blokir' ? 'badge-blokir' : 'badge-aktif'}`;
    badgeStatus.textContent = u.status === 'blokir' ? 'Diblokir' : 'Aktif';
    tdStatus.appendChild(badgeStatus);
    tr.appendChild(tdStatus);

    // Column: Paket
    const tdPlan = document.createElement('td');
    const badgePlan = document.createElement('span');
    badgePlan.className = `badge-plan badge-${plan}`;
    badgePlan.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
    tdPlan.appendChild(badgePlan);
    tr.appendChild(tdPlan);

    // Column: Aksi
    const tdAksi = document.createElement('td');
    tdAksi.style.cssText = 'text-align:right;';
    const divAksi = document.createElement('div');
    divAksi.style.cssText = 'display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;';

    const actions = [
      { label: '⚡ Premium', fn: () => openPlanModal(u.uid, u.namaToko), cls: 'btn-act btn-prem' },
      { label: u.status === 'blokir' ? '✓ Aktifkan' : '⊗ Blokir', fn: () => toggleBlokir(u.uid, u.status), cls: 'btn-act btn-blokir' },
      { label: '🔑 Reset PW', fn: () => resetPassword(u.email), cls: 'btn-act btn-reset' },
      { label: '🗑️ Hapus', fn: () => confirmHapus(u.uid, u.namaToko), cls: 'btn-act btn-del' },
    ];

    actions.forEach(({ label, fn, cls }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', fn);
      divAksi.appendChild(btn);
    });

    tdAksi.appendChild(divAksi);
    tr.appendChild(tdAksi);
    frag.appendChild(tr);
  });

  tbody.innerHTML = '';
  tbody.appendChild(frag);
}

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
        await updateDoc(doc(db, 'toko', uid), { 
          status: newStatus, 
          updatedAt: serverTimestamp() 
        });
        toast(`Akun berhasil di${newStatus === 'blokir' ? 'blokir' : 'aktifkan'}.`);
        await ambilDataUser();
      } catch (e) { 
        toast('Gagal: ' + e.message, 'err'); 
      }
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
      } catch (e) { 
        toast('Gagal kirim: ' + e.message, 'err'); 
      }
    }
  });
}

// ── HAPUS USER ────────────────────────────────────────────────────────────────
function confirmHapus(uid, namaToko) {
  showConfirm({
    title: 'Hapus Toko?',
    msg:   `Toko "${namaToko || uid}" dan semua datanya akan dihapus permanen. Tindakan ini tidak bisa diurungkan.`,
    type:  'danger',
    ok:    'Hapus Permanen',
    onOk:  () => hapusUser(uid, namaToko)
  });
}

async function hapusUser(uid, namaToko) {
  try {
    // Hapus semua produk dulu (batch)
    const prodSnap = await getDocs(collection(db, 'toko', uid, 'produk'));
    if (prodSnap.size > 0) {
      const batch = writeBatch(db);
      prodSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
    // Hapus dokumen toko
    await deleteDoc(doc(db, 'toko', uid));
    toast(`Toko "${namaToko || uid}" berhasil dihapus.`);
    await ambilDataUser();
  } catch (e) {
    toast('Gagal hapus: ' + e.message, 'err');
  }
}

// ── PLAN MODAL ────────────────────────────────────────────────────────────────
// ✅ FIX: Rename functions to match HTML
function openPlanModal(uid, namaToko) {
  premiumTargetUid = uid;
  $('plan-modal')?.classList.add('open');
}

function closePlanModal() {
  $('plan-modal')?.classList.remove('open');
  premiumTargetUid = null;
}

// ✅ FIX: Rename to match HTML
let _savingPlan = false;
async function savePlanModal() {
  if (_savingPlan) return;
  if (!premiumTargetUid) { 
    toast('Tidak ada user dipilih.', 'err'); 
    return; 
  }

  const plan   = activePlanTab;
  const dur    = parseInt($('pm-days')?.value) || 30;
  const color  = selectedColor || '#FF6B35';
  const theme  = $('pm-template')?.value || 'default';
  const slug   = $('pm-slug')?.value.trim() || '';
  const btn    = $('plan-save-btn');
  
  _savingPlan  = true;
  if (btn) { 
    btn.disabled = true; 
    btn.textContent = 'Menyimpan...'; 
  }

  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + dur);

    const updateData = {
      plan,
      planEndDate: endDate,
      status:      'aktif',
      updatedAt:   serverTimestamp(),
      'premium.active': plan === 'premium',
    };

    // Jika premium, tambahkan data premium
    if (plan === 'premium') {
      updateData['premium.accentColor'] = color;
      updateData['premium.templateTheme'] = theme;
      if (slug) updateData['premium.slug'] = slug;
    }

    await updateDoc(doc(db, 'toko', premiumTargetUid), updateData);

    toast(`Plan ${plan} (${dur} hari) berhasil diatur!`);
    closePlanModal();
    await ambilDataUser();
  } catch (e) {
    toast('Gagal update plan: ' + e.message, 'err');
  } finally {
    _savingPlan = false;
    if (btn) { 
      btn.disabled = false; 
      btn.textContent = plan === 'premium' ? 'Aktifkan Premium' : 'Aktifkan Basic'; 
    }
  }
}

// ── PLAN TAB SWITCH ───────────────────────────────────────────────────────────
function switchPlanTab(tab) {
  activePlanTab = tab;
  
  // Update button states
  const basicBtn = $('tab-basic-btn');
  const premiumBtn = $('tab-premium-btn');
  const saveBtn = $('plan-save-btn');
  
  if (basicBtn && premiumBtn) {
    basicBtn.classList.toggle('active', tab === 'basic');
    premiumBtn.classList.toggle('active', tab === 'premium');
  }
  
  // Toggle fields visibility
  const basicFields = $('plan-basic-fields');
  const premiumFields = $('plan-premium-fields');
  
  if (basicFields) basicFields.classList.toggle('hidden', tab !== 'basic');
  if (premiumFields) premiumFields.style.display = tab === 'premium' ? 'block' : 'none';
  
  // Update save button text
  if (saveBtn) {
    saveBtn.textContent = tab === 'premium' ? 'Aktifkan Premium' : 'Aktifkan Basic';
    saveBtn.className = tab === 'premium' ? 'btn btn-modal-success' : 'btn btn-modal-primary';
  }
}

// ── MAINTENANCE PANEL ─────────────────────────────────────────────────────────
async function loadMaintenancePanel() {
  try {
    const data = await getMaintenanceStatus();
    const toggleEl = $('maint-toggle');
    const titleEl  = $('maint-title-inp');
    const msgEl    = $('maint-msg-inp');
    const estEl    = $('maint-est-inp');
    
    if (toggleEl) {
      toggleEl.checked = !!data.active;
      // Update visual state
      updateMaintenanceToggleVisual(toggleEl.checked);
    }
    if (titleEl) titleEl.value = data.title || 'Sedang Maintenance';
    if (msgEl) msgEl.value = data.message || '';
    if (estEl) estEl.value = data.estimatedDone || '';
  } catch (e) { 
    console.error('[loadMaintenance]', e); 
  }
}

// ✅ FIX: Add missing function
function updateMaintenanceToggleVisual(isActive) {
  const track = document.querySelector('.maint-track');
  const thumb = document.querySelector('.maint-thumb');
  if (track) track.style.background = isActive ? '#EF4444' : '#2C313A';
  if (thumb) thumb.style.transform  = isActive ? 'translateX(20px)' : 'translateX(0)';
}

// ✅ FIX: Add missing toggle function
async function toggleMaintenance() {
  const toggleEl = $('maint-toggle');
  if (!toggleEl) return;
  
  const isActive = toggleEl.checked;
  updateMaintenanceToggleVisual(isActive);
  
  // Auto-save when toggle changes
  try {
    await setDoc(doc(db, 'config', 'maintenance'), {
      active: isActive,
      message: ($('maint-msg-inp')?.value || '').trim().slice(0, 500),
      title: ($('maint-title-inp')?.value || '').trim() || 'Sedang Maintenance',
      estimatedDone: $('maint-est-inp')?.value || '',
      updatedAt: serverTimestamp(),
    }, { merge: true });
    
    toast(isActive ? 'Maintenance mode AKTIF' : 'Maintenance mode NONAKTIF');
  } catch (e) {
    toast('Gagal toggle: ' + e.message, 'err');
    // Revert toggle on error
    toggleEl.checked = !isActive;
    updateMaintenanceToggleVisual(!isActive);
  }
}

let _savingMaint = false;
async function saveMaintenance() {
  if (_savingMaint) return;
  const btn = $('maint-save-btn');
  _savingMaint = true;
  if (btn) { 
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner"></span> Menyimpan...'; 
  }
  
  try {
    await setDoc(doc(db, 'config', 'maintenance'), {
      active:        !!$('maint-toggle')?.checked,
      title:         ($('maint-title-inp')?.value || '').trim() || 'Sedang Maintenance',
      message:       ($('maint-msg-inp')?.value || '').trim().slice(0, 500),
      estimatedDone: $('maint-est-inp')?.value || '',
      updatedAt:     serverTimestamp(),
    }, { merge: true });
    toast('Pengaturan maintenance disimpan!');
  } catch (e) { 
    toast('Gagal simpan: ' + e.message, 'err'); 
  } finally {
    _savingMaint = false;
    if (btn) { 
      btn.disabled = false; 
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" width="14" height="14"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/></svg> Simpan Pengaturan'; 
    }
  }
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function showConfirm({ title, msg, type = 'warning', ok = 'OK', onOk } = {}) {
  const modal     = $('confirm-modal');
  const titleEl   = $('confirm-title');
  const msgEl     = $('confirm-msg');
  const okBtn     = $('confirm-ok-btn');
  const cancelBtn = $('confirm-cancel-btn');

  if (!modal) { 
    if (confirm(msg)) onOk?.(); 
    return; 
  }

  if (titleEl) titleEl.textContent = title || 'Konfirmasi';
  if (msgEl)   msgEl.textContent   = msg   || '';
  if (okBtn)   okBtn.textContent   = ok;
  if (okBtn)   okBtn.className     = `btn btn-confirm-ok btn-${type}`;

  confirmCallback = onOk;
  modal.classList.add('open');

  const handleOk = () => {
    modal.classList.remove('open');
    confirmCallback?.();
    okBtn?.removeEventListener('click', handleOk);
    cancelBtn?.removeEventListener('click', handleCancel);
  };
  
  const handleCancel = () => {
    modal.classList.remove('open');
    okBtn?.removeEventListener('click', handleOk);
    cancelBtn?.removeEventListener('click', handleCancel);
  };

  okBtn?.addEventListener('click', handleOk);
  cancelBtn?.addEventListener('click', handleCancel);
}

// ✅ FIX: Add missing function
function closeConfirm() {
  const modal = $('confirm-modal');
  if (modal) modal.classList.remove('open');
}

// ── SEARCH / FILTER ───────────────────────────────────────────────────────────
function searchUser() {
  const q    = ($('searchUser')?.value || '').toLowerCase().trim();
  const plan = $('filterPlan')?.value  || '';
  const stat = $('filterStatus')?.value || '';

  const filtered = allUsers.filter(u => {
    const mText = !q || 
      (u.namaToko || '').toLowerCase().includes(q) || 
      (u.email || '').toLowerCase().includes(q) ||
      (u.pemilik || '').toLowerCase().includes(q);
    const mPlan = !plan || (u.plan || 'free') === plan;
    const mStat = !stat || (u.status || 'aktif') === stat;
    return mText && mPlan && mStat;
  });

  renderUserTable(filtered);
  const lbl = $('tableCount');
  const lbl2 = $('tableCount2');
  if (lbl) lbl.textContent = `${filtered.length} dari ${allUsers.length} user`;
  if (lbl2) lbl2.textContent = `${filtered.length} dari ${allUsers.length} user`;
}

// ── COLOR PICKER ──────────────────────────────────────────────────────────────
function initColorPicker() {
  const colors = document.querySelectorAll('#pm-colors .pm-col');
  colors.forEach(btn => {
    btn.addEventListener('click', () => {
      colors.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedColor = btn.dataset.c || '#FF6B35';
    });
  });
  // Set default
  if (colors.length > 0) colors[0].classList.add('active');
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Login & Logout
  $('btnLoginAdmin')?.addEventListener('click', loginAdmin);
  $('btnLogout')?.addEventListener('click', logoutAdmin);
  
  // Register user
  $('btnDaftar')?.addEventListener('click', daftarkanUser);
  
  // Search & Filter
  $('searchUser')?.addEventListener('input', searchUser);
  $('filterPlan')?.addEventListener('change', searchUser);
  $('filterStatus')?.addEventListener('change', searchUser);
  $('btn-refresh')?.addEventListener('click', ambilDataUser);
  
  // Plan Modal
  $('plan-close-btn')?.addEventListener('click', closePlanModal);
  $('plan-cancel-btn')?.addEventListener('click', closePlanModal);
  $('plan-save-btn')?.addEventListener('click', savePlanModal);
  $('tab-basic-btn')?.addEventListener('click', () => switchPlanTab('basic'));
  $('tab-premium-btn')?.addEventListener('click', () => switchPlanTab('premium'));
  
  // Maintenance
  $('maint-save-btn')?.addEventListener('click', saveMaintenance);
  $('maint-toggle')?.addEventListener('change', toggleMaintenance);
  
  // Sidebar
  $('btn-hamburger')?.addEventListener('click', openSidebar);
  $('overlay')?.addEventListener('click', closeSidebar);
  
  // Enter key for login
  $('adminPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginAdmin();
  });
  
  // Initialize color picker
  initColorPicker();
});

// ══════════════════════════════════════════════════════════════════════════════
// ✅ WINDOW EXPORTS (untuk backward compatibility dengan inline onclick)
// ══════════════════════════════════════════════════════════════════════════════
// Note: Dengan addEventListener modern di atas, sebenarnya tidak perlu lagi
// Tapi kita expose untuk safety jika ada inline onclick yang tertinggal

window.loginAdmin = loginAdmin;
window.logoutAdmin = logoutAdmin;
window.closeSidebar = closeSidebar;
window.openSidebar = openSidebar;
window.closeConfirm = closeConfirm;
window.closePlanModal = closePlanModal;
window.savePlanModal = savePlanModal;
window.switchPlanTab = switchPlanTab;
window.saveMaintenance = saveMaintenance;
window.toggleMaintenance = toggleMaintenance;
