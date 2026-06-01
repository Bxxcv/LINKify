export const validators = {
  email(value = '') {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },

  username(value = '') {
    return /^[a-zA-Z0-9_]{3,20}$/.test(value);
  },

  url(value = '') {
    try {
      const parsed = new URL(value);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  }
};

export function validateProductPayload(data) {
  if (!data || typeof data !== 'object') throw new Error('Data produk tidak valid');
  if (!data.nama || typeof data.nama !== 'string' || data.nama.trim().length === 0)
    throw new Error('Nama produk tidak boleh kosong');
  if (data.nama.length > 100) throw new Error('Nama produk maksimal 100 karakter');
  if (Number.isNaN(Number(data.harga)) || Number(data.harga) < 0) throw new Error('Harga harus berupa angka positif');
  if (Number(data.harga) > 100000000) throw new Error('Harga terlalu tinggi');
  if (Number.isNaN(Number(data.stok)) || Number(data.stok) < 0) throw new Error('Stok harus berupa angka positif');
  if (data.deskripsi && data.deskripsi.length > 500) throw new Error('Deskripsi maksimal 500 karakter');
  if (data.shopee && !/^https?:\/\/.+/.test(data.shopee)) throw new Error('Link Shopee harus valid (https)');
  if (data.wa && !/^https?:\/\/.+/.test(data.wa)) throw new Error('Link WhatsApp harus valid');
  if (!data.img || typeof data.img !== 'string') throw new Error('Foto produk wajib diupload');
  if (!/^https?:\/\//i.test(data.img)) throw new Error('URL foto tidak valid');
  return true;
}
