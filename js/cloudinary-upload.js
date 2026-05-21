/**
 * LINKify — Cloudinary Upload Helper (js/cloudinary-upload.js)
 * FIX: Unsigned upload langsung berfungsi via config uploadPreset
 * Signed upload dipakai jika Cloud Function sudah di-deploy
 */

import { APP_CONFIG } from '../config.js';
import { auth } from '../firebase.js';

// Ganti dengan URL Cloud Function setelah deploy (untuk signed upload)
const SIGN_ENDPOINT = null; // 'https://us-central1-toko-budi-81421.cloudfunctions.net/getCloudinarySignature'

const UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Upload gambar ke Cloudinary.
 * Otomatis pakai signed jika SIGN_ENDPOINT tersedia, fallback ke unsigned.
 */
export async function uploadToCloudinary(file, cloudName) {
  if (!file) throw new Error('Tidak ada file yang dipilih.');

  // Validasi file
  const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (!ALLOWED_MIME.includes(file.type)) {
    throw new Error(`Format tidak didukung (${file.type}). Gunakan JPG, PNG, atau WebP.`);
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Ukuran file terlalu besar (maks. 5 MB).');
  }

  // Signed upload (jika endpoint tersedia)
  if (SIGN_ENDPOINT) {
    try {
      return await _signedUpload(file, cloudName || APP_CONFIG.cloudinary.cloudName);
    } catch (err) {
      console.warn('[Cloudinary] Signed upload gagal, fallback unsigned:', err.message);
    }
  }

  // Unsigned upload via config preset
  const preset = (APP_CONFIG.cloudinary.uploadPreset || '').trim();
  if (!preset) throw new Error('Upload preset Cloudinary belum dikonfigurasi di config.js');
  return await _unsignedUpload(file, cloudName || APP_CONFIG.cloudinary.cloudName, preset);
}

async function _signedUpload(file, cloudName) {
  const user = auth.currentUser;
  if (!user) throw new Error('Harus login untuk upload.');
  const idToken = await user.getIdToken();

  const signRes = await _fetchTimeout(SIGN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({ folder: `linkify/${user.uid}` }),
  }, 10_000);

  if (!signRes.ok) throw new Error(`Signature gagal (HTTP ${signRes.status})`);
  const { signature, timestamp, api_key, upload_preset } = await signRes.json();

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', api_key);
  fd.append('timestamp', timestamp);
  fd.append('signature', signature);
  fd.append('folder', `linkify/${user.uid}`);
  if (upload_preset) fd.append('upload_preset', upload_preset);

  const res = await _fetchTimeout(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: fd }, UPLOAD_TIMEOUT_MS
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload gagal (HTTP ${res.status})`);
  }
  const data = await res.json();
  if (!data.secure_url) throw new Error('Response upload tidak valid.');
  return data.secure_url;
}

async function _unsignedUpload(file, cloudName, preset) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', preset);

  const res = await _fetchTimeout(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: fd }, UPLOAD_TIMEOUT_MS
  );

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error?.message || `Upload gagal (HTTP ${res.status}). Pastikan upload preset "${preset}" benar di Cloudinary Dashboard.`);
  }

  const data = await res.json();
  if (!data.secure_url) throw new Error('Response Cloudinary tidak valid.');
  return data.secure_url;
}

function _fetchTimeout(url, options = {}, ms = 10_000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}
