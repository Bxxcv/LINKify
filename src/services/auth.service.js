import {
  onAuthStateChanged,
  signOut
} from 'firebase/auth';

export class AuthService {
  constructor(auth) {
    this.auth = auth;
  }

  watch(callback) {
    return onAuthStateChanged(this.auth, callback);
  }

  logout() {
    return signOut(this.auth);
  }

  get currentUser() {
    return this.auth.currentUser;
  }
}