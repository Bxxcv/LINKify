import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  where,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../../firebase.js';

export function getLastDays(count = 7) {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today);
    day.setDate(today.getDate() - (count - 1 - index));
    return day.toISOString().slice(0, 10);
  });
}

export async function getTodayStats(uid) {
  if (!uid) throw new Error('UID tidak valid');
  const today = new Date().toISOString().slice(0, 10);
  const snap = await getDoc(doc(db, 'toko', uid, 'stats', today));
  return snap.exists() ? { id: snap.id, ...snap.data() } : { id: today, visits: 0, waClicks: 0, shopeeClicks: 0 };
}

export async function getStatsRange(uid, days = getLastDays(7)) {
  if (!uid) throw new Error('UID tidak valid');
  if (!Array.isArray(days) || !days.length) return [];

  const snap = await getDocs(query(
    collection(db, 'toko', uid, 'stats'),
    where('__name__', '>=', days[0]),
    where('__name__', '<=', days[days.length - 1]),
    orderBy('__name__')
  ));

  const indexed = new Map();
  snap.forEach(item => indexed.set(item.id, item.data()));

  return days.map(day => ({
    id: day,
    visits: Number(indexed.get(day)?.visits) || 0,
    waClicks: Number(indexed.get(day)?.waClicks) || 0,
    shopeeClicks: Number(indexed.get(day)?.shopeeClicks) || 0,
  }));
}

export const analyticsService = {
  getLastDays,
  getTodayStats,
  getStatsRange,
};
