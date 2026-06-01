/**
 * LINKify Chatbot — bot.js
 * Knowledge base + NLP engine untuk Asisten LINKify
 * Semua jawaban tentang LINKify ada di sini
 */

'use strict';

// ── KONTAK ────────────────────────────────────────────────────────
const CONTACT = {
  wa:       'https://wa.me/6285191245042',
  wa_text:  '6285191245042',
  landing:  'https://linkify.vercel.app/landing',
};

// ── HARGA ─────────────────────────────────────────────────────────
const PRICING = {
  basic:   { harga: 'Rp 50.000', periode: '/bulan' },
  premium: { harga: 'Rp 80.000', periode: '/bulan', tahunan: 'Rp 672.000/tahun' },
};

// ══════════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
//  Setiap entry: { patterns, answer, quickReplies?, card? }
// ══════════════════════════════════════════════════════════════════
const KB = [

  // ── GREETING ───────────────────────────────────────────────────
  {
    id: 'greeting',
    patterns: [
      'halo','hai','hi','hello','hey','selamat','pagi','siang','malam',
      'assalamualaikum','hei','oi','hallo','haloo','haiiii','halooo',
    ],
    answer: `Halo! 👋 Selamat datang di **Asisten LINKify**.\n\nAku siap bantu kamu seputar:\n• Cara daftar & setup toko\n• Paket harga & upgrade\n• Fitur-fitur LINKify\n• Kendala teknis\n\nMau tanya apa dulu?`,
    quickReplies: ['Cara daftar', 'Harga & paket', 'Apa itu LINKify?', 'Cara upload produk'],
  },

  // ── APA ITU LINKIFY ────────────────────────────────────────────
  {
    id: 'what_is',
    patterns: [
      'apa itu linkify','linkify itu apa','apa linkify','apaan linkify',
      'tentang linkify','penjelasan linkify','linkify adalah','kegunaan linkify',
      'fungsi linkify','buat apa linkify','linkify untuk apa',
    ],
    answer: `**LINKify** adalah platform *link bio toko online* yang dirancang khusus untuk UMKM dan penjual online Indonesia. 🛍️\n\nDengan **satu link**, kamu bisa:\n• Tampilkan **katalog produk** lengkap\n• Tombol order langsung ke **WhatsApp**\n• Integrasi **Shopee & Tokopedia**\n• Tambah **sosial media** (IG, TikTok, dll)\n• Analitik kunjungan real-time *(Premium)*\n\nIbarat punya mini toko online — tanpa perlu coding, tanpa biaya mahal.`,
    quickReplies: ['Cara daftar', 'Lihat harga', 'Fitur premium'],
    card: {
      title: '🔗 Coba LINKify Sekarang',
      body: 'Daftar gratis, aktif dalam 5 menit!',
      link: CONTACT.wa + '?text=Halo%2C+saya+mau+daftar+LINKify',
      linkText: 'Daftar via WhatsApp →',
    },
  },

  // ── CARA DAFTAR ────────────────────────────────────────────────
  {
    id: 'register',
    patterns: [
      'cara daftar','daftar linkify','cara mendaftar','gimana daftar',
      'bagaimana cara daftar','mau daftar','mau mendaftar','pendaftaran',
      'register','sign up','signup','buat akun','buat toko','mulai','cara mulai',
      'cara memulai','mau mulai','gimana mulai','langkah daftar',
    ],
    answer: `Cara daftar LINKify sangat mudah! 🚀\n\n**Langkah-langkahnya:**\n\n1️⃣ **Hubungi Admin** via WhatsApp\n2️⃣ Admin akan **buatkan akun** untukmu (gratis)\n3️⃣ Kamu dapat **email & password** login\n4️⃣ Login ke **dashboard admin** toko kamu\n5️⃣ Isi nama toko, foto, bio, nomor WA\n6️⃣ Upload produk pertama kamu\n7️⃣ **Bagikan link toko** ke semua platform!\n\n⏱️ Total waktu: **5–10 menit** saja.`,
    quickReplies: ['Hubungi admin', 'Berapa biayanya?', 'Cara upload produk'],
    card: {
      title: '💬 Daftar Sekarang',
      body: 'Gratis! Hubungi admin via WhatsApp untuk aktivasi akun.',
      link: CONTACT.wa + '?text=Halo%2C+saya+mau+daftar+LINKify+untuk+toko+saya',
      linkText: 'Chat Admin Sekarang →',
    },
  },

  // ── HARGA & PAKET ──────────────────────────────────────────────
  {
    id: 'pricing',
    patterns: [
      'harga','biaya','berapa','tarif','paket','plan','pricing',
      'harga premium','harga basic','berapa harganya','berapa biayanya',
      'bayar berapa','bayar','gratis atau bayar','ada biaya','biaya pendaftaran',
      'fee','harga langganan','harga per bulan','per bulan berapa',
    ],
    answer: `Berikut paket harga LINKify: 💰\n\n📦 Basic — ${PRICING.basic.harga}${PRICING.basic.periode}**\n• Semua fitur gratis\n• Kategori produk & filter\n• Gallery foto toko\n• Support prioritas\n\n**👑 Premium — ${PRICING.premium.harga}${PRICING.premium.periode}**\n• Semua fitur Basic\n• Analitik real-time lengkap\n• 6 Template eksklusif\n• Badge Terverifikasi ✓\n• Tombol kustom unlimited\n• Promo banner\n• Testimoni pelanggan\n• QR Code toko\n• Warna aksen custom\n\n💡 *Juga tersedia paket tahunan ${PRICING.premium.tahunan}*`,
    quickReplies: ['Upgrade premium', 'Cara bayar', 'Bedanya basic & premium?'],
    card: {
      title: '👑 Upgrade Premium',
      body: `Hanya ${PRICING.premium.harga}/bulan untuk semua fitur bisnis.`,
      link: CONTACT.wa + '?text=Halo%2C+saya+mau+upgrade+ke+Premium+LINKify',
      linkText: 'Upgrade Sekarang →',
    },
  },

  // ── CARA UPGRADE PREMIUM ───────────────────────────────────────
  {
    id: 'upgrade',
    patterns: [
      'upgrade','upgrade premium','cara upgrade','mau premium','aktifkan premium',
      'langganan premium','berlangganan','subscribe premium','naik paket',
      'cara aktifkan premium','gimana upgrade','beli premium',
    ],
    answer: `Cara upgrade ke Premium: 👑\n\n1️⃣ **Hubungi Admin** via WhatsApp\n2️⃣ Beritahu **username/nama toko** kamu\n3️⃣ Pilih **durasi**: bulanan atau tahunan\n4️⃣ Admin kirim **nominal & rekening**\n5️⃣ **Transfer** ke rekening admin\n6️⃣ **Kirim bukti** transfer ke admin\n7️⃣ Admin aktifkan Premium dalam **≤15 menit**\n\n✅ Langsung bisa akses semua fitur Premium!`,
    quickReplies: ['Cara bayar', 'Berapa harga premium?', 'Hubungi admin'],
    card: {
      title: '💬 Chat Admin untuk Upgrade',
      body: 'Premium aktif dalam ≤15 menit setelah konfirmasi bayar.',
      link: CONTACT.wa + '?text=Halo%2C+saya+mau+upgrade+ke+Premium+LINKify',
      linkText: 'Chat Admin →',
    },
  },

  // ── CARA BAYAR ────────────────────────────────────────────────
  {
    id: 'payment',
    patterns: [
      'cara bayar','bayar pakai apa','metode pembayaran','transfer','gopay',
      'ovo','dana','qris','bca','bri','mandiri','payment','metode bayar',
      'bisa bayar pakai','rekening','via apa','cara pembayaran','bayar dimana',
    ],
    answer: `Metode pembayaran yang tersedia: 💳\n\n**Transfer Bank:**\n• BCA, BRI, Mandiri, BNI\n\n**E-Wallet:**\n• GoPay, OVO, Dana, ShopeePay\n\n**Scan:**\n• QRIS (semua dompet digital)\n\nSetelah transfer, kirim **bukti bayar** ke admin WhatsApp. Aktivasi dalam **≤15 menit** di jam kerja.`,
    quickReplies: ['Hubungi admin', 'Harga premium', 'Cara upgrade'],
  },

  // ── CARA UPLOAD PRODUK ────────────────────────────────────────
  {
    id: 'upload_product',
    patterns: [
      'cara upload produk','upload produk','tambah produk','cara tambah produk',
      'cara input produk','input produk','cara pasang produk','masukkan produk',
      'tambahkan produk','cara posting produk','cara jualan','cara jual',
    ],
    answer: `Cara upload produk di LINKify: 📦\n\n1️⃣ Login ke **Dashboard Admin** toko kamu\n2️⃣ Klik menu **"Produk"** di sidebar\n3️⃣ Klik tombol **"+ Tambah Produk"**\n4️⃣ Isi detail produk:\n   • Nama produk *(wajib)*\n   • Harga jual *(wajib)*\n   • Harga coret *(opsional, untuk diskon)*\n   • Stok & kategori\n   • Foto produk\n   • Deskripsi singkat\n5️⃣ Ceklis **"Produk Unggulan"** jika mau tampil di atas\n6️⃣ Klik **"Simpan Produk"**\n\n✅ Produk langsung tampil di halaman toko kamu!`,
    quickReplies: ['Berapa batas produk?', 'Cara edit produk', 'Cara hapus produk'],
  },

  // ── BATAS PRODUK ──────────────────────────────────────────────
  {
    id: 'product_limit',
    patterns: [
      'batas produk','limit produk','berapa produk','maksimal produk',
      'max produk','boleh berapa produk','batasan produk','unlimited',
    ],
    answer: `**Tidak ada batasan produk!** 🎉\n\nKamu bisa upload produk sebanyak apapun — tidak ada batas di semua paket (Gratis, Basic, maupun Premium).\n\nTips: Pakai fitur **"Produk Unggulan"** untuk menampilkan produk terbaik di bagian atas katalog.`,
    quickReplies: ['Cara upload produk', 'Produk unggulan itu apa?'],
  },

  // ── CARA EDIT PRODUK ──────────────────────────────────────────
  {
    id: 'edit_product',
    patterns: [
      'cara edit produk','edit produk','ubah produk','ganti foto produk',
      'update produk','revisi produk','cara ubah produk',
    ],
    answer: `Cara edit produk: ✏️\n\n1️⃣ Buka menu **"Produk"** di dashboard\n2️⃣ Cari produk yang mau diedit\n3️⃣ Klik tombol **"Edit"** (ikon pensil)\n4️⃣ Ubah data yang kamu mau\n5️⃣ Klik **"Simpan Produk"**\n\n✅ Perubahan langsung live di halaman toko!`,
    quickReplies: ['Cara hapus produk', 'Cara upload produk'],
  },

  // ── CARA HAPUS PRODUK ─────────────────────────────────────────
  {
    id: 'delete_product',
    patterns: [
      'cara hapus produk','hapus produk','delete produk','hapus barang',
      'hilangkan produk','remove produk',
    ],
    answer: `Cara hapus produk: 🗑️\n\n1️⃣ Buka menu **"Produk"** di dashboard\n2️⃣ Cari produk yang mau dihapus\n3️⃣ Klik tombol **"Hapus"** (ikon merah)\n4️⃣ Konfirmasi dengan klik **"Ya, Hapus"**\n\n⚠️ *Produk yang sudah dihapus tidak bisa dipulihkan.*`,
    quickReplies: ['Cara upload produk', 'Cara edit produk'],
  },

  // ── CARA GANTI FOTO/LOGO ──────────────────────────────────────
  {
    id: 'change_logo',
    patterns: [
      'ganti foto','ganti logo','upload logo','foto toko','logo toko',
      'ganti gambar profil','foto profil','ubah foto','cara ganti foto',
      'cara ganti logo',
    ],
    answer: `Cara ganti foto/logo toko: 🖼️\n\n1️⃣ Buka menu **"Pengaturan"** di dashboard\n2️⃣ Di bagian **"Logo Toko"**, klik tombol **"Pilih Foto"**\n3️⃣ Pilih foto dari galeri HP kamu\n4️⃣ Foto akan otomatis terupload\n5️⃣ Klik **"Simpan Pengaturan"**\n\n📸 *Rekomendasi: foto persegi (1:1), minimal 400x400px, format JPG/PNG.*`,
    quickReplies: ['Cara atur profil toko', 'Cara ubah nama toko'],
  },

  // ── PENGATURAN PROFIL ─────────────────────────────────────────
  {
    id: 'profile_settings',
    patterns: [
      'pengaturan toko','setting toko','atur profil','ubah profil',
      'cara ubah nama toko','ganti nama toko','bio toko','ubah bio',
      'cara atur','setting','pengaturan','profil toko',
    ],
    answer: `Cara atur profil toko: ⚙️\n\n1️⃣ Buka menu **"Pengaturan"** di sidebar\n2️⃣ Yang bisa diubah:\n   • **Logo Toko** — foto/gambar toko\n   • **Nama Toko** — nama yang tampil di halaman\n   • **Deskripsi/Bio** — kalimat singkat tentang toko\n   • **WhatsApp** — nomor WA untuk order\n   • **Shopee & Tokopedia** — link toko marketplace\n   • **Media Sosial** — IG, TikTok, Twitter, FB, YouTube\n3️⃣ Klik **"Simpan Pengaturan"**\n\n✅ Semua perubahan langsung tampil di halaman toko!`,
    quickReplies: ['Cara ganti logo', 'Link WhatsApp', 'Cara tambah sosmed'],
  },

  // ── WHATSAPP ──────────────────────────────────────────────────
  {
    id: 'whatsapp_setup',
    patterns: [
      'cara pasang whatsapp','tambah nomor wa','hubungkan wa','link wa',
      'tombol whatsapp','wa tidak muncul','cara atur wa','nomor whatsapp',
      'setup wa','integrasi wa',
    ],
    answer: `Cara pasang tombol WhatsApp: 📱\n\n1️⃣ Buka **"Pengaturan"** di dashboard\n2️⃣ Di kolom **"WhatsApp Utama"**, masukkan link WA:\n   Format: \`https://wa.me/6281234567890\`\n   *(ganti angka dengan nomor WA kamu, tambah 62 di depan)*\n3️⃣ Klik **"Simpan Pengaturan"**\n\n✅ Tombol WA langsung muncul di halaman toko!\n\n**Bonus Premium:** Tombol WA per-produk dengan nama produk otomatis terisi di pesan.`,
    quickReplies: ['Cara pasang Shopee', 'Cara pasang Tokopedia', 'Pengaturan toko'],
  },

  // ── SHOPEE & TOKOPEDIA ────────────────────────────────────────
  {
    id: 'marketplace_setup',
    patterns: [
      'cara pasang shopee','link shopee','hubungkan shopee','shopee tidak muncul',
      'cara pasang tokopedia','link tokopedia','tokopedia tidak muncul',
      'cara tambah marketplace','integrasi marketplace','marketplace',
    ],
    answer: `Cara pasang link Shopee & Tokopedia: 🛒\n\n1️⃣ Buka **"Pengaturan"** di dashboard\n2️⃣ Scroll ke bagian **"Kontak & Platform"**\n3️⃣ Masukkan link:\n   • **Shopee:** salin URL toko Shopee kamu\n   • **Tokopedia:** salin URL toko Tokopedia kamu\n4️⃣ Klik **"Simpan Pengaturan"**\n\n✅ Tombol Shopee & Tokopedia langsung muncul di halaman toko!\n\n💡 *Kosongkan jika tidak punya toko di salah satu marketplace.*`,
    quickReplies: ['Cara pasang WA', 'Cara tambah sosmed', 'Pengaturan toko'],
  },

  // ── SOSIAL MEDIA ──────────────────────────────────────────────
  {
    id: 'social_media',
    patterns: [
      'cara tambah instagram','tambah ig','link instagram','tambah tiktok',
      'link tiktok','tambah sosial media','sosmed','social media','sosial',
      'icon sosmed','link sosial','tambah facebook','tambah youtube','tambah twitter',
    ],
    answer: `Cara tambah sosial media: 🌐\n\n1️⃣ Buka **"Pengaturan"** di dashboard\n2️⃣ Scroll ke bagian **"Media Sosial"**\n3️⃣ Masukkan link lengkap:\n   • Instagram: \`https://instagram.com/namatoko\`\n   • TikTok: \`https://tiktok.com/@namatoko\`\n   • Twitter/X: \`https://x.com/namatoko\`\n   • Facebook: \`https://facebook.com/namatoko\`\n   • YouTube: \`https://youtube.com/@namatoko\`\n4️⃣ Klik **"Simpan Pengaturan"**\n\n✅ Icon sosmed langsung tampil di halaman toko kamu!`,
    quickReplies: ['Pengaturan toko', 'Cara pasang WA'],
  },

  // ── TEMPLATE / TEMA ───────────────────────────────────────────
  {
    id: 'templates',
    patterns: [
      'template','tema','ganti tema','pilih template','tema premium','template eksklusif',
      'ganti tampilan','ubah tampilan','tampilan toko','desain toko',
      'cara ganti tema','tema fashion','tema kuliner','tema kecantikan',
    ],
    answer: `LINKify punya **6 Template Premium Eksklusif**: 🎨\n\n1. **Fashion** — Elegan, serif, gold accent\n2. **Kuliner** — Hangat, colorful, foodie vibes\n3. **Kecantikan** — Pink, glossy, aesthetic\n4. **Elektronik** — Dark, cyan, tech feel\n5. **Kreator** — Ungu, modern, creator style\n6. **Reseller** — Clean, hijau, profesional\n\n📍 *Template hanya tersedia di paket **Premium**.*\n\nCara pilih:\n1️⃣ Buka menu **"Premium"**\n2️⃣ Scroll ke **"Template Premium"**\n3️⃣ Klik template yang diinginkan\n4️⃣ Langsung live di halaman toko!`,
    quickReplies: ['Upgrade premium', 'Warna aksen', 'Harga premium'],
  },

  // ── WARNA AKSEN ───────────────────────────────────────────────
  {
    id: 'accent_color',
    patterns: [
      'warna aksen','ganti warna','ubah warna','warna toko','warna tombol',
      'custom color','accent color','warna brand','pilih warna',
    ],
    answer: `Cara ganti warna aksen toko: 🎨\n\n1️⃣ Pastikan akun kamu **Premium**\n2️⃣ Buka menu **"Premium"** di dashboard\n3️⃣ Scroll ke bagian **"Warna Aksen Toko"**\n4️⃣ Pilih salah satu dari warna yang tersedia\n5️⃣ Warna langsung berubah di seluruh halaman toko!\n\n🖌️ Warna aksen mempengaruhi: harga produk, tombol, badge, dan elemen aksen lainnya.`,
    quickReplies: ['Template toko', 'Upgrade premium'],
  },

  // ── ANALITIK ──────────────────────────────────────────────────
  {
    id: 'analytics',
    patterns: [
      'analitik','statistik','statistik toko','pengunjung','kunjungan','analytics',
      'cara lihat analitik','berapa pengunjung','data pengunjung','pantau toko',
      'laporan','report','tracking','track pengunjung',
    ],
    answer: `Fitur Analitik LINKify: 📊\n\n*(Fitur ini tersedia di paket **Premium**)*\n\nKamu bisa pantau:\n• **Total pengunjung** harian & mingguan\n• **Klik WhatsApp** (berapa orang klik WA)\n• **Klik Shopee** & Tokopedia\n• **Klik produk** — produk mana yang paling dilihat\n• **Klik sosial media**\n• **Grafik** pengunjung 7 hari terakhir\n• **Best Seller** — produk paling diminati (otomatis)\n\nCara lihat: Buka menu **"Premium"** → lihat bagian **"Statistik"**.`,
    quickReplies: ['Upgrade premium', 'Best seller itu apa?'],
  },

  // ── BEST SELLER ───────────────────────────────────────────────
  {
    id: 'best_seller',
    patterns: [
      'best seller','bestseller','badge best seller','produk terlaris',
      'otomatis best seller','badge terlaris',
    ],
    answer: `**Badge Best Seller** di LINKify bekerja otomatis! 🏆\n\nCaranya:\n• Sistem akan otomatis mendeteksi produk dengan **klik terbanyak**\n• Produk tersebut mendapat badge **"Best Seller"** secara otomatis\n• Badge diperbarui secara berkala\n\n*Fitur ini tersedia di paket **Premium**.*\n\nTidak perlu setting manual — cukup upload produk dan sistem akan bekerja sendiri!`,
    quickReplies: ['Analitik toko', 'Upgrade premium'],
  },

  // ── PROMO BANNER ──────────────────────────────────────────────
  {
    id: 'promo_banner',
    patterns: [
      'promo banner','banner promo','cara pasang promo','running promo',
      'promo toko','banner iklan','tampilkan promo','diskon banner',
    ],
    answer: `**Banner Promo** di LINKify: 📢\n\n*(Fitur Premium)*\n\nCara pasang banner promo:\n1️⃣ Buka menu **"Premium"**\n2️⃣ Scroll ke **"Banner Promo Toko"**\n3️⃣ Isi **emoji/icon** (contoh: 🔥)\n4️⃣ Isi **teks promo** (contoh: "Gratis ongkir min. Rp 100rb!")\n5️⃣ Klik **"Simpan Banner Promo"**\n\n✅ Banner langsung tampil di atas halaman toko kamu!`,
    quickReplies: ['Upgrade premium', 'Fitur premium apa saja?'],
  },

  // ── TESTIMONI ─────────────────────────────────────────────────
  {
    id: 'testimonial',
    patterns: [
      'testimoni','testimonial','ulasan pelanggan','review','cara tambah testimoni',
      'input testimoni','rating toko','bintang',
    ],
    answer: `**Testimoni Pelanggan** di LINKify: 💬\n\n*(Fitur Premium)*\n\nCara tambah testimoni:\n1️⃣ Buka menu **"Premium"**\n2️⃣ Scroll ke **"Testimoni Pelanggan"**\n3️⃣ Klik **"+ Tambah Testimoni"**\n4️⃣ Isi nama pelanggan, nama toko/kota, dan isi ulasan\n5️⃣ Tambah hingga **6 testimoni**\n6️⃣ Klik **"Simpan Testimoni"**\n\n✅ Testimoni tampil di halaman toko, meningkatkan kepercayaan pembeli baru!`,
    quickReplies: ['Promo banner', 'Fitur premium apa saja?'],
  },

  // ── GALLERY ───────────────────────────────────────────────────
  {
    id: 'gallery',
    patterns: [
      'gallery','galeri','foto toko','album foto','cara tambah foto','upload foto',
      'galeri foto','foto produk','foto toko','foto suasana',
    ],
    answer: `**Gallery Foto Toko** di LINKify: 🖼️\n\nCara mengelola gallery:\n1️⃣ Buka menu **"Premium"**\n2️⃣ Scroll ke **"Gallery Foto Toko"**\n3️⃣ Klik **"+ Tambah Foto"**\n4️⃣ Pilih foto dari galeri HP *(max 12 foto)*\n5️⃣ Klik **"Simpan Gallery"**\n\n💡 *Gallery bisa diisi dengan foto produk, suasana toko, proses pembuatan, dll.*\n\nUntuk hapus foto: klik foto yang mau dihapus di tampilan gallery.`,
    quickReplies: ['Cara upload produk', 'QR code toko'],
  },

  // ── QR CODE ───────────────────────────────────────────────────
  {
    id: 'qr_code',
    patterns: [
      'qr code','kode qr','qr toko','download qr','cetak qr','cara buat qr',
      'generate qr','scan qr','barcode',
    ],
    answer: `**QR Code Toko** di LINKify: 📱\n\n*(Fitur Premium)*\n\nCara download QR Code:\n1️⃣ Buka menu **"Premium"**\n2️⃣ Scroll ke **"QR Code Toko"**\n3️⃣ QR Code otomatis terbuat untuk link toko kamu\n4️⃣ Klik **"Download QR Code"**\n5️⃣ Cetak dan pasang di toko fisik kamu!\n\n🏪 *Customer tinggal scan → langsung masuk halaman toko online kamu.*`,
    quickReplies: ['Upgrade premium', 'Copy link toko'],
  },

  // ── TOMBOL KUSTOM ─────────────────────────────────────────────
  {
    id: 'custom_buttons',
    patterns: [
      'tombol kustom','custom button','tambah tombol','link kustom',
      'gofood','grabfood','tiktok shop','shopee food','link tambahan',
      'tombol lain','platform lain',
    ],
    answer: `**Tombol Link Kustom** di LINKify: 🔗\n\n*(Fitur Premium)*\n\nCara tambah tombol kustom:\n1️⃣ Buka menu **"Premium"**\n2️⃣ Scroll ke **"Tombol Link Kustom"**\n3️⃣ Klik **"+ Tambah Tombol"**\n4️⃣ Isi nama tombol & URL tujuan\n5️⃣ Pilih warna tombol\n6️⃣ Klik **"Simpan Tombol"**\n\n✅ Bisa tambah hingga **10 tombol** ke platform apapun:\n• GoFood, GrabFood\n• TikTok Shop\n• Google Maps\n• Website sendiri\n• Dan lainnya!`,
    quickReplies: ['Fitur premium apa saja?', 'Upgrade premium'],
  },

  // ── SEMUA FITUR PREMIUM ───────────────────────────────────────
  {
    id: 'premium_features',
    patterns: [
      'fitur premium','apa saja fitur premium','premium apa saja',
      'kelebihan premium','bedanya premium','perbedaan premium',
      'keunggulan premium','kenapa harus premium',
    ],
    answer: `Fitur **Premium LINKify** selengkapnya: 👑\n\n✅ Analitik real-time (pengunjung, klik WA, Shopee)\n✅ Grafik pengunjung 7 hari\n✅ 6 Template eksklusif (Fashion, Kuliner, dll)\n✅ Badge **Terverifikasi** di profil\n✅ Badge **Best Seller** otomatis\n✅ **Banner Promo** running\n✅ **Testimoni** pelanggan (max 6)\n✅ **Tombol kustom** unlimited (GoFood, dll)\n✅ **Warna aksen** custom\n✅ **QR Code** toko\n✅ **Gallery** foto (max 12)\n✅ Hapus branding LINKify\n✅ Tombol WA per-produk (nama produk auto-isi)\n\nSemua itu hanya **Rp 80.000/bulan!**`,
    quickReplies: ['Upgrade sekarang', 'Harga premium', 'Cara upgrade'],
    card: {
      title: '👑 Upgrade Premium',
      body: 'Semua fitur bisnis hanya Rp 80.000/bulan.',
      link: CONTACT.wa + '?text=Halo%2C+saya+mau+upgrade+ke+Premium+LINKify',
      linkText: 'Upgrade via WhatsApp →',
    },
  },

  // ── COPY LINK ─────────────────────────────────────────────────
  {
    id: 'copy_link',
    patterns: [
      'copy link','salin link','link toko','url toko','bagaimana link toko',
      'link saya','link toko saya','alamat toko','url storefront',
    ],
    answer: `Cara mendapatkan link toko kamu: 🔗\n\n1️⃣ Login ke **Dashboard Admin**\n2️⃣ Klik tombol **"Copy Link Toko"** di sidebar\n3️⃣ Link otomatis tersalin ke clipboard\n\nFormat link toko: \`linkify.vercel.app/namatoko\`\n\nKamu bisa bagikan link ini ke:\n• **Bio Instagram & TikTok**\n• **Caption posting**\n• **Status WhatsApp**\n• **Kartu nama digital**\n• **Cetak di produk fisik** (via QR Code)`,
    quickReplies: ['QR code toko', 'Cara share toko'],
  },

  // ── LUPA PASSWORD ─────────────────────────────────────────────
  {
    id: 'forgot_password',
    patterns: [
      'lupa password','lupa kata sandi','reset password','ganti password',
      'tidak bisa login','tidak bisa masuk','login error','gagal login',
      'password salah','akun terkunci',
    ],
    answer: `Lupa password atau tidak bisa login? 🔐\n\nCara reset password:\n1️⃣ **Hubungi Admin** via WhatsApp\n2️⃣ Beritahu **email/username** toko kamu\n3️⃣ Admin akan kirim **password baru**\n4️⃣ Login dengan password baru\n5️⃣ Ganti password di menu **"Akun Saya"**\n\n⚡ *Proses biasanya selesai dalam hitungan menit.*`,
    quickReplies: ['Hubungi admin', 'Masalah teknis lain'],
    card: {
      title: '🆘 Reset Password',
      body: 'Hubungi admin untuk bantuan reset akun.',
      link: CONTACT.wa + '?text=Halo%2C+saya+lupa+password+LINKify',
      linkText: 'Chat Admin →',
    },
  },

  // ── MASALAH TEKNIS ────────────────────────────────────────────
  {
    id: 'technical_issue',
    patterns: [
      'masalah','error','bug','tidak bisa','tidak jalan','tidak berfungsi',
      'gagal','rusak','bermasalah','kendala','gangguan','tidak muncul',
      'loading terus','lambat','lemot','tidak upload','upload gagal',
    ],
    answer: `Ups, ada kendala teknis? 🛠️\n\nCoba langkah berikut dulu:\n\n1️⃣ **Refresh** halaman (F5 atau tarik ke bawah di HP)\n2️⃣ **Clear cache** browser kamu\n3️⃣ Coba buka di **browser lain** (Chrome/Firefox)\n4️⃣ Pastikan **koneksi internet** stabil\n5️⃣ Coba **logout & login** ulang\n\nMasih bermasalah? Hubungi admin dengan info:\n• Jenis masalahnya apa\n• Di halaman mana\n• Screenshot jika bisa`,
    quickReplies: ['Hubungi admin', 'Lupa password'],
    card: {
      title: '💬 Laporkan ke Admin',
      body: 'Admin siap bantu 7 hari seminggu.',
      link: CONTACT.wa + '?text=Halo%2C+saya+ada+kendala+teknis+di+LINKify',
      linkText: 'Chat Admin →',
    },
  },

  // ── HUBUNGI ADMIN ─────────────────────────────────────────────
  {
    id: 'contact_admin',
    patterns: [
      'hubungi admin','kontak admin','admin','cs','customer service',
      'support','bantuan','help','minta bantuan','chat admin',
      'whatsapp admin','nomor admin','kontak linkify',
    ],
    answer: `Kamu bisa hubungi Admin LINKify langsung via WhatsApp: 📞\n\n**WhatsApp:** +62 851-9124-5042\n\nJam layanan:\n• **Senin – Sabtu:** 08.00 – 21.00 WIB\n• **Minggu:** 09.00 – 18.00 WIB\n\n*Biasanya dibalas dalam 1–2 jam di jam kerja.*`,
    quickReplies: ['Cara daftar', 'Cara upgrade'],
    card: {
      title: '💬 Chat Admin Sekarang',
      body: 'Respon cepat, siap bantu semua masalah kamu.',
      link: CONTACT.wa + '?text=Halo%2C+saya+butuh+bantuan+LINKify',
      linkText: 'Buka WhatsApp →',
    },
  },

  // ── CARA SHARE TOKO ───────────────────────────────────────────
  {
    id: 'share_store',
    patterns: [
      'cara share','share toko','bagikan toko','promosi toko','sebar link',
      'pasang di ig','pasang di bio','cara promosi','cara sebar',
    ],
    answer: `Cara share link toko kamu: 📤\n\n**Di Instagram:**\n→ Buka profil → Edit profil → Website → paste link toko\n\n**Di TikTok:**\n→ Edit profil → Website → paste link toko\n\n**Di WhatsApp:**\n→ Status WA atau kirim langsung ke pelanggan\n\n**Di Caption:**\n→ Tulis "Kunjungi toko kami: [link]"\n\n**Offline:**\n→ Cetak QR Code dan tempel di toko fisik, nota, atau packaging produk\n\n💡 *Satu link untuk semua — mudah diingat dan profesional!*`,
    quickReplies: ['Copy link toko', 'QR code toko'],
  },

  // ── PREMIUM EXPIRED ───────────────────────────────────────────
  {
    id: 'premium_expired',
    patterns: [
      'premium expired','premium habis','langganan habis','masa aktif habis',
      'perpanjang premium','renew premium','bayar lagi','premium nonaktif',
    ],
    answer: `Premium kamu sudah habis? 🔄\n\nCara perpanjang Premium:\n1️⃣ **Hubungi Admin** via WhatsApp\n2️⃣ Beritahu **username toko** kamu\n3️⃣ Admin kirim nominal & rekening\n4️⃣ **Transfer** sesuai paket\n5️⃣ Kirim bukti bayar\n6️⃣ Admin aktifkan ulang dalam **≤15 menit**\n\n⚠️ *Saat Premium habis, fitur premium dinonaktifkan sementara. Data toko & produk tetap aman.*`,
    quickReplies: ['Hubungi admin', 'Harga premium', 'Cara bayar'],
    card: {
      title: '🔄 Perpanjang Premium',
      body: 'Jangan sampai fitur bisnis kamu terhenti!',
      link: CONTACT.wa + '?text=Halo%2C+saya+mau+perpanjang+Premium+LINKify',
      linkText: 'Chat Admin →',
    },
  },

  // ── PRODUK UNGGULAN ───────────────────────────────────────────
  {
    id: 'featured_product',
    patterns: [
      'produk unggulan','unggulan','featured product','cara unggulan',
      'tampil di atas','prioritaskan produk',
    ],
    answer: `**Produk Unggulan** di LINKify: ⭐\n\nProduk Unggulan akan tampil di bagian **paling atas** katalog toko kamu, sebelum produk biasa.\n\nCara set produk unggulan:\n1️⃣ Saat **tambah atau edit produk**\n2️⃣ Centang kotak **"Produk Unggulan"**\n3️⃣ Simpan produk\n\n✅ Produk langsung pindah ke bagian atas!\n\n💡 *Gunakan untuk produk best seller, promo, atau yang paling ingin kamu tampilkan.*`,
    quickReplies: ['Cara upload produk', 'Cara edit produk'],
  },

  // ── TERIMA KASIH ──────────────────────────────────────────────
  {
    id: 'thanks',
    patterns: [
      'terima kasih','makasih','thanks','thank you','thx','tq','ok thanks',
      'oke makasih','sudah','selesai','mantap','oke','ok','siap',
      'noted','ngerti','paham','mengerti',
    ],
    answer: `Sama-sama! 😊 Senang bisa membantu.\n\nJika ada pertanyaan lain seputar LINKify, jangan ragu untuk tanya lagi ya!\n\nSucces untuk toko kamu! 🚀`,
    quickReplies: ['Cara daftar', 'Hubungi admin', 'Fitur premium'],
  },

];

