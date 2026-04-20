import { db, CONFIG } from './firebase.js';
import { collection, getDocs, query, orderBy, doc, getDoc } from "https://www.w3.org/2000/svg";

function escapeHtml(unsafe) { if (!unsafe) return ''; return String(unsafe).replace(/[&<>"']/g, function(m) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]; }); }

document.addEventListener('DOMContentLoaded', async () => { 
  applyTheme(); 
  setupScrollAnimations(); // NYALAKAN ANIMASI
  await loadSettings(); 
  await loadProducts(); 
});

// LOGIKA ANIMASI SCROLL (MIRIP WEBSITE PREMIUM)
function setupScrollAnimations() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('show');
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));
}

function applyTheme() {
  document.documentElement.style.setProperty('--text', CONFIG.theme.textColor);
  document.documentElement.style.setProperty('--card', CONFIG.theme.bgCard);
}

async function loadSettings() {
  const docSnap = await getDoc(doc(db, "settings", "toko"));
  if (docSnap.exists()) {
    const s = docSnap.data();
    document.getElementById('username').innerText = s.username || 'My Store';
    document.getElementById('bio').innerText = s.bio || '';
    if (s.logo) document.getElementById('profileImg').src = s.logo;
    
    const waUtama = s.wa || 'https://wa.me/';
    document.getElementById('waBtn').href = waUtama;
    document.getElementById('waBtn').dataset.wa = waUtama;
    
    if (s.wa) document.getElementById('link-wa-main').href = s.wa;
    if (CONFIG.links.shopee) {
      document.getElementById('link-shopee').href = CONFIG.links.shopee;
      document.getElementById('link-shopee').classList.remove('hidden');
    }
    if (CONFIG.links.tokopedia) document.getElementById('link-tokped').href = CONFIG.links.tokopedia;
    if(CONFIG.links.instagram) document.getElementById('soc-ig').href = CONFIG.links.instagram;
    if(CONFIG.links.facebook) document.getElementById('soc-fb').href = CONFIG.links.facebook;
    if(CONFIG.links.tiktok) document.getElementById('soc-tt').href = CONFIG.links.tiktok;
    
    document.title = `${s.username || 'My Store'} - Link Bio`;
  }
}

async function loadProducts() {
  const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
  const querySnapshot = await getDocs(q);
  const container = document.getElementById('productList');
  if (querySnapshot.empty) { container.innerHTML = `<div class="text-center py-16 text-gray-300 text-sm fade-up show">Belum ada produk</div>`; return; }
  const waUtama = document.getElementById('waBtn').dataset.wa || 'https://wa.me/';
  container.innerHTML = '';
  querySnapshot.forEach((docSnap) => {
    const p = docSnap.data();
    const linkWa = p.wa || waUtama;
    const pesanWa = `Halo, saya mau pesan:%0A- Produk: ${escapeHtml(p.nama)}%0A- Harga: Rp ${p.harga.toLocaleString('id-ID')}`;
    let shopeeButton = '';
    if (p.shopee) { 
      shopeeButton = `<a href="${escapeHtml(p.shopee)}" target="_blank" rel="noopener noreferrer" class="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-gray-100 text-gray-600 text-center flex items-center justify-center gap-1.5 hover:bg-gray-200 transition-colors"><div class="w-4 h-4 bg-[#EE4D2D] rounded flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg></div> Shopee</a>`; 
    }
    container.innerHTML += `
      <div class="product-card earth-card overflow-hidden fade-up">
        <div class="relative">
          <img src="${escapeHtml(p.img)}" alt="${escapeHtml(p.nama)}" class="w-full h-52 object-cover" onerror="this.src='https://placehold.co/600x400/F4F4F4/AAAAAA?text=Gambar+Error'">
          ${p.stok == 0? `<div class="absolute inset-0 bg-white/70 flex items-center justify-center text-gray-800 font-bold text-sm tracking-wide">HABIS</div>` : ''}
        </div>
        <div class="p-4">
          <h2 class="font-semibold text-sm leading-tight mb-1 text-gray-800">${escapeHtml(p.nama)}</h2>
          <p class="text-gray-900 font-bold text-lg mb-3">Rp${p.harga.toLocaleString('id-ID')}</p>
          <div class="flex gap-2">
            <a href="${linkWa}?text=${pesanWa}" target="_blank" rel="noopener noreferrer" class="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-[#25D366] text-white text-center flex items-center justify-center gap-1.5 hover:bg-[#20BD5A] transition-colors active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Pesan
            </a>
            ${shopeeButton}
          </div>
        </div>
      </div>`;
  });
  
  // AKTIFKAN ANIMASI UNTUK PRODUK YANG BARU DI-RENDER
  setTimeout(() => {
    document.querySelectorAll('.product-card.fade-up').forEach(el => el.classList.add('show'));
  }, 100);
}

window.shareLink = () => { if (navigator.share) { navigator.share({ title: document.getElementById('username').innerText, url: window.location.href }); } else { navigator.clipboard.writeText(window.location.href); alert('Link berhasil disalin!'); } };
