import { APP_CONFIG } from './config.js';
import { initializeApp, getApps, getApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// FIX: cegah duplicate Firebase app initialization
const app = getApps().length ? getApp() : initializeApp(APP_CONFIG.firebaseConfig);

export { app };
export const db   = getFirestore(app);
export const auth = getAuth(app);
export const CONFIG = APP_CONFIG;
