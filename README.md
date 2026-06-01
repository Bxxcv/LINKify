# LINKify

**LINKify** adalah platform **link-in-bio + mini storefront** berbasis web yang memungkinkan pengguna membuat halaman profil bisnis, menampilkan produk, galeri, link custom, dan mengelola semuanya lewat dashboard admin.

Project ini dibuat dengan pendekatan **Vanilla JavaScript + Firebase**, tanpa framework frontend berat, sehingga tetap ringan, cepat, dan mudah dideploy ke Vercel.

🌐 **Live Demo:** https://linkify-linkbio.vercel.app  
📦 **Repository:** https://github.com/Bxxcv/LINKify

---

## ✨ Fitur Utama

- **Landing Page SaaS**
  - Tampilan modern untuk memperkenalkan LINKify.
  - CTA menuju login dan dashboard.

- **Firebase Authentication**
  - Login user.
  - Proteksi akses dashboard.
  - Validasi user aktif / terblokir.

- **Dashboard Admin User**
  - Edit profil toko / brand.
  - Kelola produk.
  - Kelola link custom.
  - Kelola galeri.
  - Custom tampilan profil.
  - Pengaturan premium.

- **Mini Storefront**
  - Halaman publik untuk menampilkan profil user.
  - Produk.
  - Link custom.
  - Galeri.
  - Tombol WhatsApp / Shopee.
  - Responsive mobile-first.

- **Admin Panel Owner**
  - Dashboard khusus admin utama.
  - Kelola user.
  - Pantau status toko/user.
  - Update status premium atau blokir.

- **AI Chatbot**
  - Chatbot custom untuk membantu user.
  - Intent parser.
  - Fuzzy / typo tolerance.
  - Renderer markdown yang lebih aman.

- **Cloudinary Upload**
  - Upload gambar produk/profil/galeri.
  - Integrasi Cloudinary lewat Firebase Functions.

- **Analytics**
  - Statistik dashboard.
  - Data produk.
  - Ringkasan performa toko.

---

## 🧱 Tech Stack

- **Frontend:** HTML, CSS, Vanilla JavaScript
- **Backend:** Firebase
- **Auth:** Firebase Authentication
- **Database:** Cloud Firestore
- **Functions:** Firebase Functions
- **Image Upload:** Cloudinary
- **Hosting:** Vercel
- **Architecture:** Modular Vanilla JS

---

## 📁 Struktur Project

```txt
LINKify/
├── index.html
├── login-user.html
├── admin.html
├── admin-daftar.html
├── toko.html
├── gallery.html
├── firebase.js
├── config.js
├── firestore.rules
├── vercel.json
│
├── css/
│   ├── style.css
│   ├── landing.css
│   ├── login.css
│   ├── gallery.css
│   └── saas-polish.css
│
├── js/
│   ├── admin.js
│   ├── script.js
│   ├── login-user.js
│   ├── admin-daftar.js
│   ├── gallery-page.js
│   └── cloudinary-upload.js
│
├── ai/
│   ├── botJs/
│   │   ├── bot.js
│   │   ├── knowledge.js
│   │   └── modules/
│   └── js/
│
├── src/
│   ├── services/
│   ├── helpers/
│   ├── components/
│   ├── pages/
│   ├── chatbot/
│   ├── store/
│   ├── ui/
│   └── styles/
│
├── functions/
│   └── index.js
│
└── scripts/
    └── qa-check.mjs
```

---

## 🔐 Security Improvement

Project ini sudah diperkuat dengan beberapa hardening:

- Mengurangi penggunaan unsafe rendering.
- Menghapus `innerHTML` / `insertAdjacentHTML` pada flow utama.
- Menghapus inline handler seperti `onclick` dan `onerror`.
- Rendering data user menggunakan DOM API.
- URL divalidasi sebelum digunakan.
- Firestore Rules menggunakan validasi owner/admin.
- Upload Cloudinary diarahkan lewat signed upload.
- CSP Vercel diperketat.

