/**
 * LINKify — Firebase Cloud Functions (functions/index.js)
 *
 * FUNGSI: getCloudinarySignature
 *   Menghasilkan tanda tangan (signature) untuk Cloudinary signed upload.
 *   Hanya user yang sudah login (Firebase Auth) yang bisa memanggil fungsi ini.
 *
 * SETUP:
 *   1. Install Firebase CLI: npm install -g firebase-tools
 *   2. cd functions && npm install
 *   3. Set secret: firebase functions:secrets:set CLOUDINARY_API_SECRET
 *      (masukkan API secret dari Cloudinary Dashboard > Settings > API Keys)
 *   4. Set API key (bukan secret): firebase functions:config:set cloudinary.api_key="YOUR_API_KEY"
 *      cloudinary.cloud_name="YOUR_CLOUD_NAME"
 *   5. Deploy: firebase deploy --only functions
 *
 * CLOUDINARY DASHBOARD:
 *   - Ubah upload preset dari "unsigned" ke "signed"
 *   - Atau buat preset baru bertipe "signed"
 *   - Restrict: Allowed formats = jpg,jpeg,png,webp,gif
 *   - Set Max file size = 5MB
 *   - Set Folder = linkify/{userId}
 *
 * package.json untuk functions/:
 *   {
 *     "name": "linkify-functions",
 *     "engines": { "node": "20" },
 *     "dependencies": {
 *       "firebase-functions": "^6.0.0",
 *       "firebase-admin": "^13.0.0",
 *       "cloudinary": "^2.0.0"
 *     }
 *   }
 */

const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const cloudinary = require('cloudinary').v2;

admin.initializeApp();

// Secret: API secret Cloudinary (simpan di Firebase Secret Manager)
const CLOUDINARY_API_SECRET = defineSecret('CLOUDINARY_API_SECRET');

/**
 * Cloud Function: getCloudinarySignature
 * Method: POST
 * Auth: Bearer token Firebase
 *
 * Request body:
 *   { folder: string, allowed_formats: string, max_bytes: number }
 *
 * Response:
 *   { signature, timestamp, api_key, cloud_name }
 */
exports.getCloudinarySignature = onRequest(
  {
    // Definisikan secret yang digunakan fungsi ini
    secrets: [CLOUDINARY_API_SECRET],
    cors: [
      'https://linkify-linkbio.vercel.app/',
      'https://linkify-linkbio.vercel.app',
      // Tambahkan domain production Anda di sini
      // JANGAN tambahkan '*' — terlalu permissive
    ],
    // Batasi region agar latensi rendah untuk user Asia
    region: 'asia-southeast1',
    maxInstances: 10,
  },
  async (req, res) => {
    // Hanya izinkan POST
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    // Verifikasi Firebase Auth token
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: missing token' });
      return;
    }

    let decodedToken;
    try {
      const idToken = authHeader.slice(7);
      decodedToken  = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      res.status(401).json({ error: 'Unauthorized: invalid token' });
      return;
    }

    const userId = decodedToken.uid;

    // Cek user ada di Firestore dan tidak diblokir
    try {
      const tokoDoc = await admin.firestore().doc(`toko/${userId}`).get();
      if (!tokoDoc.exists) {
        res.status(403).json({ error: 'Forbidden: akun tidak terdaftar' });
        return;
      }
      if (tokoDoc.data()?.status === 'blokir') {
        res.status(403).json({ error: 'Forbidden: akun dinonaktifkan' });
        return;
      }
    } catch (err) {
      console.error('[getCloudinarySignature] Firestore check error:', err);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }

    // Ambil konfigurasi dari environment
    const apiKey    = process.env.CLOUDINARY_API_KEY    || '';
    const apiSecret = CLOUDINARY_API_SECRET.value();
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';

    if (!apiKey || !apiSecret || !cloudName) {
      console.error('[getCloudinarySignature] Cloudinary config tidak lengkap');
      res.status(500).json({ error: 'Server configuration error' });
      return;
    }

    // Generate signature
    const timestamp = Math.round(Date.now() / 1000);
    const folder    = `linkify/${userId}`; // isolasi per-user

    // Parameter yang akan di-sign (harus sama dengan yang dikirim saat upload)
    const paramsToSign = {
      timestamp,
      folder,
      allowed_formats: 'jpg,jpeg,png,webp,gif',
    };

    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

    res.status(200).json({
      signature,
      timestamp,
      api_key:    apiKey,
      cloud_name: cloudName,
      folder,
      allowed_formats: paramsToSign.allowed_formats,
    });
  }
);

/**
 * Opsional: Cloud Function untuk menghapus image dari Cloudinary
 * (jika suatu saat perlu cleanup saat hapus produk)
 */
exports.deleteCloudinaryImage = onRequest(
  {
    secrets: [CLOUDINARY_API_SECRET],
    cors: ['https://linkify.vercel.app'],
    region: 'asia-southeast1',
  },
  async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(authHeader.slice(7));
    } catch {
      res.status(401).json({ error: 'Unauthorized: invalid token' });
      return;
    }

    const { publicId } = req.body;
    if (!publicId || typeof publicId !== 'string') {
      res.status(400).json({ error: 'publicId required' });
      return;
    }

    // Pastikan publicId milik user ini (cegah hapus gambar user lain)
    const expectedPrefix = `linkify/${decodedToken.uid}/`;
    if (!publicId.startsWith(expectedPrefix)) {
      res.status(403).json({ error: 'Forbidden: tidak bisa hapus file user lain' });
      return;
    }

    const apiKey    = process.env.CLOUDINARY_API_KEY    || '';
    const apiSecret = CLOUDINARY_API_SECRET.value();
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    try {
      await cloudinary.uploader.destroy(publicId);
      res.status(200).json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);
