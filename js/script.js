import { db } from './firebase.js';
import { collection, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // FIX AMNESIA: Cek localstorage dulu sebelum render
  const savedTheme = localStorage.getItem('tokobudi_theme');
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    // Update ikon langsung sebelum lucide jalan
    const themeBtn = document.getElementById('themeBtn');
    if(themeBtn) themeBtn.innerHTML = `<i data-lucide="${savedTheme === 'light' ? 'moon' : 'sun'}" class="lucide"></i>`;
  }

  await loadSettings();
  await loadProducts();
  lucide.createIcons();
  
  document.getElementById('themeBtn').onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('tokobudi_theme', newTheme); // SIMPAN KE MEMORY
    document.getElementById('themeBtn').innerHTML = `<i data-lucide="${isDark? 'moon' : 'sun'}" class="lucide"></i>`;
    lucide.createIcons();
  };
});

async function loadSettings() {
  const docSnap = await getDoc(doc(db, "settings", "toko"));
  if (docSnap.exists()) {
    const s = docSnap.data();
    document.getElementById('username').innerText = s.username || '@tokobudi';
    document.getElementById('bio').innerText = s.bio || '';
    document.getElementById('profileImg').src = s.logo || 'https://picsum.photos/id/64/200/200';
    
    const waUtama = s.wa || 'https://wa.me/';
    document.getElementById('waBtn').href = waUtama;
    document.getElementById('waBtn').dataset.wa = waUtama;
    
    if (s.shopee) {
      const shopeeBtn = document.getElementById('shopeeBtn');
      shopeeBtn.href = s.shopee;
      shopeeBtn.classList.remove('hidden');
    }
    
    document.title = `${s.username || '@tokobudi'} - Link Bio`;
    
    // FIX SEO: Update OG Tags secara dinamis
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogDesc = document.querySelector('meta[property="og:description"]');
    const ogImg = document.querySelector('meta[property="og:image"]');
    if(ogTitle) ogTitle.content = document.title;
    if(ogDesc) ogDesc.content = s.bio || 'Link Bio Toko Online';
    if(ogImg) ogImg.content = s.logo || '';
  }
}

async function loadProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  const container = document.getElementById('productList');
  
  if (querySnapshot.empty) {
    container.innerHTML = `
      <div class="col-span-1 sm:col-span-2 text-center py-16">
        <i data-lucide="package-open" class="lucide w-16 h-16 mx-auto text-white/20 mb-4"></i>
        <p class="text-white/40 text-sm">Belum ada produk untuk ditampilkan</p>
      </div>`;
    lucide.createIcons();
    return;
  }
  
  const waUtama = document.getElementById('waBtn').dataset.wa || 'https://wa.me/';
  
  container.innerHTML = '';
  querySnapshot.forEach((docSnap) => {
    const p = docSnap.data();
    const linkWa = p.wa || waUtama;
    const pesanWa = `Halo, saya mau pesan:%0A- Produk: ${escapeHtml(p.nama)}%0A- Harga: Rp ${p.harga.toLocaleString('id-ID')}`;
    const finalLink = `${linkWa}?text=${pesanWa}`;
    
    // FIX JEBAKAN SHOPEE: Kartu jadi DIV, tombol WA & Shopee dipisah
    let shopeeButton = '';
    if (p.shopee) {
      shopeeButton = `
        <a href="${escapeHtml(p.shopee)}" target="_blank" rel="noopener noreferrer" class="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-orange-500/20 hover:text-orange-400 text-center flex items-center justify-center gap-1.5 transition-colors">
          <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i> Shopee
        </a>`;
    }
    
    container.innerHTML += `
      <div class="product-card glass rounded-2xl overflow-hidden">
        <div class="relative">
          <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.nama)}" class="w-full h-48 sm:h-40 object-cover" onerror="this.src='https://placehold.co/600x400/171717/404040?text=Gambar+Error'">
          ${p.stok < 5 && p.stok > 0? `<div class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">Sisa ${p.stok}</div>` : ''}
          ${p.stok == 0? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">HABIS</div>` : ''}
        </div>
        <div class="p-4">
          <h2 class="font-bold text-sm leading-tight mb-1 line-clamp-2">${escapeHtml(p.nama)}</h2>
          <p class="text-amber-400 font-extrabold text-lg mb-3">Rp${p.harga.toLocaleString('id-ID')}</p>
          
          <div class="flex gap-2 ${p.shopee ? '' : ''}">
            <a href="${finalLink}" target="_blank" rel="noopener noreferrer" class="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#25D366] text-white text-center flex items-center justify-center gap-1.5 hover:bg-[#20BD5A] transition-colors">
              <i data-lucide="message-circle" class="w-3.5 h-3.5"></i> Pesan WA
            </a>
            ${shopeeButton}
          </div>
        </div>
      </div>
    `;
  });
  lucide.createIcons(); // render ikon baru yang di inject
}

window.shareLink = () => {
  if (navigator.share) {
    navigator.share({ title: document.getElementById('username').innerText, url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('Link berhasil disalin!');
  }
};
