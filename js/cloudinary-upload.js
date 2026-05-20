/**
 * LINKify — Cloudinary Upload Helper (js/cloudinary-upload.js)
 *
 * SECURITY FIX: Ganti unsigned upload dengan signed upload.
 *
 * ARSITEKTUR SIGNED UPLOAD:
 *   Frontend → Firebase Cloud Function (getCloudinarySignature)
 *             → Cloudinary (dengan signature)
 *
 * CARA SETUP:
 *   1. Deploy Firebase Function: functions/index.js (sudah disediakan)
 *   2. Ubah Cloudinary upload preset dari "unsigned" ke "signed"
 *      atau buat preset baru yang signed di Cloudinary Dashboard
 *   3. Set environment variables di Firebase Functions:
 *      firebase functions:secrets:set CLOUDINARY_API_SECRET
 *   4. Update FUNCTIONS_URL di bawah dengan URL project Firebase Anda
 *
 * KENAPA INI PENTING:
 *   Unsigned upload preset memungkinkan SIAPAPUN upload file apapun
 *   ke akun Cloudinary Anda tanpa batasan — ini sangat berbahaya!
 *   Dengan signed upload, setiap upload harus diotorisasi oleh server.
 */

import { auth } from '../firebase.js';
import { validateImageFile } from './utils.js';

// URL Firebase Cloud Function yang akan menghasilkan tanda tangan upload
// Ganti dengan URL functions project Anda setelah deploy
const SIGN_ENDPOINT = 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/getCloudinarySignature';

// Untuk development / fallback jika Cloud Function belum di-deploy
// HAPUS ini di production!
const FALLBACK_UNSIGNED_PRESET = null; // Isi dengan preset unsigned jika belum siap signed

const UPLOAD_TIMEOUT_MS = 30_000; // 30 detik

/**
 * Upload gambar ke Cloudinary menggunakan signed upload.
 *
 * @param {File} file - File gambar yang akan diupload
 * @param {string} cloudName - Cloudinary cloud name
 * @returns {Promise<string|null>} - secure_url atau null jika gagal
 */
export async function uploadToCloudinary(file, cloudName) {
  // Validasi file sebelum apapun
  const check = validateImageFile(file);
  if (!check.ok) {
    throw new Error(check.reason);
  }

  try {
    // Coba signed upload terlebih dahulu
    return await _signedUpload(file, cloudName);
  } catch (signedErr) {
    console.warn('[Cloudinary] Signed upload gagal:', signedErr.message);

    // Fallback ke unsigned HANYA jika preset tersedia
    // Hapus fallback ini setelah Cloud Function di-deploy!
    if (FALLBACK_UNSIGNED_PRESET) {
      console.warn('[Cloudinary] PERINGATAN: Menggunakan unsigned upload (tidak aman untuk production!)');
      return await _unsignedUpload(file, cloudName, FALLBACK_UNSIGNED_PRESET);
    }

    throw signedErr;
  }
}

/**
 * Signed upload — aman untuk production
 */
async function _signedUpload(file, cloudName) {
  const user = auth.currentUser;
  if (!user) throw new Error('Harus login untuk upload.');

  // Dapatkan ID token Firebase untuk autentikasi ke Cloud Function
  const idToken = await user.getIdToken();

  // Request signature dari Cloud Function
  const signRes = await fetchWithTimeout(SIGN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      folder: `linkify/${user.uid}`,
      // Batasi transformasi yang diizinkan
      allowed_formats: 'jpg,jpeg,png,webp,gif',
      max_bytes: 5_242_880, // 5MB
    }),
  }, 10_000);

  if (!signRes.ok) {
    const errData = await signRes.json().catch(() => ({}));
    throw new Error(errData.error || `Signature request gagal (HTTP ${signRes.status})`);
  }

  const { signature, timestamp, api_key, upload_preset } = await signRes.json();

  // Upload dengan signature
  const fd = new FormData();
  fd.append('file',           file);
  fd.append('api_key',        api_key);
  fd.append('timestamp',      timestamp);
  fd.append('signature',      signature);
  fd.append('folder',         `linkify/${user.uid}`);
  if (upload_preset) fd.append('upload_preset', upload_preset);

  const uploadRes = await fetchWithTimeout(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: fd },
    UPLOAD_TIMEOUT_MS
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload gagal (HTTP ${uploadRes.status})`);
  }

  const data = await uploadRes.json();

  // Validasi URL response — pastikan dari Cloudinary
  if (!data.secure_url || !/^https:\/\/res\.cloudinary\.com\//i.test(data.secure_url)) {
    throw new Error('Response upload tidak valid.');
  }

  return data.secure_url;
}

/**
 * Unsigned upload — TIDAK AMAN untuk production!
 * Hanya untuk development / transisi.
 */
async function _unsignedUpload(file, cloudName, preset) {
  const fd = new FormData();
  fd.append('file',          file);
  fd.append('upload_preset', preset);

  const res = await fetchWithTimeout(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: fd },
    UPLOAD_TIMEOUT_MS
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Upload gagal (HTTP ${res.status})`);
  }

  const data = await res.json();

  if (!data.secure_url || !/^https:\/\/res\.cloudinary\.com\//i.test(data.secure_url)) {
    throw new Error('Response upload tidak valid.');
  }

  return data.secure_url;
}

/**
 * fetch dengan AbortController timeout
 */
function fetchWithTimeout(url, options = {}, ms = 10_000) {
  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), ms);

  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}