---

## ⚙️ Cara Menjalankan Secara Lokal

Project ini tetap **Vanilla JS**, jadi tidak wajib install framework atau build tool.

### Opsi 1 — Live Server

Buka project dengan VS Code, lalu jalankan menggunakan extension **Live Server**.

### Opsi 2 — Python Local Server

```bash
python -m http.server 5500
```

Lalu buka:

```txt
http://localhost:5500
```

---

## 🔥 Firebase Setup

Pastikan file konfigurasi Firebase sudah sesuai di:

```txt
firebase.js
config.js
```

Project ini menggunakan:

- Firebase Auth
- Cloud Firestore
- Firebase Functions
- Firestore Security Rules

Deploy rules:

```bash
firebase deploy --only firestore:rules
```

Deploy functions:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

> Jangan commit secret key pribadi, token, atau credential sensitif ke repository public.

---

## ☁️ Cloudinary Setup

Upload gambar menggunakan Cloudinary melalui Firebase Functions.

Pastikan konfigurasi Cloudinary sudah tersedia di environment Firebase Functions, bukan hardcoded di frontend.

Contoh konfigurasi:

```bash
firebase functions:config:set cloudinary.cloud_name="YOUR_CLOUD_NAME"
firebase functions:config:set cloudinary.api_key="YOUR_API_KEY"
firebase functions:config:set cloudinary.api_secret="YOUR_API_SECRET"
```

---

## 🚀 Deploy ke Vercel

Project ini bisa langsung dideploy ke Vercel.

1. Push project ke GitHub.
2. Import repository ke Vercel.
3. Pastikan root directory benar.
4. Deploy.
5. Test halaman utama:

```txt
https://linkify-linkbio.vercel.app
```

---

## ✅ QA Checklist

Sebelum production, test manual:

- [ ] Landing page terbuka normal
- [ ] Login user berhasil
- [ ] Dashboard admin user terbuka
- [ ] Tambah/edit/hapus produk
- [ ] Upload gambar Cloudinary
- [ ] Edit profil toko
- [ ] Edit link custom
- [ ] Edit galeri
- [ ] Storefront publik tampil normal
- [ ] Chatbot berjalan
- [ ] Admin owner panel berjalan
- [ ] Firestore Rules tidak error
- [ ] Console browser bersih dari error merah
- [ ] Mobile responsive aman

Jalankan QA scan:

```bash
node scripts/qa-check.mjs
```

---

## 🧩 Architecture Notes

LINKify memakai pendekatan modular:

```txt
src/services/    → business logic & Firebase layer
src/helpers/     → sanitizer, validator, DOM helper, performance helper
src/components/  → reusable UI component
src/pages/       → page-level logic
src/chatbot/     → chatbot parser, renderer, memory, response
src/store/       → centralized state
src/ui/          → UI helper
```

Tujuannya agar project lebih:

- scalable
- maintainable
- aman
- mudah dikembangkan
- tetap ringan tanpa framework berat

---

## 🛠️ Status Development

Project ini sudah melalui beberapa tahap rewrite:

- Security hardening
- Firestore service layer
- Safe rendering
- Chatbot modularization
- Admin dashboard cleanup
- SaaS UI polish
- Vercel CSP improvement
- QA scan script

Tahap berikutnya yang bisa dikembangkan:

- Pagination produk yang lebih lengkap
- Export analytics
- Template storefront tambahan
- Payment gateway premium
- Email notification
- Multi-theme storefront
- Dashboard analytics visual lebih detail

---

## 👤 Author

Developed by **Bxxcv / UNRAGE65**

GitHub: https://github.com/Bxxcv  
Live Project: https://linkify-linkbio.vercel.app

---

## 📄 License

Project ini dibuat untuk pengembangan LINKify.  
Silakan sesuaikan bagian license sesuai kebutuhan repository kamu.
