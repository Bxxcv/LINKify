# LINKify Security Audit Report

Tanggal audit: 2026-06-03
Peran: white-hat security review pada kode lokal repository.

## Ringkasan Eksekutif

Saya menemukan beberapa risiko keamanan pada aplikasi LINKify. Dua yang paling penting adalah:

1. **Upload Cloudinary unsigned masih tersedia dari frontend** — siapa pun yang mengetahui `cloudName` dan `uploadPreset` dapat mencoba mengunggah file langsung ke akun Cloudinary, sehingga berisiko pembengkakan biaya, penyalahgunaan storage, dan konten tidak sah.
2. **Dokumen `/toko/{uid}` dibaca publik secara penuh** — Firestore Rules tidak bisa menyembunyikan field tertentu pada dokumen yang sama. Karena dokumen toko berisi field administratif seperti email, pemilik, omset, status, plan, dan metadata lainnya, seluruh field tersebut ikut terbaca publik selama `allow read: if true` aktif.

Patch pada commit ini menutup jalur upload unsigned di frontend dan memperketat fallback admin agar email hardcoded tetap wajib terverifikasi.

## Temuan dan Dampak

### 1. High — Cloudinary unsigned upload dapat disalahgunakan

**Lokasi:**

- `config.js`
- `js/cloudinary-upload.js`

**Masalah:**

Frontend sebelumnya menyimpan `uploadPreset` unsigned dan helper upload masih fallback ke unsigned upload ketika endpoint signed belum tersedia. Karena file frontend bersifat publik, preset ini bisa diambil oleh pihak luar dan dipakai untuk upload langsung ke Cloudinary.

**Dampak potensial:**

- Penyalahgunaan storage/bandwidth Cloudinary.
- Upload konten spam atau ilegal ke akun Cloudinary.
- Biaya tidak terduga.
- Reputasi domain/akun terganggu jika asset dipakai untuk konten berbahaya.

**Perbaikan yang dilakukan:**

- Frontend sekarang wajib memakai signed upload endpoint.
- `uploadPreset` unsigned tidak lagi dibaca sebagai fallback.
- Response signed Cloud Function sekarang dipakai dengan `folder`, `cloud_name`, dan `allowed_formats` agar parameter signature konsisten.

**Rekomendasi lanjutan:**

- Di Cloudinary Dashboard, ubah preset lama `tokobudi_unsigned` menjadi signed atau hapus preset tersebut.
- Batasi upload preset pada format gambar saja dan ukuran maksimum 5 MB.
- Pastikan Cloud Function `getCloudinarySignature` sudah deploy pada region `asia-southeast1`.

### 2. High — Public read pada `/toko/{uid}` berpotensi membocorkan field administratif

**Lokasi:**

- `firestore.rules`
- Field yang dibuat di `js/admin-daftar.js`

**Masalah:**

Rule `allow read: if true` pada `/toko/{uid}` membuat seluruh isi dokumen toko dapat dibaca publik. Firestore Rules tidak menyediakan field-level masking untuk dokumen yang sama. Jika dokumen berisi email user, nama pemilik, omset, status blokir, plan, atau field administratif lain, data tersebut ikut terbuka kepada siapa pun yang mengetahui UID atau melakukan enumerasi dari frontend yang sah.

**Dampak potensial:**

- Kebocoran email pelanggan/user.
- Kebocoran data bisnis seperti omset, status akun, dan paket berlangganan.
- Social engineering terhadap pemilik toko.

**Rekomendasi perbaikan arsitektur:**

Pisahkan data publik dan privat, misalnya:

- `/publicToko/{uid}` berisi hanya field storefront: `namaToko`, `bio`, `wa`, `shopee`, `tokopedia`, sosial media, `logo`, `gallery`, `customButtons`, dan tema publik.
- `/toko/{uid}` tetap privat untuk owner/admin: `email`, `pemilik`, `omset`, `status`, `plan`, `planEndDate`, `dibuatPada`, metadata internal.

Setelah migrasi, rule ideal:

```js
match /publicToko/{uid} {
  allow read: if true;
  allow write: if isOwner(uid) || isAdmin();
}

match /toko/{uid} {
  allow read: if isOwner(uid) || isAdmin();
  allow create, update, delete: if isAdmin();
}
```

### 3. Medium — Fallback admin berbasis email perlu dibatasi

**Lokasi:**

- `firestore.rules`
- `js/admin-daftar.js`

**Masalah:**

Fallback admin berbasis email hardcoded adalah mekanisme kompatibilitas, tetapi lebih aman bila hanya custom claim `admin: true` yang dipakai. Patch ini tetap mempertahankan fallback sementara, namun sekarang email harus `email_verified == true`.

**Dampak potensial:**

