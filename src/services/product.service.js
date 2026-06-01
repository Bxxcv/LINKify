import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../../firebase.js';

const CACHE_TTL = 30_000;
const productCache = new Map();

const productCollectionRef = (uid) => collection(db, 'toko', uid, 'produk');
const productDocRef = (uid, id) => doc(db, 'toko', uid, 'produk', id);

function normalizeProduct(docSnap) {
  return { id: docSnap.id, ...docSnap.data() };
}

function cacheKey(uid) {
  return `products:${uid}`;
}

export function invalidateProductCache(uid) {
  if (uid) productCache.delete(cacheKey(uid));
}

export async function getProducts(uid, options = {}) {
  if (!uid) throw new Error('UID tidak valid');
  const { force = false, pageSize = null, cursor = null } = options;
  const key = cacheKey(uid);
  const cached = productCache.get(key);

  if (!force && !pageSize && cached && Date.now() - cached.time < CACHE_TTL) {
    return cached.data;
  }

  const constraints = [orderBy('createdAt', 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  if (pageSize) constraints.push(limit(pageSize));

  const snap = await getDocs(query(productCollectionRef(uid), ...constraints));
  const data = snap.docs.map(normalizeProduct);

  if (!pageSize) productCache.set(key, { time: Date.now(), data });
  return data;
}

export async function getProduct(uid, id) {
  if (!uid || !id) throw new Error('Produk tidak valid');
  const snap = await getDoc(productDocRef(uid, id));
  return snap.exists() ? normalizeProduct(snap) : null;
}

export async function createProduct(uid, payload) {
  if (!uid) throw new Error('UID tidak valid');
  const result = await addDoc(productCollectionRef(uid), payload);
  invalidateProductCache(uid);
  return result;
}

export async function updateProduct(uid, id, payload) {
  if (!uid || !id) throw new Error('Produk tidak valid');
  const result = await updateDoc(productDocRef(uid, id), payload);
  invalidateProductCache(uid);
  return result;
}

export async function deleteProduct(uid, id) {
  if (!uid || !id) throw new Error('Produk tidak valid');
  const result = await deleteDoc(productDocRef(uid, id));
  invalidateProductCache(uid);
  return result;
}

export const productService = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  invalidateProductCache,
};
