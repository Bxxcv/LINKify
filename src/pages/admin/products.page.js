import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../../services/product.service.js';
import {
  renderAdminProductGrid,
  renderProductSkeleton,
  renderProductEmpty,
  renderProductError,
} from '../../components/admin-product-card.js';
import { validateProductPayload } from '../../helpers/validators.js';

export function createProductsPage({ container, formatPrice, safeImgUrl }) {
  if (!container) throw new Error('Product container tidak ditemukan');

  let cache = [];

  function render(list = cache) {
    if (!list.length) {
      renderProductEmpty(container);
      return;
    }

    renderAdminProductGrid(container, list, {
      formatPrice,
      safeImgUrl,
    });
  }

  async function load(uid) {
    renderProductSkeleton(container, 3);
    try {
      cache = await getProducts(uid);
      render(cache);
      return cache;
    } catch (error) {
      renderProductError(container, 'Gagal memuat produk. Coba refresh halaman.');
      throw error;
    }
  }

  function filter({ text = '', category = '', stock = '' } = {}) {
    const keyword = text.toLowerCase().trim();
    const filtered = cache.filter((product) => {
      const matchText =
        !keyword ||
        (product.nama || '').toLowerCase().includes(keyword) ||
        (product.deskripsi || '').toLowerCase().includes(keyword);

      const matchCategory = !category || product.kategori === category;
      const matchStock = !stock || (stock === 'habis' ? Number(product.stok) === 0 : Number(product.stok) > 0);

      return matchText && matchCategory && matchStock;
    });

    render(filtered);
    return filtered;
  }

  return {
    load,
    render,
    filter,
    get cache() {
      return cache;
    },
  };
}

export {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  renderAdminProductGrid,
  renderProductSkeleton,
  renderProductEmpty,
  renderProductError,
  validateProductPayload,
};
