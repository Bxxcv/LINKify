
## DESKRIPSI SINGKAT WEBSITE SAYA 

LINKify adalah platform Link in Bio + Mini Store berbasis Firebase yang dibuat untuk membantu seller online, UMKM, affiliate marketer, content creator, maupun jasa digital agar memiliki halaman toko profesional hanya menggunakan satu link.

Project ini dibuat menggunakan:

- HTML()
- CSS
- Vanilla JavaScript
- Firebase
- Cloudinary
- Vercel


# SISTEM KERJA LINKify

## Alur User

Landing Page
↓
Login User
↓
Dashboard User
↓
Kelola Toko
↓
Halaman Toko Publik

---

## Alur Admin Utama (Khusus Saya)

Admin Utama Login
↓
admin-daftar.html
↓
Kelola Semua User
↓
Atur Premium / Free
↓
Aktifkan Maintenance

---

# 📁 Penjelasan File Penting

## admin-daftar.html

Halaman super admin utama.

Fungsi:
- Membuat akun user baru
- Menghapus user
- Mengatur premium/free
- Mengatur maintenance mode
- Monitoring seluruh user
- Reset akun user

File ini adalah pusat kontrol platform.

Jika file ini rusak:
- Maintenance tidak bisa dikontrol
- User baru tidak bisa dibuat
- Premium system error

---

## admin.html

Dashboard Admin khusus user.

Digunakan untuk:
- Menambah produk
- Edit produk
- Hapus produk
- Mengatur profil toko
- Mengatur template
- Mengatur warna tema
- Upload gallery
- Mengatur link sosial media

File ini fokus pada user experience pemilik toko.

---

## index.html

Halaman toko publik milik user.

Contoh:
https://linkify-linkbio.vercel.app/?uid=NSmi1SVRxfR5OOWYvY8u7jkaAtN2

Menggunakan parameter:
?uid=

UID digunakan untuk mengambil data toko dari Firebase.

Fitur:
- Profil toko
- Produk toko
- Gallery
- Tombol WhatsApp
- Marketplace
- Tema premium
- Responsive mobile

File ini adalah wajah utama toko user.

---

## maintenance.html

Halaman maintenance platform.

Diaktifkan dari:
admin-daftar.html

Fungsi:
- Menutup akses platform sementara
- Menampilkan pesan maintenance
- Menghindari corrupt data saat update besar

---

## login-user.html

Halaman login user.

Menggunakan:
Firebase Authentication

Fitur:
- Login email/password
- Session persistence
- Redirect dashboard
- Auth validation

---

# 📁 Struktur Folder

```bash
LINKify/
│
├── admin-daftar.html (Super Admin Panel)
├── admin.html (Dashboard Admin User)
├── toko.html (Halaman Utama User)
├── login-user.html (Login User)
├── maintenance.html (Halaman Maintenance)
├── index.html (Halaman Landing Page)
│
├── css/
│    ├── index.css
│    ├── landing.css
│    ├── linear-inspired-override.css
│    ├── style.css
│    ├── themes.css
│
├── js/
│    ├── admin-daftar.js
│    ├── admin.js
│    ├── cloudinary-upload.js
│    ├── login-user.js
│    ├── maintenance.js
│    ├── script.js
│    ├── templates.js
│    ├── utils.js
│
├── asset/
│    ├── img/
│        ├── botlogo.jpg
│        ├── wa.jpg
│
│    ├── icone.png
│    ├── icon-panjang.png
│
├── ai/
│    ├── botJs/
│         ├── bot.js
│
│    ├── css/
│         ├── style.css
│
│    ├── js/
│        ├── chat.js
│
│    ├── index.html
│
├── functions/
│    ├── index.js
│
├── firebase.js
├── config.js
├── manifest.json
├── firestore.rules
├── vercel.json
├── sitemap.xml
└── robots.txt
```

---

# 🔥 Teknologi

Frontend:
- HTML5
- CSS3
- Vanilla JavaScript

Backend:
- Firebase Authentication
- Firebase Firestore
- Firebase Functions

Media Upload:
- Cloudinary

Deployment:
- Vercel
- GitHub Pages

---

# 🔐 Security & Optimization

Security:
- Anti XSS
- HTML sanitization
- Safe URL validation
- Firebase auth validation

Optimization:
- Lazy loading
- Debounce rendering
- Cache optimization
- Skeleton loading
- Offline detection

---

# 🎨 UI/UX Concept

Terinspirasi dari:
- Linear
- Modern SaaS
- Mobile-first UI
- Glassmorphism
- Bento layout

Fokus utama:
- Smooth mobile experience
- Clean modern design
- Tidak terasa template AI

---

# ☁️ Firebase System

Firebase digunakan untuk:
- Authentication
- User database
- Product database
- Premium plan
- Maintenance status

---

# 💎 Premium System

## Free Plan
- Template standar
- Produk terbatas

## Premium Plan
- Template premium
- Kustomisasi lebih lengkap
- Fitur eksklusif

Premium diatur dari:
admin-daftar.html

---

# ❤️ LINKify

Satu link untuk semua jualan.

---

# 📝 Lisensi 

Create By Muhammad Farid © 2026
