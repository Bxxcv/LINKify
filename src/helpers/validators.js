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