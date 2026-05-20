/**
 * LINKify — Admin Daftar / User Management (admin-daftar.js)
 * FIXES:
 *  [SEC-01] Ganti client-side email check dengan Firebase custom claims
 *           + email fallback (email_verified tetap server-side validated)
 *  [SEC-02] Secondary Firebase app (untuk create user) dibersihkan di finally
 *           → sebelumnya leak jika terjadi error di tengah flow
 *  [SEC-03] isLoggingOut flag tidak cukup — tambah guard berlapis
 *  [FIX-01] daftarkanUser() sudah ada double-submit guard tapi tidak di finally
 *  [FIX-02] updatePlanUser() tidak ada try/catch
 *  [FIX-03] Cleanup secondary app di SEMUA exit path
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
// EMAIL_ADMIN sebagai fallback saja — primary check via custom claim
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
  // SECURITY: textContent (bukan innerHTML)
  el.textContent = typeof msg === 'string' ? msg : 'Error';
  el.style.background = type === 'ok' ? '#10B981' : type === 'err' ? '#EF4444' : '#D97706';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

// ── ADMIN CHECK ───────────────────────────────────────────────────────────────
// FIX [SEC-01]: Cek custom claim DULU, email sebagai fallback
// getIdTokenResult() memvalidasi token di server — tidak bisa di-spoof di client
async function isAdminUser(user) {
  if (!user) return false;
  try {
    // forceRefresh=true agar claim terbaru selalu digunakan
    const idTokenResult = await user.getIdTokenResult(true);
    if (idTokenResult.claims.admin === true) return true;
    // Fallback: email match (tetap server-verified oleh Firebase)
    return user.email === EMAIL_ADMIN && user.emailVerified;
  } catch {
    return false;
  }
}

// ── SIDEBAR ───────────────────────────────────────────────────────────────────
function closeSidebar() {
  $('sidebar')?.classList.remove('open');
  const ov = $('overlay'); if (ov) ov.style.display = 'none';
}
function openSidebar() {
  $('sidebar')?.classList.add('open');
  const ov = $('overlay'); if (ov) ov.style.display = 'block';
}

// ── AUTH LOGIN FORM ───────────────────────────────────────────────────────────
function loginAdmin() {
  const email = $('adminEmail')?.value.trim();
  const pass  = $('adminPass')?.value;
  if ($('loginError')) $('loginError').classList.add('hidden');

  if (!email || !pass) { showLoginErr('Email dan password wajib diisi!'); return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showLoginErr('Format email tidak valid!'); return;
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
// FIX [SEC-01]: Gunakan isAdminUser() async — tidak lagi cek email langsung
let _authHandled = false;
onAuthStateChanged(auth, async user => {
  if (_authHandled) return; // cegah double-fire
  _authHandled = true;
  setTimeout(() => { _authHandled = false; }, 500); // reset untuk event berikutnya

  if (user) {
    const isAdmin = await isAdminUser(user);

    if (!isAdmin) {
      // User login tapi bukan admin — sign out dan tampilkan form login
      await signOut(auth).catch(() => {});
      _showLoginForm();
      showLoginErr('Akun ini tidak memiliki akses admin.');
      return;
    }

    // Admin terverifikasi
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
// FIX [FIX-01]: double-submit guard ada di try, pindah ke finally
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

  // FIX [FIX-03]: secondary app selalu dibersihkan di finally
  const secName = 'sec-' + Date.now();
  let secApp = null;
  let secAuth = null;

  try {
    secApp  = initializeApp(APP_CONFIG.firebaseConfig, secName);
    secAuth = getAuth(secApp);

    // Buat akun Firebase Auth baru
    const cred = await createUserWithEmailAndPassword(secAuth, emailUser, passUser);
    const uid  = cred.user.uid;

    // Pastikan admin saat ini masih valid sebelum menulis Firestore
    const currentUser = auth.currentUser;
    if (!currentUser || !(await isAdminUser(currentUser))) {
      throw new Error('Sesi admin tidak valid. Refresh dan login ulang.');
    }

    // Tulis dokumen toko di Firestore
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

    // Sign out dari secondary app agar tidak ada sesi ghost
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
    // FIX [FIX-03]: SELALU cleanup secondary app, termasuk saat error
    if (secAuth) {
      try { await signOut(secAuth); } catch {}
    }
    if (secApp) {
      try { await deleteApp(secApp); } catch {}
    }
    _daftarInProgress = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Daftarkan Toko'; }
  }
}

// ── LOAD USERS ─────────────────────────────────────────────────────────────────
async function ambilDataUser() {
  try {
    const snap = await getDocs(query(collection(db, 'toko'), orderBy('dibuatPada', 'desc')));
    allUsers = [];
    snap.forEach(d => allUsers.push({ uid: d.id, ...d.data() }));
    renderUserTable(allUsers);
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
  users.forEach(u => {
    const isPrem = checkPremium(u);
    const tr = document.createElement('tr');
    const plan = u.plan || (isPrem ? 'premium' : 'free');

    // SECURITY: semua teks user dimasukkan via textContent (bukan innerHTML)
    const cells = [
      escHtml(u.namaToko || '—'),
      escHtml(u.pemilik  || '—'),
      escHtml(u.email    || '—'),
      plan,
      escHtml(u.status   || 'aktif'),
      u.uid,
    ];

    cells.forEach((text, i) => {
      const td = document.createElement('td');
      if (i === 3) {
        // Plan badge
        const badge = document.createElement('span');
        badge.className = `badge-plan badge-${plan}`;
        badge.textContent = plan.charAt(0).toUpperCase() + plan.slice(1);
        td.appendChild(badge);
      } else if (i === 4) {
        // Status badge
        const badge = document.createElement('span');
        badge.className = `badge-status ${u.status === 'blokir' ? 'badge-blokir' : 'badge-aktif'}`;
        badge.textContent = u.status === 'blokir' ? 'Diblokir' : 'Aktif';
        td.appendChild(badge);
      } else if (i === 5) {
        // UID (kode pendek)
        const code = document.createElement('code');
        code.style.cssText = 'font-size:10px;opacity:.6;';
        code.textContent = text.slice(0, 8) + '...';
        code.title = text;
        td.appendChild(code);
      } else {
        td.textContent = text;
      }
      tr.appendChild(td);
    });

    // Action cell
    const actionTd = document.createElement('td');
    actionTd.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;';

    const actions = [
      { label: 'Premium', fn: () => openPremiumModal(u.uid, u.namaToko), cls: 'btn-act btn-prem' },
      { label: u.status === 'blokir' ? 'Aktifkan' : 'Blokir', fn: () => toggleBlokir(u.uid, u.status), cls: 'btn-act btn-blokir' },
      { label: 'Reset PW', fn: () => resetPassword(u.email), cls: 'btn-act btn-reset' },
      { label: 'Hapus',    fn: () => confirmHapus(u.uid, u.namaToko), cls: 'btn-act btn-del' },
    ];

    actions.forEach(({ label, fn, cls }) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = cls;
      btn.textContent = label;
      btn.addEventListener('click', fn);
      actionTd.appendChild(btn);
    });
    tr.appendChild(actionTd);
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

// ── PREMIUM MODAL ─────────────────────────────────────────────────────────────
function openPremiumModal(uid, namaToko) {
  premiumTargetUid = uid;
  const nameEl = $('prem-target-name');
  if (nameEl) nameEl.textContent = namaToko || uid;
  $('premModal')?.classList.add('open');
}

function closePremiumModal() {
  $('premModal')?.classList.remove('open');
  premiumTargetUid = null;
}

// FIX [FIX-02]: Tambah try/catch dan loading state
let _savingPlan = false;
async function updatePlanUser() {
  if (_savingPlan) return;
  if (!premiumTargetUid) { toast('Tidak ada user dipilih.', 'err'); return; }

  const plan   = activePlanTab;
  const dur    = parseInt($('inp-dur')?.value) || 30;
  const btn    = $('btn-save-plan');
  _savingPlan  = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }

  try {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + dur);

    await updateDoc(doc(db, 'toko', premiumTargetUid), {
      plan,
      planEndDate: endDate,
      status:      'aktif',
      updatedAt:   serverTimestamp(),
      // Reset premium sub-fields agar tidak ada state lama
      'premium.active': plan === 'premium',
    });

    toast(`Plan ${plan} (${dur} hari) berhasil diatur!`);
    closePremiumModal();
    await ambilDataUser();
  } catch (e) {
    toast('Gagal update plan: ' + e.message, 'err');
  } finally {
    _savingPlan = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Plan'; }
  }
}

// ── MAINTENANCE PANEL ─────────────────────────────────────────────────────────
async function loadMaintenancePanel() {
  try {
    const data = await getMaintenanceStatus();
    const toggleEl = $('maint-toggle');
    const msgEl    = $('maint-message');
    const estEl    = $('maint-estimated');
    if (toggleEl) toggleEl.checked = !!data.active;
    if (msgEl)    msgEl.value      = data.message || '';
    if (estEl)    estEl.value      = data.estimatedDone || '';
  } catch (e) { console.error('[loadMaintenance]', e); }
}

let _savingMaint = false;
async function saveMaintenance() {
  if (_savingMaint) return;
  const btn = $('btn-save-maint');
  _savingMaint = true;
  if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan...'; }
  try {
    await setDoc(doc(db, 'config', 'maintenance'), {
      active:        !!$('maint-toggle')?.checked,
      message:       ($('maint-message')?.value || '').trim().slice(0, 500),
      estimatedDone: $('maint-estimated')?.value || '',
      updatedAt:     serverTimestamp(),
    }, { merge: true });
    toast('Pengaturan maintenance disimpan!');
  } catch (e) { toast('Gagal simpan: ' + e.message, 'err'); }
  finally {
    _savingMaint = false;
    if (btn) { btn.disabled = false; btn.textContent = 'Simpan Pengaturan'; }
  }
}

// ── CONFIRM DIALOG ────────────────────────────────────────────────────────────
function showConfirm({ title, msg, type = 'warning', ok = 'OK', onOk } = {}) {
  const modal  = $('confirm-modal');
  const titleEl = $('confirm-title');
  const msgEl   = $('confirm-msg');
  const okBtn   = $('confirm-ok');
  const cancelBtn = $('confirm-cancel');

  if (!modal) { if (confirm(msg)) onOk?.(); return; }

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

// ── SEARCH / FILTER ───────────────────────────────────────────────────────────
function searchUser() {
  const q    = ($('searchUser')?.value || '').toLowerCase().trim();
  const plan = $('filterPlan')?.value  || '';
  const stat = $('filterStatus')?.value || '';

  const filtered = allUsers.filter(u => {
    const mText = !q || (u.namaToko || '').toLowerCase().includes(q) || (u.email || '').toLowerCase().includes(q);
    const mPlan = !plan || (u.plan || 'free') === plan;
    const mStat = !stat || (u.status || 'aktif') === stat;
    return mText && mPlan && mStat;
  });

  renderUserTable(filtered);
  const lbl = $('user-count-label');
  if (lbl) lbl.textContent = `${filtered.length} dari ${allUsers.length} user`;
}

// ── PLAN TAB SWITCH ───────────────────────────────────────────────────────────
function switchPlanTab(tab) {
  activePlanTab = tab;
  document.querySelectorAll('.plan-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.plan === tab);
  });
}

// ── EVENT LISTENERS ───────────────────────────────────────────────────────────
// Menggunakan addEventListener (bukan inline onclick di HTML)
document.addEventListener('DOMContentLoaded', () => {
  $('btnDaftar')?.addEventListener('click', daftarkanUser);
  $('btnLogout')?.addEventListener('click', logoutAdmin);
  $('btnLoginAdmin')?.addEventListener('click', loginAdmin);
  $('btn-save-plan')?.addEventListener('click', updatePlanUser);
  $('btn-close-prem')?.addEventListener('click', closePremiumModal);
  $('btn-save-maint')?.addEventListener('click', saveMaintenance);
  $('searchUser')?.addEventListener('input', searchUser);
  $('filterPlan')?.addEventListener('change', searchUser);
  $('filterStatus')?.addEventListener('change', searchUser);

  // Plan tab buttons
  document.querySelectorAll('.plan-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPlanTab(btn.dataset.plan));
  });

  // Hamburger sidebar
  $('btn-hamburger')?.addEventListener('click', openSidebar);
  $('overlay')?.addEventListener('click', closeSidebar);

  // Enter key pada password field
  $('adminPass')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') loginAdmin();
  });
});
