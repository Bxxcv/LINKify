import { db } from './firebase.js';
import { collection, getDocs, query, orderBy, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// FUNGSI PENGAMAN XSS
function escapeHtml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m];
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadProducts();
  lucide.createIcons();
  
  document.getElementById('themeBtn').onclick = () => {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
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
  }
}

async function loadProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  const container = document.getElementById('productList');
  
  if (querySnapshot.empty) {
    container.innerHTML = `<p class="col-span-1 sm:col-span-2 text-center text-white/50 text-sm">Belum ada produk</p>`;
    return;
  }
  
  const waUtama = document.getElementById('waBtn').dataset.wa || 'https://wa.me/';
  
  container.innerHTML = '';
  querySnapshot.forEach((docSnap) => {
    const p = docSnap.data();
    const linkWa = p.wa || waUtama;
    const pesanWa = `Halo, saya mau pesan:%0A- Produk: ${escapeHtml(p.nama)}%0A- Harga: Rp ${p.harga.toLocaleString('id-ID')}`;
    const finalLink = `${linkWa}?text=${pesanWa}`;
    
    container.innerHTML += `
      <a href="${finalLink}" target="_blank" rel="noopener noreferrer" class="product-card glass rounded-2xl overflow-hidden">
        <div class="relative">
          <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.nama)}" class="w-full h-48 sm:h-32 object-cover">
          ${p.stok < 5 && p.stok > 0? `<div class="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-lg">Sisa ${p.stok}</div>` : ''}
          ${p.stok == 0? `<div class="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-lg">HABIS</div>` : ''}
          ${p.shopee? `<div class="absolute top-2 right-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-lg">Shopee</div>` : ''}
        </div>
        <div class="p-4">
          <h2 class="font-bold text-sm leading-tight mb-1">${escapeHtml(p.nama)}</h2>
          <p class="text-amber-400 font-bold text-base">Rp${p.harga.toLocaleString('id-ID')}</p>
        </div>
      </a>
    `;
  });
}

window.shareLink = () => {
  if (navigator.share) {
    navigator.share({ title: document.getElementById('username').innerText, url: window.location.href });
  } else {
    navigator.clipboard.writeText(window.location.href);
    alert('Link berhasil disalin!');
  }
};
