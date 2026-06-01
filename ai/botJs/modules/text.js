/**
 * LINKify Chatbot Text/NLP Helpers
 * Non-module global script: no npm/build required.
 */
(function () {
  'use strict';

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[?!.,;:'"()[\]{}<>/\\|`~@#$%^&*_+=]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokens(text) {
    return normalize(text).split(' ').filter(function (w) { return w.length > 1; });
  }

  function levenshtein(a, b) {
    a = String(a || '');
    b = String(b || '');
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    var prev = new Array(b.length + 1);
    var curr = new Array(b.length + 1);

    for (var j = 0; j <= b.length; j += 1) prev[j] = j;

    for (var i = 1; i <= a.length; i += 1) {
      curr[0] = i;
      for (var k = 1; k <= b.length; k += 1) {
        var cost = a[i - 1] === b[k - 1] ? 0 : 1;
        curr[k] = Math.min(
          curr[k - 1] + 1,
          prev[k] + 1,
          prev[k - 1] + cost
        );
      }
      var tmp = prev;
      prev = curr;
      curr = tmp;
    }

    return prev[b.length];
  }

  function fuzzyHit(word, target) {
    if (!word || !target) return false;
    if (word === target || word.indexOf(target) !== -1 || target.indexOf(word) !== -1) return true;

    var maxLen = Math.max(word.length, target.length);
    if (maxLen <= 4) return levenshtein(word, target) <= 1;
    if (maxLen <= 8) return levenshtein(word, target) <= 2;
    return levenshtein(word, target) <= 3;
  }

  function matchScore(input, patterns) {
    var normalizedInput = normalize(input);
    var inputTokens = tokens(normalizedInput);
    var best = 0;

    (patterns || []).forEach(function (rawPattern) {
      var pattern = normalize(rawPattern);
      var patternTokens = tokens(pattern);
      if (!pattern) return;

      // Exact substring match.
      if (normalizedInput.indexOf(pattern) !== -1) {
        var exactScore = patternTokens.length / Math.max(inputTokens.length, 1);
        best = Math.max(best, Math.min(0.98, 0.55 + exactScore * 0.45));
        return;
      }

      // Word overlap + typo tolerance.
      var hits = 0;
      patternTokens.forEach(function (patternWord) {
        if (inputTokens.some(function (inputWord) { return fuzzyHit(inputWord, patternWord); })) {
          hits += 1;
        }
      });

      if (hits > 0) {
        var overlap = hits / Math.max(patternTokens.length, inputTokens.length, 1);
        var coverage = hits / Math.max(patternTokens.length, 1);
        best = Math.max(best, (overlap * 0.45) + (coverage * 0.35));
      }
    });

    return best;
  }

  window.LINKifyBotText = {
    normalize: normalize,
    tokens: tokens,
    levenshtein: levenshtein,
    fuzzyHit: fuzzyHit,
    matchScore: matchScore
  };
})();
