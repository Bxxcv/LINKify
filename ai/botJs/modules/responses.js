/**
 * Response helpers untuk LINKify chatbot.
 */
(function () {
  'use strict';

  function fallbackAnswer(contact) {
    var wa = contact && contact.wa ? contact.wa : 'https://wa.me/6285191245042';

    return {
      answer: 'Hmm, aku kurang yakin dengan pertanyaan itu. 🤔\n\nCoba tanya dengan kata kunci seperti:\n• *"cara daftar"*\n• *"harga premium"*\n• *"cara upload produk"*\n• *"cara upgrade"*\n\nAtau langsung **hubungi admin** untuk bantuan lebih lanjut!',
      quickReplies: ['Cara daftar', 'Harga & paket', 'Hubungi admin'],
      card: {
        title: '💬 Tanya Langsung ke Admin',
        body: 'Admin siap membantu pertanyaan apapun.',
        link: wa + '?text=Halo%2C+saya+punya+pertanyaan+tentang+LINKify',
        linkText: 'Chat Admin →'
      }
    };
  }

  function getInitialChips() {
    return ['🚀 Cara Mulai?', '💎 Upgrade Premium', '📦 Cara Upload Produk', '💰 Lihat Harga', '💬 Hubungi Admin'];
  }

  window.LINKifyBotResponses = {
    fallbackAnswer: fallbackAnswer,
    getInitialChips: getInitialChips
  };
})();
