export const authStore = {
  user: null,
  initialized: false,

  setUser(user) {
    this.user = user;
  },

  setInitialized(value) {
    this.initialized = value;
  }
};