// ══════════════════════════════════════════════════════════════════
//  NLP ENGINE
// ══════════════════════════════════════════════════════════════════

/**
 * Normalize teks: lowercase, hapus tanda baca berlebih
 */
function normalize(text) {
  return text
    .toLowerCase()
    .replace(/[?!.,;:'"()\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Hitung skor kecocokan antara input dan patterns
 * Return nilai 0–1
 */
function matchScore(input, patterns) {
  const words = input.split(' ').filter(w => w.length > 1);
  let best = 0;

  for (const pattern of patterns) {
    // exact substring match — skor tinggi
    if (input.includes(pattern)) {
      const score = pattern.split(' ').length / Math.max(words.length, 1);
      best = Math.max(best, Math.min(0.95, 0.5 + score * 0.5));
      continue;
    }

    // word-by-word partial match
    const pWords = pattern.split(' ');
    let hits = 0;
    for (const pw of pWords) {
      if (words.some(w => w.includes(pw) || pw.includes(w))) hits++;
    }
    if (hits > 0) {
      const score = hits / Math.max(pWords.length, words.length);
      best = Math.max(best, score * 0.7);
    }
  }

  return best;
}

/**
 * Cari jawaban terbaik untuk input user
 * Return { entry, score } | null
 */
function findBestMatch(rawInput) {
  const input = normalize(rawInput);
  if (!input) return null;

  let best = null;
  let bestScore = 0;
  const THRESHOLD = 0.22;

  for (const entry of KB) {
    const score = matchScore(input, entry.patterns);
    if (score > bestScore) {
      bestScore = score;
      best = entry;
    }
  }

  return bestScore >= THRESHOLD ? { entry: best, score: bestScore } : null;
}

/**
 * Fallback jika tidak ada yang cocok
 */
function fallbackAnswer(input) {
  return {
    answer: `Hmm, aku kurang yakin dengan pertanyaan itu. 🤔\n\nCoba tanya dengan kata kunci seperti:\n• *"cara daftar"*\n• *"harga premium"*\n• *"cara upload produk"*\n• *"cara upgrade"*\n\nAtau langsung **hubungi admin** untuk bantuan lebih lanjut!`,
    quickReplies: ['Cara daftar', 'Harga & paket', 'Hubungi admin'],
    card: {
      title: '💬 Tanya Langsung ke Admin',
      body: 'Admin siap membantu pertanyaan apapun.',
      link: CONTACT.wa + '?text=Halo%2C+saya+punya+pertanyaan+tentang+LINKify',
      linkText: 'Chat Admin →',
    },
  };
}

/**
 * Main: proses input user, return response object
 */
function getBotResponse(userInput) {
  const match = findBestMatch(userInput);
  if (!match) return fallbackAnswer(userInput);

  const { entry } = match;
  return {
    answer:       entry.answer,
    quickReplies: entry.quickReplies || [],
    card:         entry.card || null,
  };
}

/**
 * Initial greeting chips
 */
function getInitialChips() {
  return ['🚀 Cara Mulai?', '💎 Upgrade Premium', '📦 Cara Upload Produk', '💰 Lihat Harga', '💬 Hubungi Admin'];
}

// Export
window.BotEngine = { getBotResponse, getInitialChips, CONTACT };
