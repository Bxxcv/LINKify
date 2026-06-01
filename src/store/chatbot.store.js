export const chatbotStore = {
  messages: [],
  loading: false,

  addMessage(message) {
    this.messages.push(message);
  },

  clear() {
    this.messages = [];
  }
};