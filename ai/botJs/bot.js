/**
 * LINKify Chatbot Engine
 * Phase 8: engine dipisah dari knowledge base + helper NLP.
 * Tetap Vanilla JS biasa, tidak butuh npm/build.
 */
(function () {
  'use strict';

  var knowledge = window.LINKifyBotKnowledge || {};
  var text = window.LINKifyBotText || {};
  var memory = window.LINKifyBotMemory || {};
  var responses = window.LINKifyBotResponses || {};

  var CONTACT = knowledge.CONTACT || {
    wa: 'https://wa.me/6285191245042',
    wa_text: '6285191245042',
    landing: 'https://linkify.vercel.app/landing'
  };

  var KB = Array.isArray(knowledge.KB) ? knowledge.KB : [];
  var THRESHOLD = 0.22;

  function normalize(input) {
    return text.normalize ? text.normalize(input) : String(input || '').toLowerCase().trim();
  }

  function score(input, patterns) {
    return text.matchScore ? text.matchScore(input, patterns) : 0;
  }

  function findBestMatch(rawInput) {
    var input = normalize(rawInput);
    if (!input) return null;

    var best = null;
    var bestScore = 0;

    KB.forEach(function (entry) {
      var currentScore = score(input, entry.patterns || []);
      if (currentScore > bestScore) {
        bestScore = currentScore;
        best = entry;
      }
    });

    if (!best || bestScore < THRESHOLD) return null;
    return { entry: best, score: bestScore };
  }

  function fallbackAnswer(userInput) {
    if (responses.fallbackAnswer) return responses.fallbackAnswer(CONTACT, userInput);
    return {
      answer: 'Maaf, aku belum paham pertanyaan itu. Coba tanya: cara daftar, harga premium, cara upload produk, atau hubungi admin.',
      quickReplies: ['Cara daftar', 'Harga & paket', 'Hubungi admin']
    };
  }

  function getBotResponse(userInput) {
    var match = findBestMatch(userInput);

    if (!match) {
      if (memory.remember) memory.remember('fallback', 0);
      return fallbackAnswer(userInput);
    }

    var entry = match.entry;
    if (memory.remember) memory.remember(entry.id, match.score);

    return {
      answer: entry.answer,
      quickReplies: entry.quickReplies || [],
      card: entry.card || null,
      meta: {
        intent: entry.id,
        score: match.score
      }
    };
  }

  function getInitialChips() {
    if (responses.getInitialChips) return responses.getInitialChips();
    return ['Cara daftar', 'Harga & paket', 'Cara upload produk', 'Hubungi admin'];
  }

  window.BotEngine = {
    getBotResponse: getBotResponse,
    getInitialChips: getInitialChips,
    findBestMatch: findBestMatch,
    CONTACT: CONTACT
  };
})();
