/**
 * LINKify — Login User (login-user.js)
 * FIXES:
 *  [SEC-01] Fail-open pada catch: redirect ke admin.html meski blocked / error Firestore
 *           → Sekarang fail-CLOSED: error ditampilkan, TIDAK redirect
 *  [SEC-02] Tidak ada timeout pada Firestore getDoc → bisa hang
 *  [FIX-01] Double-submit guard lebih ketat (flag + button state)
 *  [FIX-02] Rate limit per-attempt (2.5 detik)
 */

import { auth, db } from '../firebase.js';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── HELPERS ───────────────────────────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('errorMsg');
  // SECURITY: textContent — TIDAK pernah innerHTML
  if (el) el.textContent = typeof msg === 'string' ? msg : 'Terjadi kesalahan.';
}

function clearError() {
  const el = document.getElementById('errorMsg');
  if (el) el.textContent = '';
}

// Promise dengan timeout agar tidak hang selamanya
function withTimeout(promise, ms, fallbackMsg) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(fallbackMsg)), ms)
    )
  ]);
}

// ── AUTH STATE ─────────────────────────────────────────────────────────────────
// Cek status akun setelah login berhasil
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  try {
    // Timeout 8 detik — cegah hang jika Firestore lambat
    const snap = await withTimeout(
      getDoc(doc(db, 'toko', user.uid)),
      8000,
      'Koneksi timeout. Coba refresh halaman.'
    );

    // Akun tidak terdaftar sebagai toko
    if (!snap.exists()) {
      showError('Akun ini belum terdaftar. Hubungi admin.');
      await signOut(auth);
      return;
    }

    const data = snap.data();

    // Akun diblokir — JANGAN redirect, logout dan tampilkan error
    if (data.status === 'blokir') {
      showError('Akun Anda telah dinonaktifkan. Hubungi admin.');
      await signOut(auth);
      return;
    }

    // Semua OK — redirect ke dashboard
    window.location.href = 'admin.html';

  } catch (err) {
    // FIX [SEC-01]: Fail-CLOSED — TIDAK redirect meski terjadi error Firestore.
    // Sebelumnya: catch { window.location.href = 'admin.html'; } — ini SALAH
    // karena akun blocked pun akan lolos jika Firestore error.
    console.error('[login-user] auth check error:', err.code || err.message);

    const isNetworkError = err.code === 'unavailable'
      || err.message?.includes('timeout')
      || err.message?.includes('network');

    if (isNetworkError) {
      showError('Koneksi bermasalah. Coba refresh halaman.');
    } else {
      showError('Gagal memverifikasi akun. Coba lagi.');
    }

    // Sign out agar tidak terjebak dalam state login tapi tidak redirect
    await signOut(auth).catch(() => {});
  }
});

// ── LOGIN HANDLER ─────────────────────────────────────────────────────────────
let _loginInProgress  = false;
let _lastLoginAttempt = 0;

// Support tombol login dan Enter pada field password
document.getElementById('loginBtn')?.addEventListener('click', handleLogin);
document.getElementById('password')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') handleLogin();
});

function handleLogin() {
  if (_loginInProgress) return;

  // Rate limit: min 2.5 detik antar percobaan
  const now = Date.now();
  if (now - _lastLoginAttempt < 2500) {
    showError('Tunggu sebentar sebelum mencoba lagi.');
    return;
  }

  const btn      = document.getElementById('loginBtn');
  const email    = document.getElementById('email')?.value?.trim() || '';
  const password = document.getElementById('password')?.value || '';

  clearError();

  // Validasi client-side dasar
  if (!email || !password) {
    showError('Email dan password wajib diisi.');
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError('Format email tidak valid.');
    return;
  }
  if (password.length < 6) {
    showError('Password minimal 6 karakter.');
    return;
  }

  _loginInProgress  = true;
  _lastLoginAttempt = now;

  if (btn) {
    btn.innerHTML = '<span class="spinner"></span> Memproses...';
    btn.disabled  = true;
  }

  signInWithEmailAndPassword(auth, email, password)
    .then(() => {
      // onAuthStateChanged di atas yang akan handle redirect
    })
    .catch((err) => {
      const msgs = {
        'auth/user-not-found':          'Email tidak terdaftar.',
        'auth/wrong-password':          'Password salah.',
        'auth/invalid-credential':      'Email atau password salah.',
        'auth/invalid-email':           'Format email tidak valid.',
        'auth/too-many-requests':       'Terlalu banyak percobaan. Coba lagi nanti.',
        'auth/user-disabled':           'Akun dinonaktifkan. Hubungi admin.',
        'auth/network-request-failed':  'Tidak ada koneksi internet.',
        'auth/operation-not-allowed':   'Login dengan email tidak diizinkan.',
      };
      showError(msgs[err.code] || 'Login gagal. Coba lagi.');
    })
    .finally(() => {
      _loginInProgress = false;
      if (btn) {
        btn.innerHTML = 'Masuk';
        btn.disabled  = false;
      }
    });
}
