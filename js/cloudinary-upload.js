/**
 * LINKify — Cloudinary Upload Helper (js/cloudinary-upload.js)
 * SECURITY: gunakan signed upload Cloudinary via Cloud Function saja.
 * Unsigned preset tidak boleh menjadi fallback karena bisa disalahgunakan publik.
 */

import { APP_CONFIG } from '../config.js';
import { auth } from '../firebase.js';

const SIGN_ENDPOINT = APP_CONFIG.cloudinary.signEndpoint || '';

const UPLOAD_TIMEOUT_MS = 30_000;

/**
 * Upload gambar ke Cloudinary.
 * Wajib memakai signed upload agar Cloudinary preset tidak terekspos sebagai jalur upload publik.
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

  if (!SIGN_ENDPOINT) {
    throw new Error('Endpoint signed upload Cloudinary belum dikonfigurasi.');
  }

  return await _signedUpload(file, cloudName || APP_CONFIG.cloudinary.cloudName);
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
  const { signature, timestamp, api_key, cloud_name, folder, allowed_formats } = await signRes.json();

  const fd = new FormData();
  fd.append('file', file);
  fd.append('api_key', api_key);
  fd.append('timestamp', timestamp);
  fd.append('signature', signature);
  fd.append('folder', folder || `linkify/${user.uid}`);
  if (allowed_formats) fd.append('allowed_formats', allowed_formats);

  const res = await _fetchTimeout(
    `https://api.cloudinary.com/v1_1/${cloud_name || cloudName}/image/upload`,
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

function _fetchTimeout(url, options = {}, ms = 10_000) {
  const ctrl  = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}
