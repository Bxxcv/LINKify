import { doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { db } from '../../firebase.js';

function requireUid(uid) {
  if (!uid) throw new Error('User belum login.');
  return uid;
}

export async function getToko(uid) {
  const snap = await getDoc(doc(db, 'toko', requireUid(uid)));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}


export async function updateTokoFields(uid, fields) {
  return updateDoc(doc(db, 'toko', requireUid(uid)), fields);
}

export async function updatePremiumAccent(uid, color) {
  return updateTokoFields(uid, { 'premium.accentColor': color });
}

export async function updatePremiumBackground(uid, backgroundUrl) {
  return updateTokoFields(uid, { 'premium.templateBg': backgroundUrl || '' });
}

export async function updatePremiumTemplate(uid, templateId) {
  return updateTokoFields(uid, {
    'premium.templateTheme': templateId || '',
    'premium.templateBg': ''
  });
}

export async function resetPremiumTemplate(uid) {
  return updatePremiumTemplate(uid, '');
}

export async function updateCustomButtons(uid, buttons) {
  return updateTokoFields(uid, { customButtons: buttons || [] });
}

export async function updateGallery(uid, gallery) {
  return updateTokoFields(uid, { gallery: gallery || [] });
}