- Mengurangi risiko keputusan admin berdasarkan identitas email yang belum diverifikasi.
- Tetap ada risiko operasional karena email admin ter-hardcode di frontend dan rules.

**Rekomendasi lanjutan:**

- Set custom claim admin via Admin SDK.
- Setelah custom claim aktif, hapus fallback email dari rules dan frontend.

### 4. Medium — Analytics publik dapat dimanipulasi

**Lokasi:**

- `firestore.rules` pada `/toko/{uid}/stats/{date}`

**Masalah:**

Pengunjung anonymous boleh menaikkan counter statistik. Rule sudah membatasi increment hanya +1 per write, tetapi tidak ada rate limit per IP/session di Firestore Rules.

**Dampak potensial:**

- Statistik visits/click bisa dipalsukan.
- Owner toko dapat menerima analytics yang tidak akurat.

**Rekomendasi:**

- Pindahkan tracking increment ke Cloud Function dengan rate limiting ringan.
- Tambahkan App Check untuk mengurangi abuse dari luar aplikasi resmi.

### 5. Medium — App Check belum terlihat diterapkan

**Lokasi:**

- `firebase.js`

**Masalah:**

Aplikasi web menggunakan Firebase client SDK, tetapi belum terlihat inisialisasi Firebase App Check. Firestore Rules tetap lapisan utama, namun App Check membantu mengurangi request dari script non-resmi yang memakai config publik.

**Rekomendasi:**

- Aktifkan Firebase App Check untuk web provider yang sesuai, misalnya reCAPTCHA Enterprise atau reCAPTCHA v3.
- Enforce App Check untuk Firestore dan Cloud Functions setelah diuji.

## Prioritas Tindak Lanjut

1. **Segera:** Nonaktifkan/hapus Cloudinary unsigned preset lama di dashboard.
2. **Segera:** Deploy Cloud Function `getCloudinarySignature` dan pastikan environment `CLOUDINARY_API_KEY`, `CLOUDINARY_CLOUD_NAME`, serta secret `CLOUDINARY_API_SECRET` sudah benar.
3. **Segera:** Tambahkan custom claim admin, lalu hapus fallback email hardcoded.
4. **Tinggi:** Pisahkan dokumen publik dan privat untuk menutup kebocoran data `/toko/{uid}`.
5. **Menengah:** Tambahkan Firebase App Check dan pindahkan analytics increment ke backend/rate-limited endpoint.

## Catatan Etis

Audit ini dilakukan hanya pada kode lokal repository. Tidak ada eksploitasi terhadap sistem produksi, akun pihak ketiga, atau data nyata.

## Cek Singkat Deploy Vercel (2026-06-03)

Saya dapat membuka homepage `https://linkify-linkbio.vercel.app/` melalui browser tool dan halaman landing tampil. Dari lingkungan terminal lokal, request `curl` ke domain Vercel diblokir oleh proxy environment dengan `CONNECT tunnel failed: 403 Forbidden`, jadi verifikasi header live dilakukan terbatas dan tidak agresif.

Tambahan hardening pada putaran ini:

- Header keamanan lengkap juga diterapkan eksplisit ke route root `/`, bukan hanya file `.html`.
- Route publik untuk `admin`, `admin-daftar`, dan `login-user` diberi `X-Robots-Tag: noindex, nofollow, noarchive` agar halaman login/admin tidak mudah terindeks mesin pencari. Ini bukan pengganti autentikasi, hanya mengurangi exposure.

Kesimpulan singkat deploy: website bisa diakses, tetapi prioritas keamanan utama tetap sama: nonaktifkan preset Cloudinary unsigned lama, deploy Cloud Function signed upload, dan pisahkan data publik/privat Firestore agar field admin tidak ikut terbaca publik.


## Patch Tambahan Enumerasi Publik (2026-06-03)

Perbaikan tambahan setelah cek ulang:

- Rule `/toko/{uid}` diubah dari public `read` menjadi public `get` saja. Ini tetap memungkinkan halaman toko membaca dokumen berdasarkan UID, tetapi mencegah pengunjung anonymous melakukan `list`/query seluruh koleksi toko. Admin tetap boleh list untuk panel admin.
- Rule `/config/{docId}` juga dipecah menjadi public `get` dan admin-only `list`, supaya konfigurasi yang memang perlu dibaca publik tetap tersedia tanpa membuka listing koleksi config.
- Konfigurasi header Vercel dirapikan: header keamanan dipasang global memakai pola resmi `/:path*`, sedangkan `X-Robots-Tag` admin/login dibuat eksplisit untuk clean URL dan `.html` direct URL.

Catatan: patch ini menutup enumerasi koleksi publik. Risiko field administratif pada single dokumen `/toko/{uid}` masih perlu migrasi arsitektur ke dokumen publik/privat terpisah agar benar-benar tertutup.
