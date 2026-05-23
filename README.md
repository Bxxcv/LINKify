# LINKify — Platform Link in Bio Modern

## Deskripsi Project

LINKify adalah platform **link in bio** modern berbasis HTML, CSS, dan JavaScript yang memungkinkan user membuat halaman profil/link personal dengan tampilan estetik, customizable, dan modern.

Project ini dibuat dengan konsep:
- Frontend ringan tanpa framework besar
- Mudah di-deploy ke Vercel
- Menggunakan Firebase sebagai backend utama
- Support admin panel
- Support maintenance mode
- Support template/tema
- Fokus ke UI modern dan performa ringan

Website ini memiliki vibe modern minimalis seperti:
- Bento grid
- Linktree modern
- Carrd style
- Social bio page
- Creator page
- Personal branding page

---

# Tujuan Project

Tujuan utama LINKify:

1. Membuat platform link in bio yang modern dan ringan
2. Mempermudah user membuat halaman bio personal
3. Menyediakan sistem admin sederhana
4. Menyediakan fitur maintenance dan kontrol website
5. Menjadi project yang scalable untuk dikembangkan lebih lanjut
6. Menjadi base project SaaS/link bio modern

---

# Stack yang Digunakan

## Frontend
- HTML5
- CSS3
- Vanilla JavaScript

## Backend & Database
- Firebase Authentication
- Firebase Firestore
- Firebase Hosting (opsional)
- Firebase Functions

## Deployment
- Vercel

---

# Struktur Project

```bash
LINKify-main/
│
├── index.html (Halaman Toko)
├── landing.html (landing page)
├── gallery.html (gallery)
├── admin.html (dasboard admin user)
├── admin-daftar.html (dasboard admin panel khusus admin panel)
├── login-user.html (login user)
├── maintenance.html (maintenance mode)
│
├── config.js 
├── firebase.js
├── firestore.rules
├── manifest.json
├── vercel.json
│
├── css/
│   ├── index.css
│   ├── landing.css
│   ├── style.css
│   └── themes.css
│
├── js/
│   ├── script.js
│   ├── admin.js
│   ├── admin-daftar.js
│   ├── maintenance.js
│   ├── login-user.js
│   ├── templates.js
│   ├── cloudinary-upload.js
│   └── utils.js
│
├── functions/
│   └── index.js
│
└── assets/logo
```

---

# Penjelasan Setiap File

## File Utama

### `index.html`
Halaman utama user.
Berfungsi sebagai halaman profile/link bio.

Isi utama:
- Foto profile
- Username
- Bio
- Link sosial/media
- Template user
- Theme user

---

### `landing.html`
Landing page marketing.

Fungsi:
- Menjelaskan platform
- CTA login/register
- Showcase fitur
- Branding utama

---

### `gallery.html`
Halaman showcase template atau preview profile.

Bisa digunakan untuk:
- Menampilkan template premium
- Menampilkan contoh user
- Gallery design

---

### `admin.html`
Panel admin utama user.

Fitur potensial:
- Ganti tema
- Edit template
- Kelola user
- Kelola maintenance
- Monitoring platform

---

### `admin-daftar.html`
Panel daftar/admin management.

Kemungkinan fungsi:
- Registrasi admin
- Manajemen akun admin
- Kontrol sistem

---

### `login-user.html`
Halaman login user.

Biasanya terhubung dengan:
- Firebase Auth
- Session user
- Redirect dashboard

---

### `maintenance.html`
Halaman maintenance mode.

Digunakan ketika:
- Website sedang diperbaiki
- Update sistem
- Server maintenance

---

# Folder CSS

## `css/index.css`
CSS utama halaman index.

---

## `css/landing.css`
CSS khusus landing page.

---

## `css/style.css`
Global styling.

Biasanya berisi:
- Reset CSS
- Utility
- Layout global
- Button
- Font

---

## `css/themes.css`
Sistem tema.

Digunakan untuk:
- Dark mode
- Light mode
- Custom theme
- Dynamic colors

---

# Folder JavaScript

## `js/script.js`
Logic utama frontend.

Biasanya mengatur:
- Render profile
- Load data
- Event listener
- Interaksi user

---

## `js/admin.js`
Logic admin panel.

Biasanya:
- CRUD data
- Update template
- Manage user
- System settings

---

## `js/admin-daftar.js`
Logic admin registration/management.

---

## `js/maintenance.js`
Logic maintenance mode.

Contoh:
- Redirect maintenance
- Check status Firebase

---

## `js/login-user.js`
Logic login user.

Biasanya:
- Firebase auth
- Login validation
- Session handling

---

## `js/templates.js`
Sistem template.

Fungsi:
- Theme switcher
- Dynamic layout
- Template render

---

## `js/cloudinary-upload.js`
Upload image ke Cloudinary.

Fungsi:
- Upload foto profile
- Upload banner
- Upload thumbnail

---

## `js/utils.js`
Utility/helper functions.

Biasanya:
- Format data
- Reusable helper
- Validation
- Notification helper

---

# Firebase Architecture

## Firebase Digunakan Untuk

### Authentication
- Login user
- Register user
- Session management

### Firestore Database
Menyimpan:
- Data profile
- User settings
- Themes
- Links
- Maintenance status
- Admin data

### Firebase Functions
Server-side logic.

Kemungkinan:
- API helper
- Automation
- Validation
- Secure operations

---

# Alur Sistem

## User Flow

```text
Landing Page
    ↓
Login/Register
    ↓
Masuk Dashboard
    ↓
Edit Profile
    ↓
Tambah Link
    ↓
Pilih Template
    ↓
Publish
```

---

## Admin Flow

```text
Admin Login
    ↓
Masuk Admin Panel
    ↓
Kelola User
    ↓
Kelola Template
    ↓
Kelola Maintenance
    ↓
Monitoring System
```

---

# Fitur Utama

## Sudah Ada / Struktur Sudah Disiapkan

### User System
- Login user
- User profile
- Link management
- Theme system

### Admin System
- Admin panel
- Maintenance mode
- Template management

### Visual System
- Theme support
- Responsive design
- Modern UI

### Media System
- Upload image
- Cloudinary integration

---

# Identitas Project

## Nama
LINKify

## Jenis
Link in Bio Platform

## Karakter
Modern, minimalis, clean, premium

## Teknologi
HTML + CSS + JavaScript + Firebase

## Goal
Menjadi platform link bio modern yang ringan dan scalable

---

# Kesimpulan

LINKify adalah project platform link in bio modern dengan fokus pada:

- UI premium
- Performa ringan
- Firebase backend
- Sistem admin
- Theme customization
- User profile system
